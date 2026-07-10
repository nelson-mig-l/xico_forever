import { Scene, MeshBuilder, Vector3, StandardMaterial, Color3, Mesh } from "@babylonjs/core";
import { Car } from "../player/Car";

export class ChunkGenerator {
  private chunkSize = 50;
  private renderDistance = 2; // chunks
  private activeChunks: Map<string, Mesh> = new Map();
  private materials: Record<string, StandardMaterial> = {};

  constructor(public scene: Scene, public target: Car) {
    const mat = (name: string, hex: string, emissive?: string) => {
        const m = new StandardMaterial(name, scene);
        m.diffuseColor = Color3.FromHexString(hex);
        if (emissive) m.emissiveColor = Color3.FromHexString(emissive);
        return m;
    };

    this.materials.ground = mat("groundMat", "#2e3338");
    this.materials.building = mat("buildingMat", "#9ca3af");
    this.materials.trunk = mat("trunkMat", "#78350f");
    this.materials.leaves = mat("leavesMat", "#166534");
    this.materials.metal = mat("metalMat", "#4b5563");
    this.materials.light = mat("lightMat", "#fef08a", "#fef08a");
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
    ground.material = this.materials.ground;
    ground.parent = chunkNode;
    ground.checkCollisions = true;

    const meshes: Record<string, Mesh[]> = {
        building: []
    };
    
    let seed = cx * 1000 + cz;
    const random = () => {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    const numProps = Math.floor(random() * 20) + 15;
    for (let i = 0; i < numProps; i++) {
        // Leave center chunk clear for initial spawn
        if (cx === 0 && cz === 0 && i < 20) continue;

        const typeRand = random();
        
        const px = cx * this.chunkSize + random() * this.chunkSize;
        const pz = cz * this.chunkSize + random() * this.chunkSize;

        if (typeRand < 0.15) {
            // Building
            const w = 4 + random() * 8;
            const d = 4 + random() * 8;
            const h = 5 + random() * 15;
            const building = MeshBuilder.CreateBox("building", { width: w, height: h, depth: d }, this.scene);
            building.position.set(px, h/2, pz);
            meshes.building.push(building);
        } else if (typeRand < 0.6) {
            // Tree
            const treeRoot = new Mesh("destructible_tree_" + i, this.scene);
            treeRoot.position.set(px, 0, pz);
            treeRoot.parent = chunkNode;
            
            const trunkH = 1.5 + random() * 2;
            const trunk = MeshBuilder.CreateCylinder("destructible_tree_" + i, { height: trunkH, diameter: 0.6 }, this.scene);
            trunk.position.set(0, trunkH/2, 0);
            trunk.material = this.materials.trunk;
            trunk.parent = treeRoot;
            trunk.checkCollisions = true;

            const leavesSize = 2.5 + random() * 2.5;
            const leaves = MeshBuilder.CreateSphere("leaves", { diameter: leavesSize, segments: 8 }, this.scene);
            leaves.position.set(0, trunkH + leavesSize/2 - 0.5, 0);
            leaves.material = this.materials.leaves;
            leaves.parent = treeRoot;
        } else if (typeRand < 0.85) {
            // Lamp post
            const postRoot = new Mesh("destructible_lamppost_" + i, this.scene);
            postRoot.position.set(px, 0, pz);
            postRoot.parent = chunkNode;

            const height = 6;
            const pole = MeshBuilder.CreateBox("destructible_lamppost_" + i, { width: 0.2, height: height, depth: 0.2 }, this.scene);
            pole.position.set(0, height/2, 0);
            pole.material = this.materials.metal;
            pole.parent = postRoot;
            pole.checkCollisions = true;

            const head = MeshBuilder.CreateBox("head", { width: 1.5, height: 0.2, depth: 0.4 }, this.scene);
            head.position.set(0.6, height, 0);
            head.material = this.materials.metal;
            head.parent = postRoot;

            const bulb = MeshBuilder.CreateBox("bulb", { width: 1.3, height: 0.1, depth: 0.2 }, this.scene);
            bulb.position.set(0.6, height - 0.1, 0);
            bulb.material = this.materials.light;
            bulb.parent = postRoot;
        } else {
            // Fence
            const length = 4 + random() * 6;
            const angle = random() > 0.5 ? 0 : Math.PI / 2;
            const fenceH = 1.2;
            
            const fence = MeshBuilder.CreateBox("destructible_fence_" + i, { width: length, height: fenceH, depth: 0.2 }, this.scene);
            fence.position.set(px, fenceH/2, pz);
            fence.rotation.y = angle;
            fence.material = this.materials.trunk;
            fence.parent = chunkNode;
            fence.checkCollisions = true;
        }
    }

    if (meshes.building.length > 0) {
        const merged = Mesh.MergeMeshes(meshes.building, true, true, undefined, false, true);
        if (merged) {
            merged.name = `prop_building_${key}`;
            merged.material = this.materials.building;
            merged.parent = chunkNode;
            merged.checkCollisions = true;
        }
    }

    this.activeChunks.set(key, chunkNode);
  }
}
