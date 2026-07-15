import { Scene, MeshBuilder, Vector3, Quaternion, Mesh, StandardMaterial, Color3, TrailMesh, ParticleSystem, SceneLoader, Space, Texture } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { EffectManager } from "../effects/EffectManager";

export class Car {
  public mesh: Mesh;
  public velocity: Vector3 = Vector3.Zero();
  public heading: number = 0;
  
  public speed: number = 0;
  public maxSpeed: number = 25;
  public acceleration: number = 20;
  public turnSpeed: number = 2.5;
  public driftFactor: number = 0.96; // Higher = more slidey
  
  public isCrashed: boolean = false;
  
  private trailLeft: TrailMesh;
  private trailRight: TrailMesh;
  private driftDustLeft: ParticleSystem;
  private driftDustRight: ParticleSystem;
  private skidSoundTimer: number = 0;

  constructor(public scene: Scene, private effectManager: EffectManager) {
    this.mesh = MeshBuilder.CreateBox("car", { width: 1.6, height: 0.8, depth: 3.2 }, scene);
    this.mesh.position.y = 0.4;
    
    this.mesh.checkCollisions = true;
    this.mesh.ellipsoid = new Vector3(0.8, 0.4, 1.6);
    this.mesh.ellipsoidOffset = new Vector3(0, 0.4, 0);
    
    const mat = new StandardMaterial("carMat", scene);
    mat.diffuseColor = Color3.FromHexString("#2563eb"); // Blue-600
    mat.specularPower = 64;
    this.mesh.material = mat;

    // Hide the collider box mesh and load the detailed GLB model
    this.mesh.visibility = 0;

    SceneLoader.ImportMeshAsync("", "./assets/Models/", "car_1.glb", scene).then((result) => {
      const rootMesh = result.meshes[0];
      rootMesh.parent = this.mesh;
      // Offset the model so its bottom aligns with the collider base
      rootMesh.position = new Vector3(0, -0.4, 0);
      rootMesh.rotate(new Vector3(1, 0, 0), -Math.PI / 2, Space.LOCAL);
      rootMesh.rotate(new Vector3(0, 1, 0), -Math.PI / 2, Space.WORLD);
      
      const carTexture = new Texture("./assets/Textures/Car Texture 1.png", scene, false, false);
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
    }).catch(err => {
      console.error("Failed to load car_1.glb model:", err);
    });

    this.mesh.onCollideObservable.add((collidedMesh) => {
      if (collidedMesh && !collidedMesh.isDisposed()) {
        if (collidedMesh.name.includes("destructible")) {
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

    // Create skid marks (TrailMesh)
    const trailMat = new StandardMaterial("trailMat", scene);
    trailMat.diffuseColor = new Color3(0, 0, 0);
    trailMat.emissiveColor = new Color3(0, 0, 0);
    trailMat.specularColor = new Color3(0, 0, 0);
    trailMat.alpha = 0.5;

    const leftWheel = new Mesh("leftWheel", scene);
    leftWheel.parent = this.mesh;
    leftWheel.position = new Vector3(-0.6, -0.3, -1.2);

    const rightWheel = new Mesh("rightWheel", scene);
    rightWheel.parent = this.mesh;
    rightWheel.position = new Vector3(0.6, -0.3, -1.2);

    this.trailLeft = new TrailMesh("trailLeft", leftWheel, scene, 0.3, 60, true);
    this.trailLeft.material = trailMat;
    
    this.trailRight = new TrailMesh("trailRight", rightWheel, scene, 0.3, 60, true);
    this.trailRight.material = trailMat;

    this.driftDustLeft = this.effectManager.createDriftDust(leftWheel);
    this.driftDustRight = this.effectManager.createDriftDust(rightWheel);
  }

  get forward(): Vector3 {
    return new Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
  }

  get right(): Vector3 {
    return new Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading));
  }

  applyInputs(throttle: number, steering: number, dt: number) {
    if (this.isCrashed) return;

    this.speed += throttle * this.acceleration * dt;
    this.speed = Math.max(-this.maxSpeed / 2, Math.min(this.speed, this.maxSpeed));
    
    if (throttle === 0) {
      this.speed *= 0.98; // Friction
    }

    // Only steer if moving
    const speedFactor = Math.abs(this.speed) / this.maxSpeed;
    this.heading += steering * this.turnSpeed * speedFactor * dt;

    this.mesh.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), this.heading);
  }

  update(dt: number) {
    if (this.isCrashed) {
        this.trailLeft.stop();
        this.trailRight.stop();
        this.driftDustLeft.stop();
        this.driftDustRight.stop();
        return;
    }

    // Arcade drift physics
    const currentForwardVelocity = this.forward.scale(this.speed);
    
    // Calculate lateral velocity
    const dot = Vector3.Dot(this.velocity, this.forward);
    const lateralVelocity = this.velocity.subtract(this.forward.scale(dot));
    
    // Dampen lateral velocity (grip)
    lateralVelocity.scaleInPlace(this.driftFactor);

    // Combine
    this.velocity = currentForwardVelocity.add(lateralVelocity);
    
    // Move with collisions
    const moveVector = this.velocity.scale(dt);
    // Add fake gravity
    moveVector.y = 0;
    
    this.mesh.moveWithCollisions(moveVector);

    // Lock Y to prevent flying
    this.mesh.position.y = 0.4;

    // Handle trails & effects
    const lateralSpeed = lateralVelocity.length();
    const isDrifting = lateralSpeed > 5.0 && Math.abs(this.speed) > 5;
    
    if (isDrifting) {
        this.trailLeft.start();
        this.trailRight.start();
        if (!this.driftDustLeft.isStarted() || !this.driftDustLeft.isAlive()) {
            this.driftDustLeft.start();
            this.driftDustRight.start();
        }
    } else {
        this.trailLeft.stop();
        this.trailRight.stop();
        if (this.driftDustLeft.isStarted()) {
            this.driftDustLeft.stop();
            this.driftDustRight.stop();
        }
    }

    if (isDrifting) {
        this.skidSoundTimer += dt;
        if (this.skidSoundTimer > 0.1) {
            this.skidSoundTimer = 0;
            this.effectManager.playSkidSound();
        }
    }
  }

  crash() {
    this.isCrashed = true;
    const mat = this.mesh.material as StandardMaterial;
    mat.diffuseColor = new Color3(0.1, 0.1, 0.1);
    this.mesh.getChildMeshes().forEach(child => {
      if (child.material) {
        const m = child.material as any;
        if (m.diffuseColor) m.diffuseColor = new Color3(0.1, 0.1, 0.1);
        if (m.albedoColor) m.albedoColor = new Color3(0.1, 0.1, 0.1);
      }
    });
    this.effectManager.createExplosion(this.mesh.position);
  }
}
