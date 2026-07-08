import { Scene, Vector3, TargetCamera, UniversalCamera } from "@babylonjs/core";
import { Car } from "../player/Car";

export class Camera {
  public camera: UniversalCamera;
  private offset = new Vector3(0, 35, -25);
  
  constructor(public scene: Scene, public target: Car) {
    // Initialize with the offset position so it doesn't look at its own position
    this.camera = new UniversalCamera("mainCamera", this.offset.clone(), scene);
    this.camera.setTarget(Vector3.Zero());
  }

  update(dt: number) {
    const targetPos = this.target.mesh.position.clone();
    
    // Smooth follow
    const desiredPos = targetPos.add(this.offset);
    this.camera.position = Vector3.Lerp(this.camera.position, desiredPos, dt * 5);
    
    // Look slightly ahead of car
    const lookAtPos = targetPos.add(this.target.forward.scale(5));
    this.camera.setTarget(lookAtPos);
  }
}
