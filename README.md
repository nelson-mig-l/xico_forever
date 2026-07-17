# Babylon.js Endless Car Chase Game

A PAKO Forever–style endless driving and drifting game built with Babylon.js and React. The goal of this project is to capture the satisfying, fast-paced arcade feel of a top-down police chase, focusing on modular architecture and procedural generation.

## Tech Stack

*   **Rendering:** Babylon.js
*   **Language:** TypeScript
*   **Physics:** Custom Arcade Physics (optimized for drifting)
*   **Build Tool:** Vite
*   **UI:** React & Tailwind CSS (HTML/CSS overlay)

## Game Features (Current & Planned)

The game is being developed in iterative phases, focusing on smooth controls and endless replayability.

### 🚗 Driving & Arcade Drift
- Simple controls (WASD / Arrow Keys)
- Custom arcade physics with forward and lateral velocity separation for satisfying drifting behavior.
- Top-down camera that smoothly follows and anticipates the player's movement.

### 🗺️ Infinite Procedural World
- Chunk-based world generation.
- Infinite procedural terrain that spawns and despawns around the player to maintain performance.
- Random obstacles and procedural decorations.

### 🚓 Police AI
- Police cars that spawn dynamically and chase the player.
- Steering behaviors that combine seeking the player with collision recovery.
- Difficulty that scales over time (more police, higher aggression).

## Development Roadmap

This project is structured in phases to keep development modular and testable:

- [x] **Phase 1 — Driving Prototype:** Drive a single car on a flat plane.
- [x] **Phase 2 — Arcade Drift:** Add satisfying arcade drift by separating forward and sideways velocity.
- [x] **Phase 3 — Camera:** Implement a camera that follows smoothly.
- [x] **Phase 4 — Infinite Map:** Build an endless chunk-based world generator.
- [x] **Phase 5 — Police AI:** Spawn police cars with basic chase behavior.
- [x] **Phase 6 — Difficulty:** Add scoring and survival mechanics (BUSTED screen).
- [x] **Phase 7 — Road Generator:** Add procedural roads and intersections.
- [x] **Phase 8 — Procedural Decorations:** Add randomly placed trees, lamp posts, fences, etc.
- [ ] **Phase 9 — Camera Polish:** Add camera lag, rotation towards movement, and screen shake.
- [x] **Phase 10 — Crashes & Effects:** Add particles, tire marks, sparks, debris, and sound effects.
  - [ ] *Audio Refactor:* Migrate custom Web Audio synthesis to the Babylon.js Audio API for native 3D spatialized sound.
- [ ] **Phase 11 — Powerups:** Implement shield, slow time, EMP, nitro, and coin magnets.
- [ ] **Phase 12 — Optimization:** Implement instancing, object pooling, and frustum culling.
- [ ] **Phase 13 — Nice Extras:** Day/night cycle, weather (rain/fog), traffic, hidden shortcuts, and leaderboards.
- [ ] **Phase 14 — Asset Integrity & GitHub Pages Deployment:** Prevent binary asset corruption during git/text transfers and establish GitHub Pages hosting. See [GITHUB-PAGES.md](./GITHUB-PAGES.md) for full setup instructions.

## Ensuring Binary Asset Integrity (GLB / FBX Files)

Since `.glb` and `.fbx` are binary formats, their byte sequences must be preserved exactly. To ensure their encoding does not get modified or corrupted during Git transfers, repository checkouts, or deployment pipelines:

### 1. Configure `.gitattributes`
Create a `.gitattributes` file in the root of your repository to explicitly define these formats as binary. This tells Git to never perform line-ending normalization (like CRLF to LF) or text-based diff comparisons:
```gitattributes
# Force Git to treat these assets as binary blobs
*.glb binary
*.fbx binary
*.png binary
```

### 2. Ensure Correct Web Server MIME-Types
When deploying to a custom server or CDNs, verify that `.glb` files are served with the correct MIME-type:
* **GLB MIME Type:** `model/gltf-binary`
* **gltf MIME Type:** `model/gltf+json`

### 3. Avoid Text-Based File Operations
Never open binary files using text editors or modify them using scripts that read/write strings. Always use binary buffer operations (`rb`/`wb` modes in Python, or raw buffers in Node.js). If binary files are read or written as text/UTF-8, the system will replace invalid byte sequences with the UTF-8 replacement character (`\xef\xbf\xbd`), which permanently corrupts the files.

---

## 🛠️ Resolving and Recovering Corrupted 3D Models

If you encounter Babylon.js errors such as:
- `Length in header does not match actual data length`
- `First chunk format is not JSON`

This indicates that your `.glb` model files have been corrupted (e.g. by being edited, read, or transferred as a text-encoded format instead of a raw binary stream).

### How It Was Solved
The binary integrity was fully restored by recompiling the intact source FBX models (`car_1.fbx` and `car_2.fbx`) back into binary `.glb` containers using the pre-installed local tool `FBX2glTF`.

### Rebuilding Binary Models (Cross-Platform Recovery Script)
To automate this and prevent future manual CLI usage, a programmatic Node script has been added to the repository:

1. **Run the rebuild script directly using NPM:**
   ```bash
   npm run assets:rebuild
   ```

2. **The underlying script (`scripts/rebuild-models.js`):**
   This script programmatically uses the `fbx2gltf` Node wrapper package, which automatically detects your operating system (macOS, Linux, or Windows) and uses the corresponding native binary compiler:
   ```javascript
   import convert from 'fbx2gltf';
   import path from 'path';

   const src = path.resolve('public/assets/Models/car_1.fbx');
   const dest = path.resolve('public/assets/Models/car_1.glb');

   await convert(src, dest, ['--binary']);
   ```

Running `npm run assets:rebuild` ensures that fresh, perfectly-encoded binary `.glb` models are regenerated instantly.

---

## Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Run Development Server:**
    ```bash
    npm run dev
    ```
3.  **Build for Production:**
    ```bash
    npm run build
    ```

## Controls
- **W / Up Arrow:** Accelerate
- **S / Down Arrow:** Brake / Reverse
- **A / Left Arrow:** Steer Left
- **D / Right Arrow:** Steer Right
