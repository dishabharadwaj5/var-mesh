document.addEventListener('DOMContentLoaded', () => {

    // ===========================
    // BASIC SETTINGS (CALMER CLOTH)
    // ===========================
    const CLOTH_SIZE = 30;
    const RES = 40;

    const GRAVITY = -4.5;     // MUCH lighter gravity → less dramatic flapping
    const DAMPING = 0.55;     // higher damping → motion settles quickly
    const PULL_SPEED = 0.0015;// gentler pulling → more natural

    // ===========================
    // SCENE
    // ===========================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111122);

    const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000);
    camera.position.set(0, 20, 60);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    document.body.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0x888888));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(20, 30, 20);
    scene.add(dir);

    // ===========================
    // PHYSICS
    // ===========================
    const world = new CANNON.World();
    world.gravity.set(0, GRAVITY, 0);

    // solver tweaks → smoother, less jitter
    world.solver.iterations = 12;   
    world.solver.tolerance = 0.01;


    // ===========================
    // CLOTH CREATION
    // ===========================
    let cloth = createCloth();

    function createCloth() {

        const n = RES + 1;
        const particles = [];
        const constraints = [];

        // Geometry
        const geometry = new THREE.BufferGeometry();
        const verts = new Float32Array(n * n * 3);
        const idx = [];

        let p = 0;
        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                verts[p++] = (x / RES - 0.5) * CLOTH_SIZE;
                verts[p++] = 20;
                verts[p++] = (y / RES - 0.5) * CLOTH_SIZE;
            }
        }

        for (let y = 0; y < RES; y++) {
            for (let x = 0; x < RES; x++) {
                const a = y * n + x;
                const b = a + 1;
                const c = a + n;
                const d = c + 1;
                idx.push(a, b, d, a, d, c);
            }
        }

        geometry.setAttribute("position", new THREE.BufferAttribute(verts, 3));
        geometry.setIndex(idx);
        geometry.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
            color: 0x244c94,
            roughness: 0.9,
            metalness: 0.05,
            transparent: true,
            opacity: 0.98,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, mat);
        scene.add(mesh);

        // Physics particles
        const dist = CLOTH_SIZE / RES;

        for (let y = 0; y < n; y++) {
            particles[y] = [];
            for (let x = 0; x < n; x++) {

                const i = y * n + x;

                const body = new CANNON.Body({
                    mass: (y === 0 && x % 5 === 0) ? 0 : 0.3,
                    position: new CANNON.Vec3(
                        verts[i * 3],
                        verts[i * 3 + 1],
                        verts[i * 3 + 2]
                    ),
                    shape: new CANNON.Particle(),
                    linearDamping: DAMPING  // big change (cloth stops fast)
                });

                particles[y][x] = body;
                world.addBody(body);
            }
        }

        // Structural links (springs)
        function link(a, b, dist) {
            const c = new CANNON.DistanceConstraint(a, b, dist);
            constraints.push({ constraint: c, a, b });
            world.addConstraint(c);
        }

        for (let y = 0; y < RES; y++) {
            for (let x = 0; x < RES; x++) {
                link(particles[y][x],     particles[y][x + 1], dist);  // horizontal
                link(particles[y][x],     particles[y + 1][x], dist);  // vertical
            }
        }

        return { mesh, geometry, particles, constraints };
    }


    // ===========================
    // PULLERS
    // ===========================
    addPullers();

    function addPullers() {

        const left = new CANNON.Body({ mass: 0, shape: new CANNON.Sphere(1) });
        const right = new CANNON.Body({ mass: 0, shape: new CANNON.Sphere(1) });

        left.position.set(-CLOTH_SIZE / 2 - 4, 20, 0);
        right.position.set(CLOTH_SIZE / 2 + 4, 20, 0);

        world.addBody(left);
        world.addBody(right);

        const ballGeo = new THREE.SphereGeometry(1, 32, 32);
        const ballMat = new THREE.MeshStandardMaterial({ color: 0xff3333 });

        const leftMesh = new THREE.Mesh(ballGeo, ballMat);
        const rightMesh = new THREE.Mesh(ballGeo, ballMat);

        scene.add(leftMesh);
        scene.add(rightMesh);

        const p = cloth.particles;

        for (let y = 0; y < RES + 1; y++) {
            world.addConstraint(new CANNON.DistanceConstraint(p[y][0], left, 0));
            world.addConstraint(new CANNON.DistanceConstraint(p[y][RES], right, 0));
        }

        function pull() {
            left.position.x -= PULL_SPEED;
            right.position.x += PULL_SPEED;

            leftMesh.position.copy(left.position);
            rightMesh.position.copy(right.position);

            requestAnimationFrame(pull);
        }
        pull();
    }


    // ===========================
    // CUTTING SYSTEM (same logic)
    // ===========================
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let cutting = false;
    let start = new THREE.Vector3();
    let end = new THREE.Vector3();

    renderer.domElement.addEventListener("mousedown", (e) => {
        updateMouse(e);
        raycaster.setFromCamera(mouse, camera);
        const hit = raycaster.intersectObject(cloth.mesh);
        if (hit.length) {
            cutting = true;
            start.copy(hit[0].point);
        }
    });

    renderer.domElement.addEventListener("mousemove", (e) => {
        if (!cutting) return;
        updateMouse(e);
        raycaster.setFromCamera(mouse, camera);
        const hit = raycaster.intersectObject(cloth.mesh);
        if (hit.length) {
            end.copy(hit[0].point);
        }
    });

    renderer.domElement.addEventListener("mouseup", () => {
        if (cutting) performCut(start, end);
        cutting = false;
    });

    function updateMouse(e) {
        mouse.x = (e.clientX / innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / innerHeight) * 2 + 1;
    }

    // INTERSECTION + SPLIT (same as your logic)
    function performCut(a, b) {

        const broken = [];

        function intersects(p1, p2, p3, p4) {
            const d =
                (p4.z - p3.z) * (p2.x - p1.x) -
                (p4.x - p3.x) * (p2.z - p1.z);

            if (Math.abs(d) < 1e-6) return false;

            const ua =
                ((p4.x - p3.x) * (p1.z - p3.z) -
                (p4.z - p3.z) * (p1.x - p3.x)) / d;

            const ub =
                ((p2.x - p1.x) * (p1.z - p3.z) -
                (p2.z - p1.z) * (p1.x - p3.x)) / d;

            return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
        }

        for (let c of cloth.constraints) {
            if (intersects(a, b, c.a.position, c.b.position)) {
                broken.push(c);
            }
        }

        for (let c of broken) {
            world.removeConstraint(c.constraint);
            cloth.constraints.splice(cloth.constraints.indexOf(c), 1);
            splitGeometry(c.a, c.b);
        }
    }

    function splitGeometry(bodyA, bodyB) {

        const geom = cloth.geometry;
        const pos = geom.attributes.position.array;

        const iA = findVertex(bodyA);
        const iB = findVertex(bodyB);

        if (iA === -1 || iB === -1) return;

        const newI = geom.attributes.position.count;

        const newPos = new Float32Array((newI + 1) * 3);
        newPos.set(pos);

        newPos[newI * 3] = bodyB.position.x;
        newPos[newI * 3 + 1] = bodyB.position.y;
        newPos[newI * 3 + 2] = bodyB.position.z;

        geom.setAttribute("position", new THREE.BufferAttribute(newPos, 3));

        const index = geom.index.array;

        for (let t = 0; t < index.length; t += 3) {

            const tri = [index[t], index[t + 1], index[t + 2]];

            const hasA = tri.includes(iA);
            const hasB = tri.includes(iB);

            if (hasA && hasB) {
                for (let k = 0; k < 3; k++) {
                    if (index[t + k] === iB) index[t + k] = newI;
                }
            }
        }

        geom.index.needsUpdate = true;
        geom.computeVertexNormals();
    }

    function findVertex(body) {
        const pos = cloth.geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
            if (
                Math.abs(pos[i] - body.position.x) < 0.001 &&
                Math.abs(pos[i + 1] - body.position.y) < 0.001 &&
                Math.abs(pos[i + 2] - body.position.z) < 0.001
            ) return i / 3;
        }
        return -1;
    }


    // ===========================
    // UPDATE + RENDER
    // ===========================
    function updateCloth() {
        const pos = cloth.geometry.attributes.position.array;

        let i = 0;
        for (let y = 0; y < RES + 1; y++) {
            for (let x = 0; x < RES + 1; x++) {

                const p = cloth.particles[y][x].position;

                pos[i++] = p.x;
                pos[i++] = p.y;
                pos[i++] = p.z;
            }
        }

        cloth.geometry.attributes.position.needsUpdate = true;
        cloth.geometry.computeVertexNormals();
    }

    function animate() {
        requestAnimationFrame(animate);
        world.step(1 / 60);
        updateCloth();
        controls.update();
        renderer.render(scene, camera);
    }

    animate();

});
