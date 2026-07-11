import { Scene, MeshBuilder, Vector3, Quaternion, Mesh, StandardMaterial, Color3, Ray } from "@babylonjs/core";
import { Car } from "../player/Car";

export class PoliceCar {
  private static nextId = 1;
  public id: number = PoliceCar.nextId++;
  public mesh: Mesh;
  public velocity: Vector3 = Vector3.Zero();
  public heading: number = 0;
  
  public speed: number = 0;
  public maxSpeed: number = 26; // Slightly faster than player
  public acceleration: number = 18;
  public turnSpeed: number = 3.0;
  public isDestroyed: boolean = false;
  public health: number = 3;
  private lastCollisionTime: number = 0;

  constructor(public scene: Scene, position: Vector3) {
    this.mesh = MeshBuilder.CreateBox("police", { width: 1.6, height: 0.8, depth: 3.2 }, scene);
    this.mesh.position = position.clone();
    
    this.mesh.checkCollisions = true;
    this.mesh.ellipsoid = new Vector3(0.8, 0.4, 1.6);
    this.mesh.ellipsoidOffset = new Vector3(0, 0.4, 0);
    
    const mat = new StandardMaterial("policeMat", scene);
    mat.diffuseColor = Color3.FromHexString("#ef4444"); // Red-500
    this.mesh.material = mat;
    
    // Create a siren light
    const sirenMat = new StandardMaterial("sirenMat", scene);
    sirenMat.emissiveColor = Color3.Red();
    sirenMat.diffuseColor = Color3.Red();
    const siren = MeshBuilder.CreateBox("siren", { width: 0.4, height: 0.2, depth: 0.4 }, scene);
    siren.position.y = 0.5;
    siren.material = sirenMat;
    siren.parent = this.mesh;

    this.mesh.onCollideObservable.add((collidedMesh) => {
      if (collidedMesh && !collidedMesh.isDisposed()) {
        if (collidedMesh.name.includes("building") || collidedMesh.name.includes("police")) {
          const now = performance.now();
          if (now - this.lastCollisionTime > 500) {
            this.lastCollisionTime = now;
            this.health--;
            
            // Flash white
            const mat = this.mesh.material as StandardMaterial;
            if (mat) {
              const oldColor = mat.diffuseColor.clone();
              mat.diffuseColor = Color3.White();
              setTimeout(() => {
                if (!this.isDestroyed && this.mesh.material) {
                  mat.diffuseColor = oldColor;
                }
              }, 100);
            }

            if (this.health <= 0) {
              this.explode();
            }
          }
        } else if (collidedMesh.name.includes("destructible")) {
          if (collidedMesh.parent && collidedMesh.parent.name.includes("destructible")) {
            if (!collidedMesh.parent.isDisposed()) collidedMesh.parent.dispose();
          } else {
            collidedMesh.dispose();
          }
        }
      }
    });
  }

  explode() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // Create explosion effect
    const explosion = MeshBuilder.CreateSphere("explosion", { diameter: 3 }, this.scene);
    explosion.position = this.mesh.position.clone();
    
    const mat = new StandardMaterial("expMat", this.scene);
    mat.emissiveColor = new Color3(1, 0.4, 0);
    mat.diffuseColor = new Color3(1, 0.2, 0);
    mat.alpha = 0.8;
    mat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
    explosion.material = mat;
    
    let scale = 1;
    let alpha = 0.8;
    
    const observer = this.scene.onBeforeRenderObservable.add(() => {
        const dt = this.scene.getEngine().getDeltaTime() / 1000;
        scale += dt * 15;
        explosion.scaling.setAll(scale);
        alpha -= dt * 2;
        mat.alpha = Math.max(0, alpha);
        
        if (alpha <= 0) {
            explosion.dispose();
            this.scene.onBeforeRenderObservable.removeCallback(observer);
        }
    });

    // Hide mesh and disable collisions
    this.mesh.isVisible = false;
    this.mesh.checkCollisions = false;
    this.mesh.getChildMeshes().forEach(m => m.isVisible = false);
  }

  get forward(): Vector3 {
    return new Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
  }

  update(dt: number, target: Car) {
    // Seek player
    const toTarget = target.mesh.position.subtract(this.mesh.position);
    toTarget.y = 0;
    
    const distance = toTarget.length();
    if (distance > 0) {
      toTarget.normalize();
      
      let targetAngle = Math.atan2(toTarget.x, toTarget.z);
      
      // Obstacle avoidance
      const rayLen = 20;
      const rayOffsets = [-0.6, -0.3, 0, 0.3, 0.6]; // Angles relative to heading
      let avoidAngle = 0;
      let hitCount = 0;

      const origin = this.mesh.position.clone();
      origin.y += 0.5;

      for (const offset of rayOffsets) {
        const rayHeading = this.heading + offset;
        const dir = new Vector3(Math.sin(rayHeading), 0, Math.cos(rayHeading));
        const ray = new Ray(origin, dir, rayLen);
        const hit = this.scene.pickWithRay(ray, (mesh) => mesh.name.includes("building"));
        
        if (hit && hit.hit) {
          hitCount++;
          const hitDist = hit.distance;
          const weight = 1.0 - (hitDist / rayLen);
          
          if (offset === 0) {
            avoidAngle += Math.PI * 0.8 * weight; // Turn sharply if hitting center
          } else {
            avoidAngle += Math.sign(-offset) * weight * Math.PI * 0.5; 
          }
        }
      }

      if (hitCount > 0) {
        targetAngle = this.heading + avoidAngle / hitCount;
        // this.speed = Math.max(this.speed - this.acceleration * 2 * dt, this.maxSpeed * 0.3); // Slow down when avoiding
      } else {
        this.speed += this.acceleration * dt;
      }
      
      let angleDiff = targetAngle - this.heading;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      
      const steering = Math.sign(angleDiff) * Math.min(1, Math.abs(angleDiff) * 3);
      
      this.heading += steering * this.turnSpeed * dt;
      this.mesh.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), this.heading);

      this.speed = Math.min(this.speed, this.maxSpeed);

      this.velocity = this.forward.scale(this.speed);
      
      const moveVector = this.velocity.scale(dt);
      moveVector.y = 0; // Gravity
      this.mesh.moveWithCollisions(moveVector);
      this.mesh.position.y = 0.4;
    }
    
    // Flash siren
    const sirenMat = (this.mesh.getChildren()[0] as Mesh).material as StandardMaterial;
    if (Math.sin(Date.now() / 100) > 0) {
        sirenMat.emissiveColor = Color3.Red();
    } else {
        sirenMat.emissiveColor = Color3.Blue();
    }
  }

  dispose() {
    this.mesh.dispose();
  }
}
