# Game Design Document (GDD)

## 1. Executive Summary
* **Project Name**: City Pursuit 3D (Pursuit / Escape)
* **Genre**: 3D Arcade Endless Police Pursuit / Driving Game
* **Target Platform**: Web Browser (Desktop / Mobile touch enabled)
* **Engine & Technology Stack**:
  * **3D Engine**: Babylon.js (`@babylonjs/core`)
  * **UI Framework**: React 18 with Tailwind CSS
  * **Build System & Runtime**: Vite + TypeScript (Node.js full-stack Cloud Run architecture)
  * **Audio Engine**: Web Audio API (Synthesized Real-Time Audio Engine)

---

## 2. Game Overview & Core Concept
**City Pursuit 3D** is an action-packed, fast-paced 3D arcade driving game where players navigate an infinite procedurally generated city while evading an escalating force of aggressive police pursuit vehicles. The primary goal is to survive as long as possible, execute high-speed drifts around obstacles, wreck destructible environment props, destroy police cars by forcing them into structures, and achieve the highest possible score.

---

## 3. Core Gameplay Loop & Mechanics

### 3.1 Gameplay Loop
1. **Spawn**: Player spawns in a safe center chunk (`chunk_0,0`) free of immediate dense obstacles.
2. **Drive & Drift**: Accelerate, steer, reverse, and execute handbrake drifts around corners and obstacles.
3. **Police Escalation**: Police squad cars spawn off-screen and relentlessly pursue the player using raycast-assisted pathing and line-of-sight interception.
4. **Collision & Destruction**:
   * **Destructible Props**: Hitting trees, lamp posts, and wooden fences demolishes them with particle dust and explosion effects without ending the game.
   * **Immovable Buildings**: Crashing directly into building walls instantly brings the player to a halt, incurring heavy collision sparks/dust.
   * **Police Bust / Capture**: If an active police vehicle makes direct physical contact with the player car (distance $< 2.5$ units), the run ends immediately.
5. **Game Over & Restart**: Displays final score, total police destroyed, lost police count, and run duration with an instant one-click restart option.

### 3.2 Vehicle Controls & Physics
* **Input Mapping**:
  * **Keyboard**: `W`/`Up Arrow` (Accelerate), `S`/`Down Arrow` (Brake / Reverse), `A`/`Left Arrow` / `D`/`Right Arrow` (Steer Left / Right), `Spacebar` (Handbrake / Drift).
  * **Touch / On-Screen UI**: Virtual controls for mobile devices.
* **Vehicle Dynamics**:
  * **Speed & Throttle**: Smooth acceleration curve up to top speed, with reverse capability at reduced speed.
  * **Drifting Engine**: Pressing handbrake/drift while turning reduces lateral tire traction, initiating sideways sliding with continuous `TrailMesh` tire skid marks, tire smoke particles, and dynamic audio tire squeal.
  * **Terrain & Slope Handling**: Calculates ground height and normal angles via bilinear terrain interpolation, ensuring vehicles align smoothly with underlying terrain contours.

### 3.3 Scoring & Progression System
* **Passive Distance/Time Score**: Score increments continuously based on time survived and vehicle speed.
* **Drift Bonus**: Drifting at high speeds awards score multipliers based on slip angle and drift duration.
* **Police Destruction Bonus**: Successfully baiting a police car into colliding with a building wall or tree triggers a white explosion and awards bonus score points.

---

## 4. Artificial Intelligence & Enemy Pursuit

### 4.1 Police Car Chase Mechanics
* **Chase Behavior**: Police AI units recalculate target vectors toward the player's current position on every tick.
* **Obstacle Avoidance**: Utilizes forward and diagonal raycasting (`Ray`) to detect impending building or terrain collisions, steering away dynamically to navigate city streets.
* **Siren System**: Dynamic dual red/blue flashing siren mounted atop the roof matrix, accompanied by flashing emissive light intensity.

### 4.2 Police Manager & Escalation Lifecycle
* **Spawning Logic**: Spawns new squad cars off-screen at a designated radius (e.g. 100 units from player) at periodic intervals.
* **Escalation**: Spawn frequency increases and maximum active police cap rises over the duration of the run.
* **Despawning & Cleanup**: Squad cars that fall far behind ($>200$ units) or collide at high impact are despawned and recycled to preserve performance.

---

## 5. World Generation & Environment Architecture

### 5.1 Procedural Infinite Terrain & Chunk Generator
* **Chunk-Based Grid**: The world is divided into $50 \times 50$ unit terrain chunks dynamically loaded and unloaded based on player grid coordinates (`chunk_X,Z`).
* **Safe Zone**: The origin chunk (`chunk_0,0`) guarantees open roads and no dense spawn hazards.
* **Procedural Placement**:
  * **Road Networks**: Grid layout with asphalt streets, sidewalks, and yellow/white lane markings.
  * **Buildings**: Extruded rectangular box colliders with randomized heights and architectural textures.
  * **Destructible Props**: Trees (trunk cylinder + leafy canopy spheres), street lamp posts, and fences.

### 5.2 Performance & Rendering Optimizations
* **Static Mesh Merging**: Non-collidable, non-destructible static environment elements (road asphalt, sidewalks, lane lines) within each chunk are merged by material group (`Mesh.MergeMeshes()`) to minimize draw calls.
* **Dynamic Chunk Culling**: Chunks beyond the designated render distance are disposed from memory along with their associated child meshes.

---

## 6. Audio Architecture (Real-Time WebAudio Synthesis)

The game features a fully synthesized procedural WebAudio sound engine requiring no external `.mp3`/`.wav` audio assets:

1. **Engine Sound Synthesizer**:
   * **Multi-Oscillator Blend**: Dual oscillators (Sawtooth and Square) combined with a Sub-Bass sine oscillator.
   * **Throttle & Pitch Modulation**: Dynamically scales frequency and filter cutoff based on real-time vehicle RPM and throttle load.
2. **Tire Skid & Screech Synthesizer**:
   * **Bandpass Scrub Noise**: Filtered white noise simulating rubber friction on asphalt.
   * **Resonant Tonal Squeal**: High-pitched dual oscillators with subtle detuning and filter sweeping that trigger during active drifting.
3. **Sound Effects**: Synthesized explosion rumbles, metal impact crash sounds, and destruction feedback.

---

## 7. User Interface (HUD) & Visual Effects

### 7.1 Visual & Particle Effects
* **Smoke & Dust**: Dust particles emitted when driving off-road or destroying environment props.
* **Collision Sparks**: Directional particle sparks on vehicle-wall impacts.
* **Explosions**: Fiery particle system, bright light flash sphere, and flying physical box debris on vehicle destruction.
* **Drift Skid Marks**: Real-time `TrailMesh` ribbon geometry rendered under rear tires during drifts.

### 7.2 User Interface & HUD
* **Score & Multipliers**: Top-left clean typography showing live score and police destruction count.
* **HUD Speedometer**: Circular SVG speed gauge with digital numeric readout, gear indicator (R / 1-6), and drift status indicator.
* **Live Mini-Map**: Dynamic 2D canvas radar rendered in top-right displaying player position, facing direction, nearby buildings, and red blips for active chasing police units.
* **Chunk Indicator**: Sleek dark badge in the bottom center displaying the player's active grid coordinate (`CHUNK: chunk_X,Z`).
* **FPS Counter**: Frame-rate indicator tracking real-time engine rendering performance.

---

## 8. Technical Architecture & Directory Structure

```
src/
├── main.tsx                # Entry point
├── App.tsx                 # Main React HUD layout, state bindings, & canvas container
├── Game.ts                 # Master Babylon.js engine controller & game loop manager
├── ai/
│   ├── PoliceCar.ts        # Individual police AI entity logic & raycast steering
│   └── PoliceManager.ts    # Police spawner, difficulty scaler, & lifecycle manager
├── player/
│   ├── Car.ts              # Player car physics, drift state, & mesh transform management
│   └── CarController.ts    # Input listener (Keyboard & Touch controls)
├── world/
│   ├── ChunkGenerator.ts   # Infinite terrain tile manager & static mesh merger
│   └── Terrain.ts          # Bilinear terrain height & slope calculation helpers
├── scene/
│   ├── Camera.ts           # Smooth third-person chase camera controller
│   ├── Lighting.ts         # Directional sunlight & shadow generator configuration
│   └── World.ts            # Skybox & base environment setup
├── effects/
│   └── EffectManager.ts    # WebAudio synthesizer & Babylon.js particle effect system
└── ui/
    └── MiniMapRenderer.ts  # Radar minimap canvas rendering engine
```

---

## 9. Future Roadmap & Expansion Opportunities
* **Power-Ups & Collectibles**: Nitrous boosts, repair kits, and EMP blasts.
* **Vehicle Selection**: Unlockable player vehicles with varying top speed, acceleration, and drift handling stats.
* **Weather & Time of Day Cycles**: Dynamic day/night transition, fog, and rain wet-asphalt reflections.
* **Global Leaderboards**: Online score submission and player rankings.
