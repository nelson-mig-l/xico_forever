import { Scene, Vector3 } from "@babylonjs/core";
import { PoliceCar } from "./PoliceCar";
import { Car } from "../player/Car";
import { Game } from "../Game";

export class PoliceManager {
  public policeCars: PoliceCar[] = [];
  public destroyedCount: number = 0;
  private spawnTimer: number = 0;
  private difficultyTimer: number = 0;
  
  constructor(public scene: Scene, public target: Car, public game: Game) {}

  update(dt: number) {
    this.difficultyTimer += dt;
    
    // Spawn rate increases over time
    // Base 5s, min 1s
    const spawnInterval = Math.max(1.5, 5 - this.difficultyTimer / 40);
    const maxPolice = Math.min(20, 5 + Math.floor(this.difficultyTimer / 10));
    
    this.spawnTimer += dt;
    if (this.spawnTimer >= spawnInterval && this.policeCars.length < maxPolice) {
      this.spawnTimer = 0;
      this.spawnPolice();
    }

    for (let i = this.policeCars.length - 1; i >= 0; i--) {
      const police = this.policeCars[i];
      
      if (police.isDestroyed) {
        police.dispose();
        this.policeCars.splice(i, 1);
        this.destroyedCount++;
        continue;
      }

      police.update(dt, this.target);

      const dist = Vector3.Distance(police.mesh.position, this.target.mesh.position);
      if (dist < 2.5) {
        // Crash
        this.game.gameOver();
      }

      // Despawn if too far
      if (dist > 200) {
        police.dispose();
        this.policeCars.splice(i, 1);
      }
    }
  }

  spawnPolice() {
    // Spawn off-screen
    const angle = Math.random() * Math.PI * 2;
    const distance = 100; // Distance from player
    const spawnPos = this.target.mesh.position.add(new Vector3(
      Math.cos(angle) * distance,
      0.4,
      Math.sin(angle) * distance
    ));
    
    const police = new PoliceCar(this.scene, spawnPos);
    this.policeCars.push(police);
  }
}
