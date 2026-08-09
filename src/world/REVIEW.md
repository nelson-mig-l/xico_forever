Correctness / robustness

1. Duplicate mesh name reused for parent+child (ChunkGenerator.ts:658,663) — treeRoot and trunk are both named
   "destructible_tree_" + i. It happens to still work because the collision check only inspects .includes (
   "destructible"), but it's fragile and confusing (e.g. in the Inspector, or if anyone later does a name-based lookup,
   they'll get the wrong node).
2. Hardcoded spawn-center magic number (ChunkGenerator.ts:599: Math.max (Math.abs (px - 25), Math.abs (pz - 25))) — 25
   is chunkSize / 2, but it's a bare literal. If chunkSize (line 19) ever changes, the spawn-clear-radius logic silently
   breaks with no compile error. Should derive it: this.chunkSize / 2.
3. Seed collisions across chunks (ChunkGenerator.ts:562: let seed = cx * 1000 + cz;) — this isn't injective; e.g. (cx=1,
   cz=-1000) and (cx=0, cz=0) produce the same seed, and collisions get more likely the farther the player roams.
   Distant chunks can end up with identical prop layouts. A proper coordinate hash (e.g. a bit-interleave or a small
   integer hash of cx,cz) would avoid this.
4. Math.sin (seed++) PRNG has known artifacts — sequential-integer-seeded sine PRNGs are notorious for visible
   periodicity/banding, especially since seed increments by 1 each call here. Fine for now, but worth a mention since it
   drives all procedural placement — a cheap xorshift/mulberry32 would look more random for free.
5. No teardown path — ChunkGenerator has no dispose (). If the game ever restarts/rebuilds the scene while
   preloadBuildings ()'s promises or the setTimeout are still pending, the callback fires against a stale/disposed
   scene. Minor today, but a leak/crash risk if this class's lifetime ever becomes shorter than the app's.

Performance / scalability

6. Empty containers built as Mesh instead of TransformNode — chunkNode, treeRoot, postRoot/postL/postR/postB/postT hold
   no geometry, only children. new Mesh (name, scene) carries mesh overhead (geometry/vertex buffer bookkeeping) they
   don't need; new TransformNode (name, scene) is the lighter, more semantically correct choice and collision logic
   (.parent.name) still works identically.
7. Trees/lamp posts/fences rebuild geometry from scratch every time, unlike buildings which use preloaded templates +
   instantiateHierarchy (cheap instances). Every tree trunk/leaves and every lamp post pole/head/bulb calls
   MeshBuilder.Create* fresh, duplicating vertex buffers across dozens of chunks. Worth templating these the same way
   buildings are (build once, clone/instance per placement).
8. Draw-call bloat per chunk: sidewalks, road surfaces, ~6–10 line/dash segments, and up to 4 lamp posts (3 meshes each)
   are all separate un-merged meshes, while only buildings get Mesh.MergeMeshes. With renderDistance = 2 (25 active
   chunks) that's several hundred small static meshes on screen at once. The non-collidable, non-destructible ones
   (road, sidewalks, lines) are good merge candidates per chunk, same pattern already used for buildings.

Maintainability

9. createProceduralBuilding is a 14-branch if/else-if on string name (:82-215) — works, but a Record<string, () => void>
   lookup keyed by template name would be more readable/extensible and avoid the linear string-compare chain.
10. Loose typing: buildingClone as any and (child: any) (lines 613, 631) throw away type safety for no real reason —
    template.instantiateHierarchy (chunkNode) returns collision logic (.parent.name) still works identically. same way
    buildings are (build once, clone/instance per placement). non-destructible ones (road, sidewalks, lines) are good
    merge candidates per chunk, same pattern already used for buildings. Maintainability
11. Magic numbers throughout (0.15, 0.6, 0.85 typeRand thresholds, 80/30 clearance distances, 12.5/37.5 lamp offsets) —
    not bugs, but named constants would make the
    "prop mix" and "clearance radius" tunable without hunting through the method body.