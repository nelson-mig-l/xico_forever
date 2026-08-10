import { Scene, MeshBuilder, Vector3, StandardMaterial, Color3, Mesh, TransformNode, AbstractMesh, SceneLoader, Texture } from "@babylonjs/core";
import { GLTFFileLoader } from "@babylonjs/loaders/glTF";
import { Car } from "../player/Car";

// Disable loading GLTF/GLB internal materials/textures globally to avoid CSP/blob URL issues in the sandbox iframe
// We use a getter/setter on GLTFFileLoader.prototype to ensure that even when constructors try to set skipMaterials = false, it remains true.
Object.defineProperty(GLTFFileLoader.prototype, "skipMaterials", {
  get() {
    return true;
  },
  set() {
    // Ignore any attempts to override this to false
  },
  configurable: true,
  enumerable: true
});

export class ChunkGenerator {
  private chunkSize = 50;
  private renderDistance = 2; // chunks
  private activeChunks: Map<string, TransformNode> = new Map();
  private materials: Record<string, StandardMaterial> = {};
  private isDisposed = false;

  private buildingTemplates: Map<string, Mesh> = new Map();
  private treeTemplate!: TransformNode;
  private lampPostTemplate!: TransformNode;
  private fenceTemplate!: Mesh;
  private standardBuildingTemplates: string[] = [
    "low-detail-building-a",
    "low-detail-building-b",
    "low-detail-building-c",
    "low-detail-building-d",
    "low-detail-building-e",
    "low-detail-building-f",
    "low-detail-building-g",
    "low-detail-building-h",
    "low-detail-building-i",
    "low-detail-building-j",
    "low-detail-building-k",
    "low-detail-building-l",
    "low-detail-building-m",
    "low-detail-building-n"
  ];
  private wideBuildingTemplates: string[] = [
    "low-detail-building-wide-a",
    "low-detail-building-wide-b"
  ];

  constructor(public scene: Scene, public target: Car) {
    const mat = (name: string, hex: string, emissive?: string) => {
        const m = new StandardMaterial(name, scene);
        m.diffuseColor = Color3.FromHexString(hex);
        if (emissive) m.emissiveColor = Color3.FromHexString(emissive);
        return m;
    };

    this.materials.ground = mat("groundMat", "#2e3338");
    
    // Set up building material with texture mapping
    const buildingMat = new StandardMaterial("buildingMat", this.scene);
    buildingMat.diffuseColor = Color3.FromHexString("#ffffff"); // use full brightness for texture mapping
    buildingMat.diffuseTexture = new Texture("./assets/Buildings/Textures/colormap.png", this.scene, false, false);
    buildingMat.specularColor = new Color3(0, 0, 0);
    this.materials.building = buildingMat;

    this.materials.trunk = mat("trunkMat", "#78350f");
    this.materials.leaves = mat("leavesMat", "#166534");
    this.materials.metal = mat("metalMat", "#4b5563");
    this.materials.light = mat("lightMat", "#fef08a", "#fef08a");

    // Road materials
    this.materials.asphalt = mat("asphaltMat", "#18181b"); // Slate/charcoal asphalt
    this.materials.roadLineYellow = mat("roadLineYellowMat", "#f59e0b", "#f59e0b"); // Yellow center line
    this.materials.roadLineWhite = mat("roadLineWhiteMat", "#f3f4f6"); // White edge lines
    this.materials.sidewalk = mat("sidewalkMat", "#4b5563"); // Concrete gray sidewalk

    // Build shared geometry templates once; placements clone/instantiate from these
    // instead of calling MeshBuilder.Create* on every prop spawn.
    this.treeTemplate = this.createTreeTemplate();
    this.lampPostTemplate = this.createLampPostTemplate();
    this.fenceTemplate = this.createFenceTemplate();

    this.preloadBuildings();
  }

  dispose() {
    this.isDisposed = true;

    for (const chunk of this.activeChunks.values()) {
      chunk.dispose();
    }
    this.activeChunks.clear();

    for (const template of this.buildingTemplates.values()) {
      template.dispose();
    }
    this.buildingTemplates.clear();

    this.treeTemplate.dispose();
    this.lampPostTemplate.dispose();
    this.fenceTemplate.dispose();

    for (const material of Object.values(this.materials)) {
      material.dispose();
    }
  }

  // Keyed by template name so createProceduralBuilding can look up its shape
  // instead of walking a long if/else-if chain of string comparisons.
  private readonly buildingBuilders: Record<string, (root: Mesh) => void> = {
    "low-detail-building-a": (root) => {
      const h = 15;
      const main = MeshBuilder.CreateBox("main", { width: 8, height: h, depth: 8 }, this.scene);
      main.position.y = h / 2;
      main.parent = root;
    },
    "low-detail-building-b": (root) => {
      const main = MeshBuilder.CreateBox("main", { width: 8, height: 10, depth: 8 }, this.scene);
      main.position.y = 5;
      main.parent = root;
      const top = MeshBuilder.CreateBox("top", { width: 6, height: 4, depth: 6 }, this.scene);
      top.position.set(0, 12, 0);
      top.parent = root;
    },
    "low-detail-building-c": (root) => {
      const main = MeshBuilder.CreateBox("main", { width: 6, height: 20, depth: 6 }, this.scene);
      main.position.y = 10;
      main.parent = root;
      const top = MeshBuilder.CreateBox("top", { width: 4, height: 5, depth: 4 }, this.scene);
      top.position.set(0, 22.5, 0);
      top.parent = root;
    },
    "low-detail-building-d": (root) => {
      const h = 8;
      const main = MeshBuilder.CreateBox("main", { width: 10, height: h, depth: 10 }, this.scene);
      main.position.y = h / 2;
      main.parent = root;
    },
    "low-detail-building-e": (root) => {
      const main = MeshBuilder.CreateBox("main", { width: 6, height: 18, depth: 6 }, this.scene);
      main.position.y = 9;
      main.parent = root;
      const ant = MeshBuilder.CreateCylinder("antenna", { height: 4, diameter: 0.2 }, this.scene);
      ant.position.set(0, 20, 0);
      ant.parent = root;
    },
    "low-detail-building-f": (root) => {
      const b = MeshBuilder.CreateBox("base", { width: 8, height: 6, depth: 8 }, this.scene);
      b.position.y = 3;
      b.parent = root;
      const m = MeshBuilder.CreateBox("mid", { width: 6, height: 6, depth: 6 }, this.scene);
      m.position.set(0, 9, 0);
      m.parent = root;
      const t = MeshBuilder.CreateBox("top", { width: 4, height: 6, depth: 4 }, this.scene);
      t.position.set(0, 15, 0);
      t.parent = root;
    },
    "low-detail-building-g": (root) => {
      const t1 = MeshBuilder.CreateBox("t1", { width: 4.5, height: 14, depth: 4.5 }, this.scene);
      t1.position.set(-2.5, 7, 0);
      t1.parent = root;
      const t2 = MeshBuilder.CreateBox("t2", { width: 4.5, height: 18, depth: 4.5 }, this.scene);
      t2.position.set(2.5, 9, 0);
      t2.parent = root;
    },
    "low-detail-building-h": (root) => {
      const b = MeshBuilder.CreateBox("base", { width: 10, height: 4, depth: 10 }, this.scene);
      b.position.y = 2;
      b.parent = root;
      const m = MeshBuilder.CreateBox("mid", { width: 8, height: 4, depth: 8 }, this.scene);
      m.position.set(0, 6, 0);
      m.parent = root;
      const t = MeshBuilder.CreateBox("top", { width: 6, height: 4, depth: 6 }, this.scene);
      t.position.set(0, 10, 0);
      t.parent = root;
    },
    "low-detail-building-i": (root) => {
      const h = 16;
      const main = MeshBuilder.CreateBox("main", { width: 8, height: h, depth: 8 }, this.scene);
      main.position.y = h / 2;
      main.parent = root;
      // Corner columns
      for (const x of [-4.1, 4.1]) {
        for (const z of [-4.1, 4.1]) {
          const col = MeshBuilder.CreateBox("col", { width: 0.5, height: h, depth: 0.5 }, this.scene);
          col.position.set(x, h / 2, z);
          col.parent = root;
        }
      }
    },
    "low-detail-building-j": (root) => {
      const b1 = MeshBuilder.CreateBox("b1", { width: 10, height: 12, depth: 6 }, this.scene);
      b1.position.set(0, 6, -2);
      b1.parent = root;
      const b2 = MeshBuilder.CreateBox("b2", { width: 6, height: 12, depth: 10 }, this.scene);
      b2.position.set(-2, 6, 2);
      b2.parent = root;
    },
    "low-detail-building-k": (root) => {
      const cyl = MeshBuilder.CreateCylinder("cyl", { height: 16, diameter: 8 }, this.scene);
      cyl.position.y = 8;
      cyl.parent = root;
    },
    "low-detail-building-l": (root) => {
      const main = MeshBuilder.CreateBox("main", { width: 9, height: 12, depth: 9 }, this.scene);
      main.position.y = 6;
      main.parent = root;
      // Roof parapet walls
      const p1 = MeshBuilder.CreateBox("p1", { width: 9, height: 0.8, depth: 0.2 }, this.scene);
      p1.position.set(0, 12.4, -4.4);
      p1.parent = root;
      const p2 = MeshBuilder.CreateBox("p2", { width: 9, height: 0.8, depth: 0.2 }, this.scene);
      p2.position.set(0, 12.4, 4.4);
      p2.parent = root;
      const p3 = MeshBuilder.CreateBox("p3", { width: 0.2, height: 0.8, depth: 8.6 }, this.scene);
      p3.position.set(-4.4, 12.4, 0);
      p3.parent = root;
      const p4 = MeshBuilder.CreateBox("p4", { width: 0.2, height: 0.8, depth: 8.6 }, this.scene);
      p4.position.set(4.4, 12.4, 0);
      p4.parent = root;
    },
    "low-detail-building-m": (root) => {
      const cyl = MeshBuilder.CreateCylinder("cyl", { height: 15, diameter: 8, tessellation: 6 }, this.scene);
      cyl.position.y = 7.5;
      cyl.parent = root;
    },
    "low-detail-building-n": (root) => {
      const main = MeshBuilder.CreateBox("main", { width: 8, height: 12, depth: 8 }, this.scene);
      main.position.y = 6;
      main.parent = root;
      const dome = MeshBuilder.CreateSphere("dome", { diameter: 6, segments: 16 }, this.scene);
      dome.position.set(0, 12, 0);
      dome.parent = root;
    },
    "low-detail-building-wide-a": (root) => {
      const main = MeshBuilder.CreateBox("main", { width: 18, height: 6, depth: 12 }, this.scene);
      main.position.y = 3;
      main.parent = root;
      // HVAC units on roof
      const hvac1 = MeshBuilder.CreateBox("hvac1", { width: 2, height: 1.5, depth: 2 }, this.scene);
      hvac1.position.set(-4, 6.75, -2);
      hvac1.parent = root;
      const hvac2 = MeshBuilder.CreateBox("hvac2", { width: 3, height: 1.2, depth: 1.5 }, this.scene);
      hvac2.position.set(3, 6.6, 2);
      hvac2.parent = root;
    },
    "low-detail-building-wide-b": (root) => {
      const main = MeshBuilder.CreateBox("main", { width: 16, height: 5, depth: 16 }, this.scene);
      main.position.y = 2.5;
      main.parent = root;
      const top = MeshBuilder.CreateBox("top", { width: 10, height: 4, depth: 10 }, this.scene);
      top.position.set(0, 7, 0);
      top.parent = root;
    },
  };

  private createProceduralBuilding(name: string): Mesh {
    const root = new Mesh(name, this.scene);
    root.setEnabled(false); // Hide master template from view

    const builder = this.buildingBuilders[name];
    if (builder) {
      builder(root);
    } else {
      const h = 10;
      const main = MeshBuilder.CreateBox("main", { width: 8, height: h, depth: 8 }, this.scene);
      main.position.y = h / 2;
      main.parent = root;
    }

    // Ensure all child meshes have collisions disabled as templates
    root.getChildMeshes().forEach(m => {
      m.checkCollisions = false;
      m.receiveShadows = true;
    });

    return root;
  }

  private preloadBuildings() {
    const allBuildings = [...this.standardBuildingTemplates, ...this.wideBuildingTemplates];
    const promises = allBuildings.map(name => {
      return SceneLoader.ImportMeshAsync("", "./assets/Buildings/", `${name}.glb`, this.scene)
        .then((result) => {
          if (this.isDisposed) {
            result.meshes.forEach(m => m.dispose());
            return;
          }

          const rootMesh = result.meshes[0] as Mesh;
          rootMesh.name = name;
          rootMesh.setEnabled(false); // Hide master template from view
          rootMesh.metadata = { isGlb: true };

          // Apply the shared building material with the correct colormap texture
          result.meshes.forEach(m => {
            m.checkCollisions = false;
            m.receiveShadows = true;
            m.material = this.materials.building;
          });

          this.buildingTemplates.set(name, rootMesh);
        })
        .catch(err => {
          if (this.isDisposed) return;
          console.warn(`Failed to load GLB building template ${name}, falling back to procedural construction:`, err);
          const rootMesh = this.createProceduralBuilding(name);
          this.buildingTemplates.set(name, rootMesh);
        });
    });

    Promise.all(promises).then(() => {
      if (this.isDisposed) return;
      // Refresh chunks asynchronously in the next microtask to let templates stabilize
      setTimeout(() => {
        if (this.isDisposed) return;
        for (const [key, mesh] of this.activeChunks.entries()) {
          mesh.dispose();
        }
        this.activeChunks.clear();
        this.update();
      }, 0);
    });
  }

  // Templates below are built once and cloned per placement (instead of calling
  // MeshBuilder.Create* for every prop) so chunks stop duplicating vertex buffers
  // for geometry that's identical every time.

  private createLampPostTemplate(): TransformNode {
    const height = 6;
    const root = new TransformNode("template_lamppost", this.scene);

    const pole = MeshBuilder.CreateBox("pole", { width: 0.2, height, depth: 0.2 }, this.scene);
    pole.position.set(0, height / 2, 0);
    pole.material = this.materials.metal;
    pole.parent = root;
    pole.checkCollisions = true;

    const head = MeshBuilder.CreateBox("head", { width: 1.5, height: 0.2, depth: 0.4 }, this.scene);
    head.position.set(0.6, height, 0);
    head.material = this.materials.metal;
    head.parent = root;

    const bulb = MeshBuilder.CreateBox("bulb", { width: 1.3, height: 0.1, depth: 0.2 }, this.scene);
    bulb.position.set(0.6, height - 0.1, 0);
    bulb.material = this.materials.light;
    bulb.parent = root;

    root.setEnabled(false); // Hide master template from view
    return root;
  }

  private createTreeTemplate(): TransformNode {
    const root = new TransformNode("template_tree", this.scene);

    // Unit-sized geometry: per-placement height/spread is applied via scaling, not rebuilt.
    const trunk = MeshBuilder.CreateCylinder("trunk", { height: 1, diameter: 0.6 }, this.scene);
    trunk.material = this.materials.trunk;
    trunk.parent = root;
    trunk.checkCollisions = true;

    const leaves = MeshBuilder.CreateSphere("leaves", { diameter: 1, segments: 8 }, this.scene);
    leaves.material = this.materials.leaves;
    leaves.parent = root;

    root.setEnabled(false);
    return root;
  }

  private createFenceTemplate(): Mesh {
    const fenceH = 1.2;
    // Unit width: per-placement length is applied via scaling.x.
    const fence = MeshBuilder.CreateBox("template_fence", { width: 1, height: fenceH, depth: 0.2 }, this.scene);
    fence.position.y = fenceH / 2;
    fence.material = this.materials.trunk;
    fence.checkCollisions = true;
    fence.setEnabled(false);
    return fence;
  }

  private createLampPost(parent: TransformNode, rotationY: number) {
    // Clone each template part directly onto `parent` rather than cloning the template's
    // own root — cloning the root would insert an extra wrapper node between `parent` and
    // the pole, and the collision handlers in Car.ts/PoliceCar.ts require the pole's own
    // `.parent` to be the "destructible_..." container to dispose the whole post on impact.
    for (const child of this.lampPostTemplate.getChildren(undefined, false) as Mesh[]) {
      const isPole = child.name === "pole";
      const cloned = child.clone(isPole ? "destructible_lamppost" : child.name, parent, false);
      if (isPole && cloned) {
        cloned.checkCollisions = true;
      }
    }

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
    const chunkNode = new TransformNode(`chunk_${key}`, this.scene);

    // Draw base ground
    const ground = MeshBuilder.CreateGround(`ground_${key}`, { width: this.chunkSize, height: this.chunkSize }, this.scene);
    ground.position.set(cx * this.chunkSize + this.chunkSize/2, 0, cz * this.chunkSize + this.chunkSize/2);
    ground.material = this.materials.ground;
    ground.parent = chunkNode;
    ground.checkCollisions = true;

    const roadY = 0.005; // Slightly above ground to prevent z-fighting
    const lineY = 0.01;  // Slightly above road

    // Grouped by shared material so each group can be merged into a single draw
    // call per chunk instead of leaving dozens of tiny static meshes as separate nodes.
    const meshes: Record<string, Mesh[]> = {
        building: [],
        road: [],
        sidewalk: [],
        lineWhite: [],
        lineYellow: [],
    };

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
                meshes.lineYellow.push(dash);
            }
        } else {
            for (let x = startX; x < endX; x += step) {
                const length = Math.min(dashLength, endX - x);
                if (length <= 0.1) break;
                const dash = MeshBuilder.CreateGround("dash", { width: length, height: dashWidth }, this.scene);
                dash.position.set(x + length / 2, lineY, endZ);
                dash.material = this.materials.roadLineYellow;
                meshes.lineYellow.push(dash);
            }
        }
    };

    // --- DRAW N-S ROAD AND SIDEWALKS ---
    if (hasNS) {
        // Road surface
        const nsRoad = MeshBuilder.CreateGround(`ns_road_${key}`, { width: roadWidth, height: this.chunkSize }, this.scene);
        nsRoad.position.set(centerX, roadY, centerZ);
        nsRoad.material = this.materials.asphalt;
        meshes.road.push(nsRoad);

        // Sidewalk Left
        const nsSidewalkLeft = MeshBuilder.CreateGround(`ns_sidewalk_l_${key}`, { width: sidewalkWidth, height: this.chunkSize }, this.scene);
        nsSidewalkLeft.position.set(centerX - halfW - sidewalkWidth / 2, roadY - 0.001, centerZ);
        nsSidewalkLeft.material = this.materials.sidewalk;
        meshes.sidewalk.push(nsSidewalkLeft);

        // Sidewalk Right
        const nsSidewalkRight = MeshBuilder.CreateGround(`ns_sidewalk_r_${key}`, { width: sidewalkWidth, height: this.chunkSize }, this.scene);
        nsSidewalkRight.position.set(centerX + halfW + sidewalkWidth / 2, roadY - 0.001, centerZ);
        nsSidewalkRight.material = this.materials.sidewalk;
        meshes.sidewalk.push(nsSidewalkRight);

        // Center dashed yellow and solid white lines
        if (hasEW) {
            // Intersection: stop lines before the middle square
            createDashedLine(centerX, cz * this.chunkSize, centerX, centerZ - halfW, true);
            createDashedLine(centerX, centerZ + halfW, centerX, (cz + 1) * this.chunkSize, true);

            // Left white lines
            const wl1 = MeshBuilder.CreateGround("wl", { width: 0.15, height: this.chunkSize/2 - halfW }, this.scene);
            wl1.position.set(centerX - halfW, lineY, cz * this.chunkSize + (this.chunkSize/2 - halfW)/2);
            wl1.material = this.materials.roadLineWhite;
            meshes.lineWhite.push(wl1);

            const wl2 = MeshBuilder.CreateGround("wl", { width: 0.15, height: this.chunkSize/2 - halfW }, this.scene);
            wl2.position.set(centerX - halfW, lineY, centerZ + halfW + (this.chunkSize/2 - halfW)/2);
            wl2.material = this.materials.roadLineWhite;
            meshes.lineWhite.push(wl2);

            // Right white lines
            const wl3 = MeshBuilder.CreateGround("wl", { width: 0.15, height: this.chunkSize/2 - halfW }, this.scene);
            wl3.position.set(centerX + halfW, lineY, cz * this.chunkSize + (this.chunkSize/2 - halfW)/2);
            wl3.material = this.materials.roadLineWhite;
            meshes.lineWhite.push(wl3);

            const wl4 = MeshBuilder.CreateGround("wl", { width: 0.15, height: this.chunkSize/2 - halfW }, this.scene);
            wl4.position.set(centerX + halfW, lineY, centerZ + halfW + (this.chunkSize/2 - halfW)/2);
            wl4.material = this.materials.roadLineWhite;
            meshes.lineWhite.push(wl4);
        } else {
            // Straight road: continuous lines
            createDashedLine(centerX, cz * this.chunkSize, centerX, (cz + 1) * this.chunkSize, true);

            const wlLeft = MeshBuilder.CreateGround("wl", { width: 0.15, height: this.chunkSize }, this.scene);
            wlLeft.position.set(centerX - halfW, lineY, centerZ);
            wlLeft.material = this.materials.roadLineWhite;
            meshes.lineWhite.push(wlLeft);

            const wlRight = MeshBuilder.CreateGround("wl", { width: 0.15, height: this.chunkSize }, this.scene);
            wlRight.position.set(centerX + halfW, lineY, centerZ);
            wlRight.material = this.materials.roadLineWhite;
            meshes.lineWhite.push(wlRight);
        }

        // Programmatic Streetlights along sidewalks
        const zCoords = [cz * this.chunkSize + 12.5, cz * this.chunkSize + 37.5];
        zCoords.forEach((pz, idx) => {
            const postL = new TransformNode(`destructible_lamp_ns_l_${idx}`, this.scene);
            postL.position.set(centerX - halfW - 0.75, 0, pz);
            postL.parent = chunkNode;
            this.createLampPost(postL, 0);

            const postR = new TransformNode(`destructible_lamp_ns_r_${idx}`, this.scene);
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
        meshes.road.push(ewRoad);

        // Sidewalk Bottom
        const ewSidewalkBottom = MeshBuilder.CreateGround(`ew_sidewalk_b_${key}`, { width: this.chunkSize, height: sidewalkWidth }, this.scene);
        ewSidewalkBottom.position.set(centerX, roadY - 0.001, centerZ - halfW - sidewalkWidth / 2);
        ewSidewalkBottom.material = this.materials.sidewalk;
        meshes.sidewalk.push(ewSidewalkBottom);

        // Sidewalk Top
        const ewSidewalkTop = MeshBuilder.CreateGround(`ew_sidewalk_t_${key}`, { width: this.chunkSize, height: sidewalkWidth }, this.scene);
        ewSidewalkTop.position.set(centerX, roadY - 0.001, centerZ + halfW + sidewalkWidth / 2);
        ewSidewalkTop.material = this.materials.sidewalk;
        meshes.sidewalk.push(ewSidewalkTop);

        // Center dashed yellow and solid white lines
        if (hasNS) {
            // Intersection: stop lines before the middle square
            createDashedLine(cx * this.chunkSize, centerZ, centerX - halfW, centerZ, false);
            createDashedLine(centerX + halfW, centerZ, (cx + 1) * this.chunkSize, centerZ, false);

            // Bottom white lines
            const wl1 = MeshBuilder.CreateGround("wl", { width: this.chunkSize/2 - halfW, height: 0.15 }, this.scene);
            wl1.position.set(cx * this.chunkSize + (this.chunkSize/2 - halfW)/2, lineY + 0.002, centerZ - halfW);
            wl1.material = this.materials.roadLineWhite;
            meshes.lineWhite.push(wl1);

            const wl2 = MeshBuilder.CreateGround("wl", { width: this.chunkSize/2 - halfW, height: 0.15 }, this.scene);
            wl2.position.set(centerX + halfW + (this.chunkSize/2 - halfW)/2, lineY + 0.002, centerZ - halfW);
            wl2.material = this.materials.roadLineWhite;
            meshes.lineWhite.push(wl2);

            // Top white lines
            const wl3 = MeshBuilder.CreateGround("wl", { width: this.chunkSize/2 - halfW, height: 0.15 }, this.scene);
            wl3.position.set(cx * this.chunkSize + (this.chunkSize/2 - halfW)/2, lineY + 0.002, centerZ + halfW);
            wl3.material = this.materials.roadLineWhite;
            meshes.lineWhite.push(wl3);

            const wl4 = MeshBuilder.CreateGround("wl", { width: this.chunkSize/2 - halfW, height: 0.15 }, this.scene);
            wl4.position.set(centerX + halfW + (this.chunkSize/2 - halfW)/2, lineY + 0.002, centerZ + halfW);
            wl4.material = this.materials.roadLineWhite;
            meshes.lineWhite.push(wl4);
        } else {
            // Straight road: continuous lines
            createDashedLine(cx * this.chunkSize, centerZ, (cx + 1) * this.chunkSize, centerZ, false);

            const wlBottom = MeshBuilder.CreateGround("wl", { width: this.chunkSize, height: 0.15 }, this.scene);
            wlBottom.position.set(centerX, lineY + 0.002, centerZ - halfW);
            wlBottom.material = this.materials.roadLineWhite;
            meshes.lineWhite.push(wlBottom);

            const wlTop = MeshBuilder.CreateGround("wl", { width: this.chunkSize, height: 0.15 }, this.scene);
            wlTop.position.set(centerX, lineY + 0.002, centerZ + halfW);
            wlTop.material = this.materials.roadLineWhite;
            meshes.lineWhite.push(wlTop);
        }

        // Programmatic Streetlights along sidewalks (only if not an intersection to avoid duplicates)
        if (!hasNS) {
            const xCoords = [cx * this.chunkSize + 12.5, cx * this.chunkSize + 37.5];
            xCoords.forEach((px, idx) => {
                const postB = new TransformNode(`destructible_lamp_ew_b_${idx}`, this.scene);
                postB.position.set(px, 0, centerZ - halfW - 0.75);
                postB.parent = chunkNode;
                this.createLampPost(postB, Math.PI / 2);

                const postT = new TransformNode(`destructible_lamp_ew_t_${idx}`, this.scene);
                postT.position.set(px, 0, centerZ + halfW + 0.75);
                postT.parent = chunkNode;
                this.createLampPost(postT, -Math.PI / 2);
            });
        }
    }

    // --- PROCEDURAL PROP PLACEMENT ---
    let seed = cx * 1000 + cz;
    const random = () => {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    const numProps = Math.floor(random() * 20) + 15;
    for (let i = 0; i < numProps; i++) {
        // Leave center chunk entirely clear for initial spawn
        if (cx === 0 && cz === 0) continue;

        const typeRand = random();
        const isCityBlock = !hasNS && !hasEW;
        
        let px = 0;
        let pz = 0;
        let found = false;

        if (isCityBlock && typeRand < 0.20) {
            // Center massive building in the city block chunk so it never spills over onto boundary roads
            const chunkCenter = this.chunkSize / 2;
            px = cx * this.chunkSize + chunkCenter + (random() * 6 - 3);
            pz = cz * this.chunkSize + chunkCenter + (random() * 6 - 3);
            found = true;
        } else {
            // Try to find a position not overlapping with roads or sidewalks
            for (let retry = 0; retry < 5; retry++) {
                px = cx * this.chunkSize + random() * this.chunkSize;
                pz = cz * this.chunkSize + random() * this.chunkSize;
                if (!isOnRoadOrSidewalk(px, pz)) {
                    found = true;
                    break;
                }
            }
        }

        if (!found) continue;

        // The car always spawns at the center of chunk (0,0) — see Car.ts's initial position.
        const spawnCenter = this.chunkSize / 2;
        const distanceToSpawn = Math.max(Math.abs(px - spawnCenter), Math.abs(pz - spawnCenter));

        if (typeRand < 0.15) {
            // Building
            // Needs a generous safety distance because buildings can overlap the spawn area
            if (distanceToSpawn < 80) continue;

            if (this.buildingTemplates.size > 0) {
                const useWide = (random() < 0.25); // 25% chance of a wide building
                const list = useWide ? this.wideBuildingTemplates : this.standardBuildingTemplates;
                const randomName = list[Math.floor(random() * list.length)];
                const template = this.buildingTemplates.get(randomName);

                if (template) {
                    const buildingClone = template.instantiateHierarchy(chunkNode);
                    if (buildingClone) {
                        buildingClone.name = `building_${cx}_${cz}_${i}`;
                        buildingClone.setEnabled(true);
                        buildingClone.position.set(px, 0, pz);
                        
                        // Clear rotationQuaternion to allow rotation.y setting safely
                        buildingClone.rotationQuaternion = null;
                        
                        // Grid-aligned 90-degree rotations for cleaner look
                        const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
                        buildingClone.rotation.y = angles[Math.floor(random() * angles.length)];

                        // Scale: 10x for massive skyscrapers in city blocks, 1.5x for street-side shops/townhouses
                        const scale = 10; // isCityBlock ? (1.0 + random() * 0.4) * 10 : (1.0 + random() * 0.3) * 1.5;
                        buildingClone.scaling.set(scale, scale * (0.7 + random() * 1.0), scale);

                        // Configure child mesh shadow reception and assign shared building material.
                        // Collisions are handled below by a single simplified box, not by these
                        // decorative sub-meshes (see comment there for why).
                        buildingClone.getChildMeshes().forEach((child: AbstractMesh) => {
                            child.checkCollisions = false;
                            if (child.getClassName() !== "InstancedMesh") {
                                child.receiveShadows = true;
                            }
                            child.material = this.materials.building;
                        });

                        // Several templates are non-convex (e.g. "-g" is two separate towers with a
                        // real gap between them, "-j" is an L-shaped pair of boxes with a concave
                        // inner corner, "-i" has free-standing corner columns). Babylon's ellipsoid
                        // collision slide response is unreliable at concave corners and multi-part
                        // gaps — sliding off one sub-mesh drives the car straight into the next, and
                        // it never resolves. A single convex bounding-box collider per building has
                        // no gaps, no concave corners, and no interior openings, so there's nowhere
                        // for the car to wedge into or end up embedded inside.
                        buildingClone.computeWorldMatrix(true);
                        const { min, max } = buildingClone.getHierarchyBoundingVectors(true);
                        const size = max.subtract(min);
                        const center = min.add(max).scale(0.5);
                        const collider = MeshBuilder.CreateBox(`building_collider_${cx}_${cz}_${i}`, {
                            width: size.x,
                            height: size.y,
                            depth: size.z,
                        }, this.scene);
                        collider.position.copyFrom(center);
                        collider.parent = chunkNode;
                        collider.checkCollisions = true;
                        collider.isVisible = false;
                    }
                } else {
                    const scaleFactor = isCityBlock ? 10 : 1.5;
                    const w = (4 + random() * 8) * scaleFactor;
                    const d = (4 + random() * 8) * scaleFactor;
                    const h = (5 + random() * 15) * scaleFactor;
                    const building = MeshBuilder.CreateBox("building", { width: w, height: h, depth: d }, this.scene);
                    building.position.set(px, h/2, pz);
                    meshes.building.push(building);
                }
            } else {
                const scaleFactor = isCityBlock ? 10 : 1.5;
                const w = (4 + random() * 8) * scaleFactor;
                const d = (4 + random() * 8) * scaleFactor;
                const h = (5 + random() * 15) * scaleFactor;
                const building = MeshBuilder.CreateBox("building", { width: w, height: h, depth: d }, this.scene);
                building.position.set(px, h/2, pz);
                meshes.building.push(building);
            }
        } else if (typeRand < 0.6) {
            // Tree
            if (distanceToSpawn < 30) continue;
            const treeRoot = this.treeTemplate.clone(`destructible_tree_${i}`, chunkNode, false) as TransformNode;
            treeRoot.setEnabled(true);
            treeRoot.position.set(px, 0, pz);

            // Node.clone() renames children to "<newRootName>.<originalName>", so match by suffix.
            const treeChildren = treeRoot.getChildren(undefined, false);
            const trunk = treeChildren.find(c => c.name.endsWith("trunk")) as Mesh;
            const leaves = treeChildren.find(c => c.name.endsWith("leaves")) as Mesh;

            // Template geometry is unit-sized; scale it to this instance's randomized dimensions.
            const trunkH = 1.5 + random() * 2;
            trunk.name = `destructible_tree_trunk_${i}`;
            trunk.checkCollisions = true;
            trunk.scaling.y = trunkH;
            trunk.position.y = trunkH / 2;

            const leavesSize = 2.5 + random() * 2.5;
            leaves.scaling.setAll(leavesSize);
            leaves.position.y = trunkH + leavesSize / 2 - 0.5;
        } else if (typeRand < 0.85) {
            // Only spawn random lamp post if no roads are in this chunk (to provide ambient light)
            if (!hasNS && !hasEW) {
                const postRoot = new TransformNode("destructible_lamppost_" + i, this.scene);
                postRoot.position.set(px, 0, pz);
                postRoot.parent = chunkNode;
                this.createLampPost(postRoot, random() * Math.PI * 2);
            }
        } else {
            // Fence
            if (distanceToSpawn < 30) continue;
            const length = 4 + random() * 6;
            const angle = random() > 0.5 ? 0 : Math.PI / 2;
            const fenceH = 1.2;

            // Template geometry has unit width; scale.x to this instance's randomized length.
            const fence = this.fenceTemplate.clone(`destructible_fence_${i}`, chunkNode, true) as Mesh;
            fence.setEnabled(true);
            fence.checkCollisions = true;
            fence.position.set(px, fenceH / 2, pz);
            fence.rotation.y = angle;
            fence.scaling.x = length;
        }
    }

    // Merge each same-material group of static, non-destructible meshes into a single
    // mesh so a chunk's road/sidewalk/line clutter doesn't cost one node+draw-call each.
    const mergeGroup = (arr: Mesh[], name: string, material: StandardMaterial, opts: { receiveShadows?: boolean; checkCollisions?: boolean } = {}) => {
        if (arr.length === 0) return;
        const merged = Mesh.MergeMeshes(arr, true, true, undefined, false, true);
        if (merged) {
            merged.name = name;
            merged.material = material;
            merged.parent = chunkNode;
            merged.checkCollisions = opts.checkCollisions ?? false;
            merged.receiveShadows = opts.receiveShadows ?? false;
        }
    };

    mergeGroup(meshes.building, `prop_building_${key}`, this.materials.building, { checkCollisions: true });
    mergeGroup(meshes.road, `prop_road_${key}`, this.materials.asphalt, { receiveShadows: true });
    mergeGroup(meshes.sidewalk, `prop_sidewalk_${key}`, this.materials.sidewalk);
    mergeGroup(meshes.lineWhite, `prop_lineWhite_${key}`, this.materials.roadLineWhite);
    mergeGroup(meshes.lineYellow, `prop_lineYellow_${key}`, this.materials.roadLineYellow);

    this.activeChunks.set(key, chunkNode);
  }
}
