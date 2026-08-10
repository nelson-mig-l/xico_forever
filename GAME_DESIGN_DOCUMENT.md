# Game Design Document (GDD)

## 1. Executive Summary
* **Project Name**: City Pursuit 3D
* **Genre**: 3D Arcade Endless Police Pursuit & Driving Simulator
* **Target Platform**: Modern Web Browsers (Desktop & Mobile Touch Devices)
* **Engine & Technology Stack**:
  * **3D Engine**: Babylon.js (`@babylonjs/core` v7+)
  * **UI Framework**: React 18 with Tailwind CSS v4
  * **Build System & Runtime**: Vite + TypeScript (Node.js full-stack Cloud Run architecture)
  * **Audio Engine**: Web Audio API (100% Real-Time Synthesized Audio, 0 MP3/WAV dependency)

---

## 2. Game Overview & Core Concept
**City Pursuit 3D** is an action-packed, fast-paced 3D arcade driving game where players navigate an infinite procedurally generated city while evading an escalating force of aggressive police pursuit vehicles. The primary goal is to survive as long as possible, execute high-speed drifts around corners, wreck destructible environment props, bait police squad cars into crashing into buildings, and achieve the highest possible score.

---

## 3. Detailed Vehicle Physics & Metrics

### 3.1 Player Car Specifications (`Car.ts`)
| Parameter | Exact Value | Description / Formula |
| :--- | :--- | :--- |
| **Collider Box Size** | $1.6\text{w} \times 0.8\text{h} \times 3.2\text{d}$ units | Bounding physics box with ellipsoid bounds $(0.8, 0.4, 1.6)$ |
| **Max Forward Speed** | $25.0 \text{ units/s}$ | Equivalent to ~90 km/h arcade speed |
| **Acceleration** | $20.0 \text{ units/s}^2$ | Linear acceleration rate when holding throttle |
| **Turn Speed** | $2.5 \text{ rad/s}$ | Base steering angular velocity (~143°/s) |
| **Drift Factor** | $0.96$ | Lateral friction retention coefficient during handbrake slide |
| **Spawn Coordinate** | $(25.0, Y, 25.0)$ | Centered safely inside initial tile `chunk_0,0` |
| **Model Transformation** | $-90^\circ \text{ X}_{\text{LOCAL}}$, $-90^\circ \text{ Y}_{\text{WORLD}}$ | Local/World matrix offsets aligning GLB mesh flat to floor |

### 3.2 Police Pursuit Unit Specifications (`PoliceCar.ts`)
| Parameter | Exact Value | Description / Formula |
| :--- | :--- | :--- |
| **Max Speed** | $26.0 \text{ units/s}$ | $+1.0 \text{ units/s}$ faster than player to ensure constant chase pressure |
| **Acceleration** | $18.0 \text{ units/s}^2$ | Catch-up acceleration rate |
| **Turn Speed** | $3.0 \text{ rad/s}$ | Agile AI pursuit steering rate (~172°/s) |
| **Health Points** | $3 \text{ HP}$ | Durability before explosion & vehicle destruction |
| **Bust / Capture Range** | $< 2.5 \text{ units}$ | Direct physical contact distance triggering immediate **Game Over** |
| **Raycast Avoidance** | $15.0 \text{ units forward}$ | Forward raycast distance for building obstacle detection |

---

## 4. Artificial Intelligence & Pursuit Escalation

### 4.1 Police Manager Mechanics (`PoliceManager.ts`)
* **Off-Screen Spawning**: Police units instantiate off-screen at an exact radius of **$100 \text{ world units}$** from the player at a random angle $\theta \in [0, 2\pi)$.
* **Despawning & Recycling**: Units falling beyond **$200 \text{ world units}$** from the player or destroyed via crash impact are despawned and recycled.
* **Dynamic Difficulty Scaling Formulas**:
  $$\text{Spawn Interval (s)} = \max\left(1.5, 5.0 - \frac{t_{\text{run}}}{40}\right)$$
  $$\text{Max Police Cap} = \min\left(20, 5 + \left\lfloor \frac{t_{\text{run}}}{10} \right\rfloor \right)$$
  * *Initial State*: 1 squad car spawned every $5.0\text{s}$, max cap of $5$ units.
  * *Peak Difficulty ($t \ge 150\text{s}$)*: 1 squad car spawned every $1.5\text{s}$, max cap of $20$ units.

---

## 5. Infinite Procedural World Generation

### 5.1 Chunk Architecture Specs (`ChunkGenerator.ts`)
* **Tile Dimensions**: **$50 \times 50 \text{ world units}$** ($2,500 \text{ m}^2$ surface area per chunk).
* **Render Distance**: $R = 2 \text{ chunks}$ in all cardinal directions.
* **Active Grid**: Creates a $(2R + 1) \times (2R + 1) = 5 \times 5$ tile matrix around the player, maintaining exactly **25 active chunks** in scene memory.
* **Origin Safe Zone**: Chunk coordinate `chunk_0,0` is programmatically guaranteed to have clear road corridors without building obstacles.

### 5.2 Environment Props & Draw-Call Optimization
| Asset Category | Mesh Components | Collision & Destruction Type |
| :--- | :--- | :--- |
| **Roads & Sidewalks** | $12\text{u}$ wide road, $2\text{u}$ sidewalks, yellow center lines | Static, non-collidable (Merged into single draw call via `Mesh.MergeMeshes()`) |
| **Buildings** | 16 GLB architectural templates ($15\text{m} - 45\text{m}$ tall) | Immovable box colliders |
| **Trees** | Cylinder trunk + leafy canopy spheres | Destructible (`destructible_tree`), triggers green dust/sparks on impact |
| **Lamp Posts & Fences** | Metal pole, lamp head, wooden fence segments | Destructible (`destructible_lamppost`), disposes parent container on impact |

---

## 6. Real-Time WebAudio Sound Engine (`EffectManager.ts`)

The entire sound system is synthesized dynamically using the browser's Web Audio API (`AudioContext`):

### 6.1 Synthesizer Specifications
1. **Engine Audio**:
   * **Main Oscillators**: Sawtooth + Square wave (harmonic exhaust detune).
   * **Sub-Bass Oscillator**: Sine wave tuned at $0.5 \times$ base frequency for low-end rumble.
   * **Frequency Range**: $f_{\text{base}} \in [45 \text{ Hz}, 180 \text{ Hz}]$ scaled by vehicle speed ratio.
   * **Lowpass Filter**: Cutoff $f_c \in [200 \text{ Hz}, 2500 \text{ Hz}]$ dynamically driven by throttle load.
2. **Tire Skid & Screech Audio**:
   * **Asphalt Scrub**: Bandpass-filtered white noise ($f_0 = 1400 \text{ Hz}, Q = 3.5$).
   * **Resonant Rubber Screech**: Secondary bandpass filter ($f_0 = 2800 \text{ Hz}, Q = 12.0$).
   * **High Pitch Squeal**: Dual Sawtooth ($2100 \text{ Hz}$) and Sine ($2900 \text{ Hz}$) oscillators passed through a $1200 \text{ Hz}$ highpass filter during drift state.

---

## 7. Camera, Minimap & HUD Architecture

### 7.1 Third-Person Chase Camera (`Camera.ts`)
* **Follow Distance**: $12.0 \text{ world units}$ behind vehicle velocity vector.
* **Elevation Offset**: $6.0 \text{ world units}$ vertical height above road terrain.
* **Lerp Coefficient**: $\alpha = 0.1$ frame-smoothing factor for target position tracking.

### 7.2 MiniMap Radar Overlay (`MiniMapRenderer.ts`)
* **Canvas Dimensions**: $180 \times 180 \text{ pixels}$ circular radar view.
* **Zoom Scale**: $1.2 \text{ px/unit}$ covering a $150 \text{ unit}$ radar radius.
* **Render Layers**:
  * Gray boxes for surrounding building footprints.
  * Blue chevron icon representing player position and heading angle $\theta$.
  * Red pulsing blips representing active chasing police units.

### 7.3 On-Screen HUD Indicators
* **Score & Multiplier**: Real-time score counter incremented by survival time, speed, drift multipliers, and police crashes.
* **Circular SVG Speedometer**: Digital numeric speed readout (units/s), gear ratio (R, 1-6), and animated arc gauge.
* **Bottom-Center Chunk Badge**: Modern dark glassmorphic badge showing active grid tile coordinates (`CHUNK: chunk_X,Z`).
* **FPS Counter**: Top-left live engine rendering framerate counter.

---

## 8. Directory & File Manifest
```
src/
├── main.tsx                # Application entry point
├── App.tsx                 # React HUD layout, speedometer, minimap canvas, chunk badge
├── Game.ts                 # Babylon.js engine loop controller & state synchronizer
├── ai/
│   ├── PoliceCar.ts        # Police AI pathfinding, raycast avoidance, & health
│   └── PoliceManager.ts    # Difficulty scaler, off-screen spawner, & despawner
├── player/
│   ├── Car.ts              # Player car physics, drift mechanics, & model transforms
│   └── CarController.ts    # Keyboard & touch input listener
├── world/
│   ├── ChunkGenerator.ts   # 50x50 tile procedural generator & static mesh merger
│   └── Terrain.ts          # Bilinear terrain height & slope calculation
├── scene/
│   ├── Camera.ts           # Smooth 3D third-person follow camera
│   ├── Lighting.ts         # Directional sunlight & shadow generator configuration
│   └── World.ts            # Skybox & atmospheric lighting
├── effects/
│   └── EffectManager.ts    # WebAudio sound synthesizer & particle effects engine
└── ui/
    └── MiniMapRenderer.ts  # Radar minimap canvas rendering engine
```
