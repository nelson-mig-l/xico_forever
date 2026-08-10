import { Car } from "../player/Car";
import { PoliceManager } from "../ai/PoliceManager";
import { ChunkGenerator } from "../world/ChunkGenerator";
import { AbstractMesh } from "@babylonjs/core";

export class MiniMapRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private mapRadiusMeters = 85; // World meters from player to edge of minimap view
  private displayWidth = 180;
  private displayHeight = 180;

  constructor() {}

  public setCanvas(canvas: HTMLCanvasElement | null) {
    this.canvas = canvas;
    if (canvas) {
      this.ctx = canvas.getContext("2d");
    } else {
      this.ctx = null;
    }
  }

  public render(car: Car, policeManager: PoliceManager, chunkGenerator: ChunkGenerator) {
    if (!this.canvas || !this.ctx) return;

    const canvas = this.canvas;
    const ctx = this.ctx;

    const dpr = window.devicePixelRatio || 1;
    const targetW = this.displayWidth * dpr;
    const targetH = this.displayHeight * dpr;

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const width = this.displayWidth;
    const height = this.displayHeight;
    const size = Math.min(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = size / 2 - 4; // Margin for outer HUD bezel

    const scale = radius / this.mapRadiusMeters; // Pixels per world meter

    const playerX = car.mesh.position.x;
    const playerZ = car.mesh.position.z;
    const H = car.heading;
    const cosH = Math.cos(H);
    const sinH = Math.sin(H);

    // World to Map coordinate transformation (Track-Up orientation)
    const worldToMap = (wx: number, wz: number): { x: number; y: number } => {
      const dx = wx - playerX;
      const dz = wz - playerZ;
      const sx = scale * (dx * cosH - dz * sinH);
      const sy = -scale * (dx * sinH + dz * cosH);
      return {
        x: centerX + sx,
        y: centerY + sy
      };
    };

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // --- 1. CIRCULAR HUD CLIP & RADAR BACKGROUND ---
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();

    // Dark cyber radar background
    const bgGradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, radius);
    bgGradient.addColorStop(0, "#0b1329");
    bgGradient.addColorStop(1, "#050914");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Concentric range circles (at 25m, 50m, 75m)
    ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
    ctx.lineWidth = 1;
    [25, 50, 75].forEach(distMeters => {
      const rPx = distMeters * scale;
      if (rPx < radius) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, rPx, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Radar quadrant crosshairs
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.stroke();

    // --- 2. RENDER ROADS & SIDEWALKS ---
    // Roads exist on even chunk indices (cx % 2 === 0 for N-S, cz % 2 === 0 for E-W)
    const chunkSize = 50;
    const roadWidth = 12;
    const sidewalkWidth = 1.5;
    const totalRoadWidth = roadWidth + sidewalkWidth * 2;

    const searchRadius = this.mapRadiusMeters + 40;
    const minCx = Math.floor((playerX - searchRadius) / chunkSize);
    const maxCx = Math.floor((playerX + searchRadius) / chunkSize);
    const minCz = Math.floor((playerZ - searchRadius) / chunkSize);
    const maxCz = Math.floor((playerZ + searchRadius) / chunkSize);

    // N-S Roads (Vertical in world space)
    for (let cx = minCx; cx <= maxCx; cx++) {
      if (Math.abs(cx) % 2 === 0) {
        const roadX = cx * chunkSize + chunkSize / 2;
        const p1 = worldToMap(roadX, playerZ - searchRadius);
        const p2 = worldToMap(roadX, playerZ + searchRadius);

        // Draw Sidewalk Backing
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = "#27354a";
        ctx.lineWidth = totalRoadWidth * scale;
        ctx.stroke();

        // Draw Asphalt Surface
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = "#171f2c";
        ctx.lineWidth = roadWidth * scale;
        ctx.stroke();

        // Draw Yellow Center Line
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = "rgba(234, 179, 8, 0.6)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4 * scale, 4 * scale]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // E-W Roads (Horizontal in world space)
    for (let cz = minCz; cz <= maxCz; cz++) {
      if (Math.abs(cz) % 2 === 0) {
        const roadZ = cz * chunkSize + chunkSize / 2;
        const p1 = worldToMap(playerX - searchRadius, roadZ);
        const p2 = worldToMap(playerX + searchRadius, roadZ);

        // Draw Sidewalk Backing
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = "#27354a";
        ctx.lineWidth = totalRoadWidth * scale;
        ctx.stroke();

        // Draw Asphalt Surface
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = "#171f2c";
        ctx.lineWidth = roadWidth * scale;
        ctx.stroke();

        // Draw Yellow Center Line
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = "rgba(234, 179, 8, 0.6)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4 * scale, 4 * scale]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // --- 3. RENDER BUILDINGS ---
    chunkGenerator.activeChunks.forEach((chunkNode) => {
      const children = chunkNode.getChildren();
      children.forEach((child) => {
        if (child.name.startsWith("building_") || child.name.startsWith("destructible_building_")) {
          const mesh = child as AbstractMesh;
          if (!mesh.position) return;

          const bx = mesh.position.x;
          const bz = mesh.position.z;

          // Check distance to player
          const distToPlayer = Math.hypot(bx - playerX, bz - playerZ);
          if (distToPlayer > searchRadius) return;

          const scaleX = mesh.scaling ? mesh.scaling.x : 10;
          const scaleZ = mesh.scaling ? mesh.scaling.z : 10;

          // Compute corner points in world space
          const halfW = (scaleX * 1.8) / 2;
          const halfD = (scaleZ * 1.8) / 2;

          const rotY = mesh.rotation ? mesh.rotation.y : 0;
          const cCos = Math.cos(rotY);
          const cSin = Math.sin(rotY);

          const corners = [
            { x: -halfW, z: -halfD },
            { x: halfW, z: -halfD },
            { x: halfW, z: halfD },
            { x: -halfW, z: halfD }
          ].map(c => {
            const rx = c.x * cCos - c.z * cSin;
            const rz = c.x * cSin + c.z * cCos;
            return worldToMap(bx + rx, bz + rz);
          });

          ctx.beginPath();
          ctx.moveTo(corners[0].x, corners[0].y);
          ctx.lineTo(corners[1].x, corners[1].y);
          ctx.lineTo(corners[2].x, corners[2].y);
          ctx.lineTo(corners[3].x, corners[3].y);
          ctx.closePath();

          ctx.fillStyle = "#1e293b";
          ctx.fill();
          ctx.strokeStyle = "#334155";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    });

    // --- 4. RENDER POLICE CARS & OFF-SCREEN THREAT POINTERS ---
    const now = Date.now();
    const flashState = Math.floor(now / 200) % 2 === 0;

    policeManager.policeCars.forEach((p) => {
      if (p.isDestroyed) return;

      const pWorldX = p.mesh.position.x;
      const pWorldZ = p.mesh.position.z;
      const mapPos = worldToMap(pWorldX, pWorldZ);

      const dx = mapPos.x - centerX;
      const dy = mapPos.y - centerY;
      const distFromCenter = Math.hypot(dx, dy);

      if (distFromCenter <= radius - 8) {
        // ON-SCREEN POLICE MARKER
        const relHeading = p.heading - H;

        ctx.save();
        ctx.translate(mapPos.x, mapPos.y);
        ctx.rotate(relHeading);

        // Flashing police siren aura
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fillStyle = flashState ? "rgba(239, 68, 68, 0.4)" : "rgba(59, 130, 246, 0.4)";
        ctx.fill();

        // Police vehicle wedge icon
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(-4.5, 5);
        ctx.lineTo(0, 3);
        ctx.lineTo(4.5, 5);
        ctx.closePath();

        ctx.fillStyle = flashState ? "#ef4444" : "#3b82f6";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      } else {
        // OFF-SCREEN POLICE THREAT POINTER ON MINIMAP RIM
        const angle = Math.atan2(dy, dx);
        const rimX = centerX + (radius - 12) * Math.cos(angle);
        const rimY = centerY + (radius - 12) * Math.sin(angle);

        ctx.save();
        ctx.translate(rimX, rimY);
        ctx.rotate(angle + Math.PI / 2);

        // Pulsing threat arrow
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(-5, 4);
        ctx.lineTo(5, 4);
        ctx.closePath();

        ctx.fillStyle = flashState ? "#ef4444" : "#dc2626";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      }
    });

    // --- 5. RENDER PLAYER CAR (Centered, Facing UP) ---
    // Headlight Beam Cone extending UP
    const headlightGrad = ctx.createLinearGradient(centerX, centerY, centerX, centerY - 32);
    headlightGrad.addColorStop(0, "rgba(56, 189, 248, 0.4)");
    headlightGrad.addColorStop(1, "rgba(56, 189, 248, 0)");

    ctx.beginPath();
    ctx.moveTo(centerX - 3, centerY - 2);
    ctx.lineTo(centerX - 16, centerY - 32);
    ctx.lineTo(centerX + 16, centerY - 32);
    ctx.lineTo(centerX + 3, centerY - 2);
    ctx.closePath();
    ctx.fillStyle = headlightGrad;
    ctx.fill();

    // Player Vehicle Icon (Sleek Sky Blue Arrow)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 9);
    ctx.lineTo(centerX - 6, centerY + 6);
    ctx.lineTo(centerX, centerY + 3);
    ctx.lineTo(centerX + 6, centerY + 6);
    ctx.closePath();

    ctx.fillStyle = "#38bdf8";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center locator dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.restore(); // Restore circular HUD clip

    // --- 6. HUD BEZEL RING & COMPASS INDICATORS ---
    // Outer Bezel Ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // North (N) Indicator on Perimeter Ring
    const nX = centerX + (radius - 2) * (-sinH);
    const nY = centerY + (radius - 2) * (-cosH);

    ctx.beginPath();
    ctx.arc(nX, nY, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#ef4444";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", nX, nY);

    ctx.restore(); // Final restore
  }
}
