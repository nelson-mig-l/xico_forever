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

    // Road materials
    this.materials.asphalt = mat("asphaltMat", "#18181b"); // Slate/charcoal asphalt
    this.materials.roadLineYellow = mat("roadLineYellowMat", "#f59e0b", "#f59e0b"); // Yellow center line
    this.materials.roadLineWhite = mat("roadLineWhiteMat", "#f3f4f6"); // White edge lines
    this.materials.sidewalk = mat("sidewalkMat", "#4b5563"); // Concrete gray sidewalk
  }

  private createLampPost(parent: Mesh, rotationY: number) {
    const height = 6;
    const pole = MeshBuilder.CreateBox("destructible_lamppost", { width: 0.2, height: height, depth: 0.2 }, this.scene);
    pole.position.set(0, height / 2, 0);
    pole.material = this.materials.metal;
    pole.parent = parent;
    pole.checkCollisions = true;

    const head = MeshBuilder.CreateBox("head", { width: 1.5, height: 0.2, depth: 0.4 }, this.scene);
    head.position.set(0.6, height, 0);
    head.material = this.materials.metal;
    head.parent = parent;

    const bulb = MeshBuilder.CreateBox("bulb", { width: 1.3, height: 0.1, depth: 0.2 }, this.scene);
    bulb.position.set(0.6, height - 0.1, 0);
    bulb.material = this.materials.light;
    bulb.parent = parent;

    parent.rotation.y = rotationY;
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
    
    // Draw base ground
    const ground = MeshBuilder.CreateGround(`ground_${key}`, { width: this.chunkSize, height: this.chunkSize }, this.scene);
    ground.position.set(cx * this.chunkSize + this.chunkSize/2, 0, cz * this.chunkSize + this.chunkSize/2);
    ground.material = this.materials.ground;
    ground.parent = chunkNode;
    ground.checkCollisions = true;

    const roadY = 0.005; // Slightly above ground to prevent z-fighting
    const lineY = 0.01;  // Slightly above road

    const hasNS = (Math.abs(cx) % 2 === 0);
    const hasEW = (Math.abs(cz) % 2 === 0);

    const centerX = cx * this.chunkSize + this.chunkSize / 2;
    const centerZ = cz * this.chunkSize + this.chunkSize / 2;
    
    const roadWidth = 12;
    const halfW = roadWidth / 2;
    const sidewalkWidth = 1.5;

    // Helper to check if a position overlaps with roads/sidewalks (plus buffer)
    const isOnRoadOrSidewalk = (px: number, pz: number): boolean => {
        const lx = px - cx * this.chunkSize;
        const lz = pz - cz * this.chunkSize;
        const excludeHalfWidth = halfW + sidewalkWidth + 1.5; // with buffer
        
        const localCenter = this.chunkSize / 2;

        if (hasNS && Math.abs(lx - localCenter) < excludeHalfWidth) {
            return true;
        }
        if (hasEW && Math.abs(lz - localCenter) < excludeHalfWidth) {
            return true;
        }
        return false;
    };

    // Helper to draw dashed lines for center lanes
    const createDashedLine = (startX: number, startZ: number, endX: number, endZ: number, isVertical: boolean) => {
        const dashLength = 1.5;
        const gap = 1.5;
        const step = dashLength + gap;
        const dashWidth = 0.15;

        if (isVertical) {
            for (let z = startZ; z < endZ; z += step) {
                const length = Math.min(dashLength, endZ - z);
                if (length <= 0.1) break;
                const dash = MeshBuilder.CreateGround("dash", { width: dashWidth, height: length }, this.scene);
                dash.position.set(startX, lineY, z + length / 2);
                dash.material = this.materials.roadLineYellow;
                dash.parent = chunkNode;
                dash.checkCollisions = false;
            }
        } else {
            for (let x = startX; x < endX; x += step) {
                const length = Math.min(dashLength, endX - x);
                if (length <= 0.1) break;
                const dash = MeshBuilder.CreateGround("dash", { width: length, height: dashWidth }, this.scene);
                dash.position.set(x + length / 2, lineY, endZ);
                dash.material = this.materials.roadLineYellow;
                dash.parent = chunkNode;
                dash.checkCollisions = false;
            }
        }
    };

    // --- DRAW N-S ROAD AND SIDEWALKS ---
    if (hasNS) {
        // Road surface
        const nsRoad = MeshBuilder.CreateGround(`ns_road_${key}`, { width: roadWidth, height: this.chunkSize }, this.scene);
        nsRoad.position.set(centerX, roadY, centerZ);
        nsRoad.material = this.materials.asphalt;
        nsRoad.parent = chunkNode;
        nsRoad.checkCollisions = false;
        nsRoad.receiveShadows = true;

        // Sidewalk Left
        const nsSidewalkLeft = MeshBuilder.CreateGround(`ns_sidewalk_l_${key}`, { width: sidewalkWidth, height: this.chunkSize }, this.scene);
        nsSidewalkLeft.position.set(centerX - halfW - sidewalkWidth / 2, roadY - 0.001, centerZ);
        nsSidewalkLeft.material = this.materials.sidewalk;
        nsSidewalkLeft.parent = chunkNode;
        nsSidewalkLeft.checkCollisions = false;

        // Sidewalk Right
        const nsSidewalkRight = MeshBuilder.CreateGround(`ns_sidewalk_r_${key}`, { width: sidewalkWidth, height: this.chunkSize }, this.scene);
        nsSidewalkRight.position.set(centerX + halfW + sidewalkWidth / 2, roadY - 0.001, centerZ);
        nsSidewalkRight.material = this.materials.sidewalk;
        nsSidewalkRight.parent = chunkNode;
        nsSidewalkRight.checkCollisions = false;

        // Center dashed yellow and solid white lines
        if (hasEW) {
            // Intersection: stop lines before the middle square
            createDashedLine(centerX, cz * this.chunkSize, centerX, centerZ - halfW, true);
            createDashedLine(centerX, centerZ + halfW, centerX, (cz + 1) * this.chunkSize, true);

            // Left white lines
            const wl1 = MeshBuilder.CreateGround("wl", { width: 0.15, height: this.chunkSize/2 - halfW }, this.scene);
            wl1.position.set(centerX - halfW, lineY, cz * this.chunkSize + (this.chunkSize/2 - halfW)/2);
            wl1.material = this.materials.roadLineWhite;
            wl1.parent = chunkNode;
            wl1.checkCollisions = false;

            const wl2 = MeshBuilder.CreateGround("wl", { width: 0.15, height: this.chunkSize/2 - halfW }, this.scene);
            wl2.position.set(centerX - halfW, lineY, centerZ + halfW + (this.chunkSize/2 - halfW)/2);
            wl2.material = this.materials.roadLineWhite;
            wl2.parent = chunkNode;
            wl2.checkCollisions = false;

            // Right white lines
            const wl3 = MeshBuilder.CreateGround("wl", { width: 0.15, height: this.chunkSize/2 - halfW }, this.scene);
            wl3.position.set(centerX + halfW, lineY, cz * this.chunkSize + (this.chunkSize/2 - halfW)/2);
            wl3.material = this.materials.roadLineWhite;
            wl3.parent = chunkNode;
            wl3.checkCollisions = false;

            const wl4 = MeshBuilder.CreateGround("wl", { width: 0.15, height: this.chunkSize/2 - halfW }, this.scene);
            wl4.position.set(centerX + halfW, lineY, centerZ + halfW + (this.chunkSize/2 - halfW)/2);
            wl4.material = this.materials.roadLineWhite;
            wl4.parent = chunkNode;
            wl4.checkCollisions = false;
        } else {
            // Straight road: continuous lines
            createDashedLine(centerX, cz * this.chunkSize, centerX, (cz + 1) * this.chunkSize, true);

            const wlLeft = MeshBuilder.CreateGround("wl", { width: 0.15, height: this.chunkSize }, this.scene);
            wlLeft.position.set(centerX - halfW, lineY, centerZ);
            wlLeft.material = this.materials.roadLineWhite;
            wlLeft.parent = chunkNode;
            wlLeft.checkCollisions = false;

            const wlRight = MeshBuilder.CreateGround("wl", { width: 0.15, height: this.chunkSize }, this.scene);
            wlRight.position.set(centerX + halfW, lineY, centerZ);
            wlRight.material = this.materials.roadLineWhite;
            wlRight.parent = chunkNode;
            wlRight.checkCollisions = false;
        }

        // Programmatic Streetlights along sidewalks
        const zCoords = [cz * this.chunkSize + 12.5, cz * this.chunkSize + 37.5];
        zCoords.forEach((pz, idx) => {
            const postL = new Mesh(`lamp_ns_l_${idx}`, this.scene);
            postL.position.set(centerX - halfW - 0.75, 0, pz);
            postL.parent = chunkNode;
            this.createLampPost(postL, 0);

            const postR = new Mesh(`lamp_ns_r_${idx}`, this.scene);
            postR.position.set(centerX + halfW + 0.75, 0, pz);
            postR.parent = chunkNode;
            this.createLampPost(postR, Math.PI);
        });
    }

    // --- DRAW E-W ROAD AND SIDEWALKS ---
    if (hasEW) {
        // Road surface
        const ewRoad = MeshBuilder.CreateGround(`ew_road_${key}`, { width: this.chunkSize, height: roadWidth }, this.scene);
        ewRoad.position.set(centerX, roadY + 0.001, centerZ); // slightly higher to prevent z-fighting with overlapping N-S road
        ewRoad.material = this.materials.asphalt;
        ewRoad.parent = chunkNode;
        ewRoad.checkCollisions = false;
        ewRoad.receiveShadows = true;

        // Sidewalk Bottom
        const ewSidewalkBottom = MeshBuilder.CreateGround(`ew_sidewalk_b_${key}`, { width: this.chunkSize, height: sidewalkWidth }, this.scene);
        ewSidewalkBottom.position.set(centerX, roadY - 0.001, centerZ - halfW - sidewalkWidth / 2);
        ewSidewalkBottom.material = this.materials.sidewalk;
        ewSidewalkBottom.parent = chunkNode;
        ewSidewalkBottom.checkCollisions = false;

        // Sidewalk Top
        const ewSidewalkTop = MeshBuilder.CreateGround(`ew_sidewalk_t_${key}`, { width: this.chunkSize, height: sidewalkWidth }, this.scene);
        ewSidewalkTop.position.set(centerX, roadY - 0.001, centerZ + halfW + sidewalkWidth / 2);
        ewSidewalkTop.material = this.materials.sidewalk;
        ewSidewalkTop.parent = chunkNode;
        ewSidewalkTop.checkCollisions = false;

        // Center dashed yellow and solid white lines
        if (hasNS) {
            // Intersection: stop lines before the middle square
            createDashedLine(cx * this.chunkSize, centerZ, centerX - halfW, centerZ, false);
            createDashedLine(centerX + halfW, centerZ, (cx + 1) * this.chunkSize, centerZ, false);

            // Bottom white lines
            const wl1 = MeshBuilder.CreateGround("wl", { width: this.chunkSize/2 - halfW, height: 0.15 }, this.scene);
            wl1.position.set(cx * this.chunkSize + (this.chunkSize/2 - halfW)/2, lineY + 0.002, centerZ - halfW);
            wl1.material = this.materials.roadLineWhite;
            wl1.parent = chunkNode;
            wl1.checkCollisions = false;

            const wl2 = MeshBuilder.CreateGround("wl", { width: this.chunkSize/2 - halfW, height: 0.15 }, this.scene);
            wl2.position.set(centerX + halfW + (this.chunkSize/2 - halfW)/2, lineY + 0.002, centerZ - halfW);
            wl2.material = this.materials.roadLineWhite;
            wl2.parent = chunkNode;
            wl2.checkCollisions = false;

            // Top white lines
            const wl3 = MeshBuilder.CreateGround("wl", { width: this.chunkSize/2 - halfW, height: 0.15 }, this.scene);
            wl3.position.set(cx * this.chunkSize + (this.chunkSize/2 - halfW)/2, lineY + 0.002, centerZ + halfW);
            wl3.material = this.materials.roadLineWhite;
            wl3.parent = chunkNode;
            wl3.checkCollisions = false;

            const wl4 = MeshBuilder.CreateGround("wl", { width: this.chunkSize/2 - halfW, height: 0.15 }, this.scene);
            wl4.position.set(centerX + halfW + (this.chunkSize/2 - halfW)/2, lineY + 0.002, centerZ + halfW);
            wl4.material = this.materials.roadLineWhite;
            wl4.parent = chunkNode;
            wl4.checkCollisions = false;
        } else {
            // Straight road: continuous lines
            createDashedLine(cx * this.chunkSize, centerZ, (cx + 1) * this.chunkSize, centerZ, false);

            const wlBottom = MeshBuilder.CreateGround("wl", { width: this.chunkSize, height: 0.15 }, this.scene);
            wlBottom.position.set(centerX, lineY + 0.002, centerZ - halfW);
            wlBottom.material = this.materials.roadLineWhite;
            wlBottom.parent = chunkNode;
            wlBottom.checkCollisions = false;

            const wlTop = MeshBuilder.CreateGround("wl", { width: this.chunkSize, height: 0.15 }, this.scene);
            wlTop.position.set(centerX, lineY + 0.002, centerZ + halfW);
            wlTop.material = this.materials.roadLineWhite;
            wlTop.parent = chunkNode;
            wlTop.checkCollisions = false;
        }

        // Programmatic Streetlights along sidewalks (only if not an intersection to avoid duplicates)
        if (!hasNS) {
            const xCoords = [cx * this.chunkSize + 12.5, cx * this.chunkSize + 37.5];
            xCoords.forEach((px, idx) => {
                const postB = new Mesh(`lamp_ew_b_${idx}`, this.scene);
                postB.position.set(px, 0, centerZ - halfW - 0.75);
                postB.parent = chunkNode;
                this.createLampPost(postB, Math.PI / 2);

                const postT = new Mesh(`lamp_ew_t_${idx}`, this.scene);
                postT.position.set(px, 0, centerZ + halfW + 0.75);
                postT.parent = chunkNode;
                this.createLampPost(postT, -Math.PI / 2);
            });
        }
    }

    // --- PROCEDURAL PROP PLACEMENT ---
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
        
        let px = 0;
        let pz = 0;
        let found = false;

        // Try to find a position not overlapping with roads or sidewalks
        for (let retry = 0; retry < 5; retry++) {
            px = cx * this.chunkSize + random() * this.chunkSize;
            pz = cz * this.chunkSize + random() * this.chunkSize;
            if (!isOnRoadOrSidewalk(px, pz)) {
                found = true;
                break;
            }
        }

        if (!found) continue;

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
            // Only spawn random lamp post if no roads are in this chunk (to provide ambient light)
            if (!hasNS && !hasEW) {
                const postRoot = new Mesh("destructible_lamppost_" + i, this.scene);
                postRoot.position.set(px, 0, pz);
                postRoot.parent = chunkNode;
                this.createLampPost(postRoot, random() * Math.PI * 2);
            }
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
