import { Scene, MeshBuilder, Vector3, Quaternion, Mesh, StandardMaterial, Color3, Ray, SceneLoader, Space, Texture } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { Car } from "../player/Car";
import { EffectManager } from "../effects/EffectManager";

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
  private sirenMesh: Mesh | null = null;
  private sirenMaterial: StandardMaterial | null = null;

  constructor(public scene: Scene, position: Vector3, private effectManager: EffectManager) {
    this.mesh = MeshBuilder.CreateBox("police", { width: 1.6, height: 0.8, depth: 3.2 }, scene);
    this.mesh.position = position.clone();
    
    this.mesh.checkCollisions = true;
    this.mesh.ellipsoid = new Vector3(0.8, 0.4, 1.6);
    this.mesh.ellipsoidOffset = new Vector3(0, 0.4, 0);
    
    const mat = new StandardMaterial("policeMat", scene);
    mat.diffuseColor = Color3.FromHexString("#ef4444"); // Red-500
    this.mesh.material = mat;

    // Hide the collider box and load the detailed GLB model
    this.mesh.visibility = 0;

    SceneLoader.ImportMeshAsync("", "/src/assets/Models/", "car_2.glb", scene).then((result) => {
      const rootMesh = result.meshes[0];
      rootMesh.parent = this.mesh;
      rootMesh.position = new Vector3(0, -0.4, 0);
      rootMesh.rotate(new Vector3(1, 0, 0), -Math.PI / 2, Space.LOCAL);
      rootMesh.rotate(new Vector3(0, 1, 0), -Math.PI / 2, Space.WORLD);
      
      const carTexture = new Texture("/src/assets/Textures/Car Texture 2.png", scene, false, false);
      // Ensure the child meshes don't block collisions and apply the texture to their materials
      result.meshes.forEach(m => {
        m.checkCollisions = false;
        if (m.material) {
          const matAny = m.material as any;
          if ("albedoTexture" in matAny) {
            matAny.albedoTexture = carTexture;
          } else if ("diffuseTexture" in matAny) {
            matAny.diffuseTexture = carTexture;
          }
        }
      });

      // Position the siren light perfectly on top of the car roof using bounding boxes
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
        this.sirenMesh.position.y = localY + 0.1; // Place exactly on top of the roof
      }
    }).catch(err => {
      console.error("Failed to load car_2.glb model:", err);
    });
    
    // Create a siren light
    const sirenMat = new StandardMaterial("sirenMat", scene);
    sirenMat.emissiveColor = Color3.Red();
    sirenMat.diffuseColor = Color3.Red();
    const siren = MeshBuilder.CreateBox("siren", { width: 0.4, height: 0.2, depth: 0.4 }, scene);
    siren.position.y = 0.5; // Fallback initial height, will be precisely adjusted when model loads
    siren.material = sirenMat;
    siren.parent = this.mesh;
    this.sirenMesh = siren;
    this.sirenMaterial = sirenMat;

    this.mesh.onCollideObservable.add((collidedMesh) => {
      if (collidedMesh && !collidedMesh.isDisposed()) {
        if (collidedMesh.name.includes("building") || collidedMesh.name.includes("police")) {
          const now = performance.now();
          if (now - this.lastCollisionTime > 500) {
            this.lastCollisionTime = now;
            this.health--;
            
            this.effectManager.createSparks(this.mesh.position, this.mesh.position.subtract(collidedMesh.position).normalize());
            
            // Flash white for all descendant meshes of the model
            const meshBackupList: { mesh: Mesh, oldColor?: Color3 }[] = [];
            this.mesh.getChildMeshes().forEach(child => {
              const m = child as Mesh;
              if (m.material && m.name !== "siren") {
                const matAny = m.material as any;
                if (matAny.diffuseColor) {
                  meshBackupList.push({ mesh: m, oldColor: matAny.diffuseColor.clone() });
                  matAny.diffuseColor = Color3.White();
                } else if (matAny.albedoColor) {
                  meshBackupList.push({ mesh: m, oldColor: matAny.albedoColor.clone() });
                  matAny.albedoColor = Color3.White();
                }
              }
            });

            setTimeout(() => {
              if (!this.isDestroyed) {
                meshBackupList.forEach(item => {
                  if (item.mesh && !item.mesh.isDisposed() && item.mesh.material) {
                    const matAny = item.mesh.material as any;
                    if (matAny.diffuseColor && item.oldColor) {
                      matAny.diffuseColor = item.oldColor;
                    } else if (matAny.albedoColor && item.oldColor) {
                      matAny.albedoColor = item.oldColor;
                    }
                  }
                });
              }
            }, 100);

            if (this.health <= 0) {
              this.explode();
            }
          }
        } else if (collidedMesh.name.includes("destructible")) {
          if (collidedMesh.parent && collidedMesh.parent.name.includes("destructible")) {
            if (!collidedMesh.parent.isDisposed()) {
                this.effectManager.createDust((collidedMesh.parent as any).position);
                (collidedMesh.parent as any).dispose();
            }
          } else {
            this.effectManager.createDust(collidedMesh.position);
            collidedMesh.dispose();
          }
        }
      }
    });
  }

  explode() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    this.effectManager.createExplosion(this.mesh.position);

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
    if (this.sirenMaterial) {
      if (Math.sin(Date.now() / 100) > 0) {
          this.sirenMaterial.emissiveColor = Color3.Red();
      } else {
          this.sirenMaterial.emissiveColor = Color3.Blue();
      }
    }
  }

  dispose() {
    this.mesh.dispose();
  }
}
