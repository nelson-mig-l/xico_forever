import { Scene, MeshBuilder, Vector3, Quaternion, Mesh, StandardMaterial, Color3 } from "@babylonjs/core";

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

  constructor(public scene: Scene) {
    this.mesh = MeshBuilder.CreateBox("car", { width: 1.6, height: 0.8, depth: 3.2 }, scene);
    this.mesh.position.y = 0.4;
    
    this.mesh.checkCollisions = true;
    this.mesh.ellipsoid = new Vector3(0.8, 0.4, 1.6);
    this.mesh.ellipsoidOffset = new Vector3(0, 0.4, 0);
    
    const mat = new StandardMaterial("carMat", scene);
    mat.diffuseColor = Color3.FromHexString("#2563eb"); // Blue-600
    mat.specularPower = 64;
    this.mesh.material = mat;

    this.mesh.onCollideObservable.add((collidedMesh) => {
      if (collidedMesh && !collidedMesh.isDisposed()) {
        if (collidedMesh.name.includes("destructible")) {
          if (collidedMesh.parent && collidedMesh.parent.name.includes("destructible")) {
            if (!collidedMesh.parent.isDisposed()) collidedMesh.parent.dispose();
          } else {
            collidedMesh.dispose();
          }
        }
      }
    });
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
    if (this.isCrashed) return;

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
  }

  crash() {
    this.isCrashed = true;
    const mat = this.mesh.material as StandardMaterial;
    mat.diffuseColor = new Color3(0.1, 0.1, 0.1);
  }
}
