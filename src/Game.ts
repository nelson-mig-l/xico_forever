import { Engine, Scene, Color4 } from "@babylonjs/core";
import { World } from "./scene/World";
import { Camera } from "./scene/Camera";
import { Lighting } from "./scene/Lighting";
import { Car } from "./player/Car";
import { CarController } from "./player/CarController";
import { PoliceManager } from "./ai/PoliceManager";
import { ChunkGenerator } from "./world/ChunkGenerator";
import { EffectManager } from "./effects/EffectManager";

export class Game {
  public engine: Engine;
  public scene: Scene;
  public world: World;
  public camera: Camera;
  public lighting: Lighting;
  public car: Car;
  public carController: CarController;
  public policeManager: PoliceManager;
  public chunkGenerator: ChunkGenerator;
  public effectManager: EffectManager;

  public score: number = 0;
  public isGameOver: boolean = false;

  constructor(
    public canvas: HTMLCanvasElement, 
    private setScore: (
      score: number, 
      policeCount: number, 
      destroyedCount: number, 
      policeData: {id: number, health: number}[], 
      lostCount: number,
      speed: number,
      maxSpeed: number,
      isDrifting: boolean
    ) => void,
    private setGameOver: (state: boolean, finalScore: number) => void
  ) {
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.12, 0.15, 0.18, 1);
    this.scene.collisionsEnabled = true;

    this.effectManager = new EffectManager(this.scene);
    this.world = new World(this.scene);
    this.lighting = new Lighting(this.scene);
    this.car = new Car(this.scene, this.effectManager);
    this.carController = new CarController(this.car);
    this.camera = new Camera(this.scene, this.car);
    this.policeManager = new PoliceManager(this.scene, this.car, this);
    this.chunkGenerator = new ChunkGenerator(this.scene, this.car);

    this.scene.onBeforeRenderObservable.add(() => {
      if (!this.isGameOver) {
        const dt = this.engine.getDeltaTime() / 1000;
        // Cap dt to prevent physics explosions on lag spikes
        const safeDt = Math.min(dt, 0.1);
        this.update(safeDt);
      }
    });

    this.boundResize = () => {
      this.engine.resize();
    };
    window.addEventListener("resize", this.boundResize);
  }

  private boundResize: () => void;

  start() {
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  update(dt: number) {
    this.carController.update(dt);
    this.car.update(dt);
    this.camera.update(dt);
    this.policeManager.update(dt);
    this.chunkGenerator.update();

    this.score += dt * 10;
    this.setScore(
      this.score, 
      this.policeManager.policeCars.length, 
      this.policeManager.destroyedCount,
      this.policeManager.policeCars.map(p => ({ id: p.id, health: p.health })),
      this.policeManager.lostCount,
      this.car.speed,
      this.car.maxSpeed,
      this.car.isDrifting
    );
  }

  gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.setGameOver(true, this.score);
    this.car.crash();
  }

  dispose() {
    this.carController.dispose();
    window.removeEventListener("resize", this.boundResize);
    this.scene.dispose();
    this.engine.dispose();
  }
}
