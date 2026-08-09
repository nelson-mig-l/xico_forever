import { Car } from "./Car";

export class CarController {
  private keys: Set<string> = new Set();
  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.key.toLowerCase());
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  constructor(private car: Car) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  update(dt: number) {
    let throttle = 0;
    let steering = 0;

    if (this.keys.has("w") || this.keys.has("arrowup")) throttle = 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) throttle = -1;
    
    if (this.keys.has("a") || this.keys.has("arrowleft")) steering = -1;
    if (this.keys.has("d") || this.keys.has("arrowright")) steering = 1;

    if (this.keys.has("r")) {
      this.keys.delete("r");
      this.car.unstuck();
    }

    this.car.applyInputs(throttle, steering, dt);
  }
}
