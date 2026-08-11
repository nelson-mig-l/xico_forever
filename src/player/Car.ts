import { Scene, MeshBuilder, Vector3, Quaternion, Mesh, StandardMaterial, Color3, TrailMesh, ParticleSystem, SceneLoader, Space, Texture } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { EffectManager } from "../effects/EffectManager";
import { getTerrainHeight, getTerrainSlopeAngles } from "../world/Terrain";

export class Car {
  public mesh: Mesh;
  public modelWrapper: Mesh | null = null;
  public modelRoot: Mesh | null = null;
  public velocity: Vector3 = Vector3.Zero();
  public heading: number = 0;
  
  public speed: number = 0;
  public maxSpeed: number = 25;
  public acceleration: number = 20;
  public turnSpeed: number = 2.5;
  public driftFactor: number = 0.96; // Higher = more slidey
  
  public isCrashed: boolean = false;
  public isDrifting: boolean = false;
  
  private trailLeft: TrailMesh;
  private trailRight: TrailMesh;
  private driftDustLeft: ParticleSystem;
  private driftDustRight: ParticleSystem;
  private skidSoundTimer: number = 0;

  constructor(public scene: Scene, private effectManager: EffectManager) {
    this.effectManager.setPlayerCar(this);
    this.mesh = MeshBuilder.CreateBox("car", { width: 1.6, height: 0.8, depth: 3.2 }, scene);
    this.mesh.position.set(25, getTerrainHeight(25, 25) + 0.4, 25);
    
    this.mesh.checkCollisions = true;
    this.mesh.ellipsoid = new Vector3(0.8, 0.4, 1.6);
    this.mesh.ellipsoidOffset = new Vector3(0, 0.4, 0);
    
    const mat = new StandardMaterial("carMat", scene);
    mat.diffuseColor = Color3.FromHexString("#2563eb"); // Blue-600
    mat.specularPower = 64;
    this.mesh.material = mat;

    // Hide the collider box mesh and load the detailed GLB model
    this.mesh.isVisible = false;

    SceneLoader.ImportMeshAsync("", "./assets/Models/", "car_1.glb", scene).then((result) => {
      const rootMesh = result.meshes[0] as Mesh;
      this.modelRoot = rootMesh;
      this.modelWrapper = new Mesh("carModelWrapper", scene);
      this.modelWrapper.position = this.mesh.position.add(new Vector3(0, -0.4, 0));
      this.modelRoot.parent = this.modelWrapper;
      this.modelRoot.position = Vector3.Zero();
      this.modelRoot.rotate(new Vector3(1, 0, 0), -Math.PI / 2, Space.LOCAL);
      this.modelRoot.rotate(new Vector3(0, 1, 0), -Math.PI / 2, Space.WORLD);
      
      const carMaterial = new StandardMaterial("carModelMat", scene);
      const carTexture = new Texture("./assets/Textures/Car Texture 1.png", scene, false, false);
      carMaterial.diffuseTexture = carTexture;
      carMaterial.specularColor = new Color3(0, 0, 0);
      
      // Ensure the child meshes don't block collisions and apply the material
      result.meshes.forEach(m => {
        m.checkCollisions = false;
        m.material = carMaterial;
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
        } else {
          const nameLower = collidedMesh.name.toLowerCase();
          if (!nameLower.includes("ground") && !nameLower.includes("road") && !nameLower.includes("sidewalk")) {
            // Solid obstacle (building, permanent fence, etc.)
            if (Math.abs(this.speed) > 2.0) {
              const sparkPos = this.mesh.position.clone();
              const forwardDir = this.forward;
              if (this.speed > 0) {
                sparkPos.addInPlace(forwardDir.scale(1.6)); // Front of the car
              } else {
                sparkPos.addInPlace(forwardDir.scale(-1.6)); // Rear of the car
              }
              this.effectManager.createSparks(sparkPos);
            }
            // Bounce back slightly and reduce/reverse speed to prevent clipping through the wall.
            // Also reflect the full velocity vector (not just the scalar forward speed): update()
            // derives next frame's lateral (sideways) velocity from this.velocity, so an angled/
            // glancing hit that was previously only dampened by driftFactor (4%/frame) would keep
            // sliding the car into the wall every frame — this is what caused the car to get stuck.
            this.speed = -this.speed * 0.3;
            this.velocity = this.velocity.scale(-0.3);
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

  public currentThrottle: number = 0;

  applyInputs(throttle: number, steering: number, dt: number) {
    if (this.isCrashed) return;

    this.currentThrottle = throttle;
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
        this.effectManager.updateSkidSound(false);
        this.effectManager.updateEngineSound(0, 0, true);
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

    // Dynamic terrain height and slope orientation
    const terrainInfo = getTerrainSlopeAngles(this.mesh.position.x, this.mesh.position.z, this.heading);
    this.mesh.position.y = terrainInfo.height + 0.4;

    const targetRotation = Quaternion.RotationYawPitchRoll(this.heading, -terrainInfo.pitch, terrainInfo.roll);
    if (this.mesh.rotationQuaternion) {
      Quaternion.SlerpToRef(this.mesh.rotationQuaternion, targetRotation, Math.min(1, dt * 15), this.mesh.rotationQuaternion);
    } else {
      this.mesh.rotationQuaternion = targetRotation;
    }

    if (this.modelWrapper) {
      this.modelWrapper.position.copyFrom(this.mesh.position).addInPlace(new Vector3(0, -0.4, 0));
      if (this.mesh.rotationQuaternion) {
        this.modelWrapper.rotationQuaternion = this.mesh.rotationQuaternion;
      }
    }

    // Handle trails & effects
    const lateralSpeed = lateralVelocity.length();
    this.isDrifting = lateralSpeed > 5.0 && Math.abs(this.speed) > 5;
    const isDrifting = this.isDrifting;
    
    const driftIntensity = Math.min(1.0, Math.max(0, (lateralSpeed - 5.0) / 10.0));
    const speedRatio = Math.min(1.0, Math.abs(this.speed) / this.maxSpeed);

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

    this.effectManager.updateSkidSound(isDrifting, driftIntensity, speedRatio);
    this.effectManager.updateEngineSound(speedRatio, this.currentThrottle, this.isCrashed);
  }

  unstuck() {
    if (this.isCrashed) return;

    // Find nearest even chunk index for a guaranteed road intersection
    const chunkSize = 50;
    const currentCx = Math.floor(this.mesh.position.x / chunkSize);
    const currentCz = Math.floor(this.mesh.position.z / chunkSize);

    // Round to nearest even index
    const cx = Math.round(currentCx / 2) * 2;
    const cz = Math.round(currentCz / 2) * 2;

    // Center of this chunk is guaranteed to be an empty road intersection
    const targetX = cx * chunkSize + chunkSize / 2;
    const targetZ = cz * chunkSize + chunkSize / 2;

    // Teleport the car to safety (slightly elevated to prevent z-clipping)
    const targetY = getTerrainHeight(targetX, targetZ) + 0.4;
    this.mesh.position.set(targetX, targetY, targetZ);
    this.velocity = Vector3.Zero();
    this.speed = 0;
    
    // Create dust effect to indicate teleportation
    this.effectManager.createDust(this.mesh.position);
  }

  crash() {
    this.isCrashed = true;
    this.effectManager.updateSkidSound(false);
    this.effectManager.updateEngineSound(0, 0, true);
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
