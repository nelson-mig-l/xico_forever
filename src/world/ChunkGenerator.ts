import { Scene, MeshBuilder, Vector3, StandardMaterial, Color3, Mesh } from "@babylonjs/core";
import { Car } from "../player/Car";

export class ChunkGenerator {
  private chunkSize = 50;
  private renderDistance = 2; // chunks
  private activeChunks: Map<string, Mesh> = new Map();
  private groundMaterial: StandardMaterial;
  private propMaterial: StandardMaterial;

  constructor(public scene: Scene, public target: Car) {
    this.groundMaterial = new StandardMaterial("groundMat", scene);
    this.groundMaterial.diffuseColor = new Color3(0.18, 0.20, 0.22); // Asphalt
    
    this.propMaterial = new StandardMaterial("propMat", scene);
    this.propMaterial.diffuseColor = new Color3(0.6, 0.6, 0.65);
  }

  update() {
    const targetPos = this.target.mesh.position;
    const currentChunkX = Math.floor(targetPos.x / this.chunkSize);
    const currentChunkZ = Math.floor(targetPos.z / this.chunkSize);

    const neededChunks = new Set<string>();

    for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
      for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
        const cx = currentChunkX + x;
        const cz = currentChunkZ + z;
        const key = `${cx},${cz}`;
        neededChunks.add(key);

        if (!this.activeChunks.has(key)) {
          this.generateChunk(cx, cz, key);
        }
      }
    }

    for (const [key, mesh] of this.activeChunks.entries()) {
      if (!neededChunks.has(key)) {
        mesh.dispose();
        this.activeChunks.delete(key);
      }
    }
  }

  generateChunk(cx: number, cz: number, key: string) {
    const chunkNode = new Mesh(`chunk_${key}`, this.scene);
    
    const ground = MeshBuilder.CreateGround(`ground_${key}`, { width: this.chunkSize, height: this.chunkSize }, this.scene);
    ground.position.set(cx * this.chunkSize + this.chunkSize/2, 0, cz * this.chunkSize + this.chunkSize/2);
    ground.material = this.groundMaterial;
    ground.parent = chunkNode;
    ground.checkCollisions = true;

    const propMeshes: Mesh[] = [];
    
    let seed = cx * 1000 + cz;
    const random = () => {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    const numProps = Math.floor(random() * 8) + 2;
    for (let i = 0; i < numProps; i++) {
        // Leave center chunk clear for initial spawn
        if (cx === 0 && cz === 0 && i < 4) continue;

        const w = 2 + random() * 6;
        const d = 2 + random() * 6;
        const h = 2 + random() * 8;
        
        const px = cx * this.chunkSize + random() * this.chunkSize;
        const pz = cz * this.chunkSize + random() * this.chunkSize;
        
        const prop = MeshBuilder.CreateBox("prop", { width: w, height: h, depth: d }, this.scene);
        prop.position.set(px, h/2, pz);
        prop.checkCollisions = true;
        
        propMeshes.push(prop);
    }

    if (propMeshes.length > 0) {
        const mergedProp = Mesh.MergeMeshes(propMeshes, true, true, undefined, false, true);
        if (mergedProp) {
            mergedProp.material = this.propMaterial;
            mergedProp.parent = chunkNode;
            mergedProp.checkCollisions = true;
        }
    }

    this.activeChunks.set(key, chunkNode);
  }
}
