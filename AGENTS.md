# Agent Instructions & Project Rules

This document outlines project-specific rules, architectural patterns, design constraints, and historic system changes for the **AI Coding Agent** when working on this repository.

---

## 1. Core Architecture & Game Loop

The application is a full 3D browser game using **React** and **Babylon.js** with full-screen container canvas sizing.
* **Game Initialization**: The `Game` class (`/src/Game.ts`) initializes the Babylon.js engine, handles the resize events, manages lifecycle components (`World`, `Lighting`, `Car`, `PoliceManager`, `ChunkGenerator`, `EffectManager`), updates subsystems inside `onBeforeRenderObservable`, and updates the React frontend state via reactive state callbacks (`setScore`, `setGameOver`).
* **Safe Delta Time**: Always clamp the delta time (`dt`) inside the render loop update (e.g. `Math.min(dt, 0.1)`) to prevent game state explosions or collision clipping during framerate spikes or browser tab switches.

---

## 2. Babylon.js 3D Models & Transformations

* **Player Car & Police Car Models**: 
  * The GLB model meshes (`car_1.glb` and `car_2.glb`) require specific initial rotations and positioning to lay flat on the floor and face the correct direction:
    * Apply local rotation: `rootMesh.rotate(new Vector3(1, 0, 0), -Math.PI / 2, Space.LOCAL)` to align the model vertically on the physics collider height.
    * Apply world rotation: `rootMesh.rotate(new Vector3(0, 1, 0), -Math.PI / 2, Space.WORLD)` to rotate the car 90 degrees left so it aligns with forward/backward velocity vectors.
  * Always set child meshes' `checkCollisions = false` to prevent child components from interfering with parent physics collider meshes.

---

## 3. Texturing Guidelines

* **Textures Location**: Custom textures are kept in `/src/assets/Textures/`.
* **Applying Textures to Loaded Meshes**:
  * Car texture: `/src/assets/Textures/Car Texture 1.png`
  * Police car texture: `/src/assets/Textures/Car Texture 2.png`
  * Map textures safely by checking if the mesh's material exists, then assigning:
    * `albedoTexture` if the material is a PBR material (`albedoTexture` in material)
    * `diffuseTexture` if the material is a Standard material (`diffuseTexture` in material)

---

## 4. Dynamic Object Positioning

* **Police Siren Alignment**:
  * The police car siren needs to be positioned exactly on top of the car's roof.
  * To calculate this dynamic height after the GLB model finishes loading, compute world matrices and iterate over loaded meshes to find the maximum Y coordinate:
    ```typescript
    this.mesh.computeWorldMatrix(true);
    result.meshes.forEach(m => m.computeWorldMatrix(true));
    let maxWorldY = -9999;
    result.meshes.forEach(m => {
      const boundingInfo = m.getBoundingInfo();
      const topY = boundingInfo.boundingBox.maximumWorld.y;
      if (topY > maxWorldY) {
        maxWorldY = topY;
      }
    });
    if (maxWorldY > -9999 && this.sirenMesh) {
      const localY = maxWorldY - this.mesh.position.y;
      this.sirenMesh.position.y = localY + 0.1; // Offset slightly above the roof
    }
    ```

---

## 5. Infinite Terrain & Procedural Chunk Generation

* **Dynamic Chunks (`/src/world/ChunkGenerator.ts`)**:
  * Generates 50x50 size tiles dynamically centered around the player's position based on a defined render distance.
  * Destroys out-of-range chunks to maintain performance.
  * Places obstacles with pseudo-random seeding:
    * **Buildings**: Extruded rectangular box colliders.
    * **Trees**: Created as multi-part destructible meshes containing a cylinder trunk and leafy top spheres.
  * **Initial Safe Zone**: Keep the center chunk (coordinate `0,0`) free of dense obstacles to ensure the player doesn't spawn stuck inside a collider.

---

## 6. Police Spawning & Chase AI

* **Chase Logic (`/src/ai/PoliceCar.ts`)**:
  * Police cars chase the player using custom raycast steering and line-of-sight pathing.
  * The siren flashes colors (Red and Blue) dynamically inside its tick loop.
* **Manager Lifecycle (`/src/ai/PoliceManager.ts`)**:
  * Spawns police units off-screen (typically at a set radius like 100 units from the player).
  * Escalates maximum police limits and spawn intervals based on game run duration.
  * Instantly triggers `game.gameOver()` if any police vehicle gets within close contact (e.g. distance `< 2.5`).
  * Despawns lost police units that fall far behind (e.g. distance `> 200`) to recycle resources.

---

## 7. Visual & Audio Effects Engine

* **Explosions & Sparks (`/src/effects/EffectManager.ts`)**:
  * Features short-lived custom `ParticleSystem` emitters for explosions, collision sparks, drifting tire smoke, and obstacle destruction.
  * Generates random physical debris pieces during big crashes for high visual feedback.
  * Plays corresponding localized sounds for crashes and explosions.
* **Tire Drift Trails (`/src/player/Car.ts`)**:
  * Left and right wheel dummy transform meshes generate continuous `TrailMesh`es with alpha-translucent materials to leave skid marks on the road when the car drifts.

---

## 8. General Development Constraints

* **Reverse Proxy Port**: The development server must run on port **3000** and bind to **0.0.0.0**.
* **Type Safety & Imports**: Always use named imports at the top of the file. Maintain absolute type safety with TypeScript, and do not use un-typed objects unless cast to `any` safely where properties are tested first (e.g. `"albedoTexture" in matAny`).
