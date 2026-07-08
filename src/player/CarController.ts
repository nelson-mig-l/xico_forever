import { Car } from "./Car";

export class CarController {
  private keys: Set<string> = new Set();

  constructor(private car: Car) {
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  update(dt: number) {
    let throttle = 0;
    let steering = 0;

    if (this.keys.has("w") || this.keys.has("arrowup")) throttle = 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) throttle = -1;
    
    if (this.keys.has("a") || this.keys.has("arrowleft")) steering = -1;
    if (this.keys.has("d") || this.keys.has("arrowright")) steering = 1;

    this.car.applyInputs(throttle, steering, dt);
  }
}
