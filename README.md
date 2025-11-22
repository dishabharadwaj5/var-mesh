
# Dynamic Cloth Cutting Simulation 

This project implements a **real-time cloth cutting simulation** using
**Three.js** for rendering and **Cannon.js** for physics.
The cloth can be stretched, interacted with, and dynamically torn by the user.

---

# 🎨 **Features**

### ✅ **Real-time 3D Cloth Simulation**

– Cloth is made from a triangular mesh
– Simulated using a particle-spring constraint system (mass-spring model)

### ✂️ **Dynamic Cutting System**

– User clicks + drags across the cloth to create a cut
– The system detects which cloth edges intersect the drawn line
– Corresponding springs (constraints) are removed
– Mesh is split using **vertex duplication + triangle reassignment**
– Produces realistic tearing

### 💡 **Physics-Based Motion**

– Gravity
– Damping
– Particle-level air drag
– Realistic cloth sagging and stretching

### 👥 **Two Pullers Stretch the Cloth**

– Simulated “two people holding cloth”
– Red spheres pull cloth edges apart slowly
– Makes cutting more natural and visually clear

### 🔧 **Stable + Clean Mesh Rendering**

– Uses flat shading (no black patches)
– Normals automatically normalized after every cut
– Prevents shading artifacts and triangle inversion

---

# 🛠️ **Technologies Used**

| Library        | Purpose                                                  |
| -------------- | -------------------------------------------------------- |
| **Three.js**   | Rendering the cloth and scene                            |
| **Cannon.js**  | Simulating cloth physics through particles + constraints |
| **JavaScript** | Logic, intersection testing, mesh modification           |
| **Raycaster**  | Detecting user input on cloth surface                    |

---

# 🔍 **How the Cloth Works**

The cloth is a **(RES+1 × RES+1)** grid of particles.
Each pair of adjacent particles is connected with **distance constraints**, forming triangles.

### Cloth Representation

* Each particle → a physics body
* Springs between particles → cloth rigidity
* Two triangles per grid cell → visual mesh
* Vertices update every frame from physics positions

---

# ✂️ **How Cutting Works (Algorithm)**

The cutting system performs these steps:

### **1. User draws a line on the cloth**

* On mousedown → record first point
* On mousemove → track second point
* On mouseup → perform cut

### **2. Line–Edge Intersection Detection**

For each cloth edge:

```
If user_line intersects cloth_edge → Mark edge for breaking
```

### **3. Remove Corresponding Cloth Constraints**

Break the “spring” so the cloth can separate physically:

```
world.removeConstraint(edgeConstraint)
```

### **4. Update Mesh Topology (Vertex Splitting)**

To visually open the tear:

* Duplicate one vertex of the broken edge
* Reassign triangles on one side of the cut to the new vertex
* This creates a true visual separation in the mesh

This method is known as:

> **constraint-based mesh cutting with vertex duplication**

---

# ▶️ **How to Run**

### 1. Clone the repository

```bash
git clone https://github.com/dishabharadwaj5/cloth-cutting.git
```

### 2. Install a simple HTTP server

(Three.js cannot run from local filesystem)

For example:

```bash
npm install -g http-server
```

### 3. Run the server

```bash
http-server .
```

### 4. Open in browser

```
http://localhost:8080
```

---

# 🖱️ **Controls**

### 🎮 Camera

* **Left mouse drag** → rotate
* **Scroll** → zoom
* **Right mouse drag** → pan

### ✂️ Cutting

* **Click + drag across cloth** to slice
* The cloth will tear dynamically

---

# 📁 **Project Structure**

```
/index.html        Main page
/main.js           Cloth simulation + cutting logic
/server.js         Simple local server 
```


---

# **Team**
```
Disha Bharadwaj
Harshini Dharaniraj
Dhriti Jamadagni
```

