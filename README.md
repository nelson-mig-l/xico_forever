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
- [ ] **Phase 7 — Road Generator:** Add procedural roads and intersections.
- [x] **Phase 8 — Procedural Decorations:** Add randomly placed trees, lamp posts, fences, etc.
- [ ] **Phase 9 — Camera Polish:** Add camera lag, rotation towards movement, and screen shake.
- [ ] **Phase 10 — Crashes & Effects:** Add particles, tire marks, sparks, debris, and sound effects.
- [ ] **Phase 11 — Powerups:** Implement shield, slow time, EMP, nitro, and coin magnets.
- [ ] **Phase 12 — Optimization:** Implement instancing, object pooling, and frustum culling.
- [ ] **Phase 13 — Nice Extras:** Day/night cycle, weather (rain/fog), traffic, hidden shortcuts, and leaderboards.

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
