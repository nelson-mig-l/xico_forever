Here is a targeted breakdown of technical optimizations to significantly increase frame rate (FPS) and reduce CPU/GPU overhead in this 3D Babylon.js architecture:

## 1. Mesh Instancing & Thin Instances (Draw Call Reduction)
 * **Thin Instances for Props**: *[Pending]* Repeated environmental props (trees, lamp posts, fences, and street line dashes) currently create individual scene nodes. Replacing clones with Babylon's ThinInstance API allows rendering hundreds of identical trees or lamp posts in a single draw call with negligible GPU overhead.
 * **Static Chunk Merging**: *[✅ IMPLEMENTED]* Merges static geometry within each chunk (asphalt ground, sidewalks, white/yellow lane markings) into single merged meshes per material group using `Mesh.MergeMeshes()` in `ChunkGenerator.ts`.

## 2. Shadow Map & Lighting Optimization
 * **Shadow Blur Reduction**: *[Pending]* The ShadowGenerator currently uses Exponential Shadow Maps with a `blurKernel` size of 32, which executes multiple Gaussian blur passes on every frame. Reducing the kernel size (e.g. 16 or 8) or switching to usePoissonSampling significantly lowers GPU fragment shader execution time.
 * **Shadow Map Resolution & Culling**: *[Pending]* Tighten the directional light orthographic frustum around the player's immediate view, and exclude small prop meshes (such as road lines or low fences) from casting shadows via `shadowGenerator.getShadowMap().renderList`.

## 3. Spatial Partitioning for Collision Checks
 * **Direct Collider Tracking**: *[Pending]* Simplify collision checks and avoid full-scene traversals during physics ticks.
 * **Spatial Grid / Quadtree**: *[Pending]* Storing active building colliders in a spatial grid or a filtered array (only for chunks within range) eliminates full-scene traversals during physics ticks.

## 4. Object Pooling (Garbage Collection Reduction)
 * **Police Unit Reuse**: *[Pending]* Instantiate a fixed pool of police car meshes at game start and toggle visibility/positions on spawn/despawn rather than dynamically importing and constructing GLB model hierarchies during live gameplay.
 * **Particle & Effect Pooling**: *[Pending]* Recycle particle systems, spark emitters, and debris box meshes in EffectManager to prevent micro-stutters caused by JavaScript Garbage Collection (GC) pauses.

## 5. World Matrix Freezing & Culling Strategies
 * **Freeze Static World Matrices**: *[Pending]* Once a terrain chunk and its static buildings/roads are placed, call `mesh.freezeWorldMatrix()`. This signals to Babylon.js to skip matrix recalculations for those static objects in the render loop.
 * **Bounding Sphere Culling**: *[Pending]* Set `cullingStrategy = AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY` on buildings and chunk ground tiles to speed up frustum visibility checks.

## 6. AI Throttling & Raycast Frequency
 * **Throttled AI Rays**: *[Pending]* Police AI raycasting for obstacle avoidance can be updated every 2–3 frames (or staggered across units) rather than on every frame for every active unit, saving valuable CPU time on physics ray intersections.
