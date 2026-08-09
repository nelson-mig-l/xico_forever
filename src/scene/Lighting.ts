import { Scene, HemisphericLight, Vector3, DirectionalLight, ShadowGenerator, Color3 } from "@babylonjs/core";

export class Lighting {
  public dirLight: DirectionalLight;
  public shadowGenerator: ShadowGenerator;

  constructor(public scene: Scene) {
    const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.5;
    hemiLight.specular = new Color3(0, 0, 0);

    this.dirLight = new DirectionalLight("dirLight", new Vector3(-1, -2, -1), scene);
    this.dirLight.position = new Vector3(20, 40, 20);
    this.dirLight.intensity = 0.8;

    this.shadowGenerator = new ShadowGenerator(1024, this.dirLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 32;
  }
}
