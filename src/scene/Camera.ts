import { Scene, Vector3, TargetCamera, UniversalCamera } from "@babylonjs/core";
import { Car } from "../player/Car";

export class Camera {
  public camera: UniversalCamera;
  private height = 35;
  private distanceBehind = 25;
  
  constructor(public scene: Scene, public target: Car) {
    const initialPos = new Vector3(0, this.height, -this.distanceBehind);
    this.camera = new UniversalCamera("mainCamera", initialPos, scene);
    this.camera.setTarget(Vector3.Zero());
  }

  update(dt: number) {
    const targetPos = this.target.mesh.position.clone();
    
    // Calculate desired position: behind the car and up
    const backward = this.target.forward.scale(-this.distanceBehind);
    const desiredPos = targetPos.add(backward);
    desiredPos.y += this.height;

    // Smooth follow
    this.camera.position = Vector3.Lerp(this.camera.position, desiredPos, dt * 5);
    
    // Look slightly ahead of car
    const lookAtPos = targetPos.add(this.target.forward.scale(5));
    this.camera.setTarget(lookAtPos);
  }
}
