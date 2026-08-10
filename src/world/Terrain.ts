export function getTerrainHeight(x: number, z: number): number {
  // Smooth, rolling hills and valleys using low-frequency combined harmonics
  const wave1 = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 4.0;
  const wave2 = Math.sin(x * 0.041 + 1.2) * Math.sin(z * 0.035 + 0.6) * 1.8;
  const wave3 = Math.cos(x * 0.08 - z * 0.06) * 0.7;

  return wave1 + wave2 + wave3;
}

export function getTerrainSlopeAngles(x: number, z: number, heading: number): { pitch: number; roll: number; height: number } {
  const hCenter = getTerrainHeight(x, z);

  const forwardX = Math.sin(heading);
  const forwardZ = Math.cos(heading);
  const rightX = Math.cos(heading);
  const rightZ = -Math.sin(heading);

  const dForward = 1.2;
  const dRight = 0.8;

  const hFront = getTerrainHeight(x + forwardX * dForward, z + forwardZ * dForward);
  const hBack = getTerrainHeight(x - forwardX * dForward, z - forwardZ * dForward);
  const hRight = getTerrainHeight(x + rightX * dRight, z + rightZ * dRight);
  const hLeft = getTerrainHeight(x - rightX * dRight, z - rightZ * dRight);

  const pitch = Math.atan2(hFront - hBack, dForward * 2);
  const roll = Math.atan2(hRight - hLeft, dRight * 2);

  return {
    height: hCenter,
    pitch,
    roll
  };
}
