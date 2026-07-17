import convert from 'fbx2gltf';
import path from 'path';
import fs from 'fs';

const src1 = path.resolve('public/assets/Models/car_1.fbx');
const dest1 = path.resolve('public/assets/Models/car_1.glb');
const src2 = path.resolve('public/assets/Models/car_2.fbx');
const dest2 = path.resolve('public/assets/Models/car_2.glb');

async function rebuild() {
  try {
    console.log(`Rebuilding: ${src1} -> ${dest1}`);
    const res1 = await convert(src1, dest1, ['--binary']);
    console.log(`Successfully built car_1.glb at: ${res1}`);

    console.log(`Rebuilding: ${src2} -> ${dest2}`);
    const res2 = await convert(src2, dest2, ['--binary']);
    console.log(`Successfully built car_2.glb at: ${res2}`);

    console.log('✨ All 3D models rebuilt successfully with correct binary encoding!');
  } catch (err) {
    console.error('❌ Failed to rebuild 3D models:', err);
    process.exit(1);
  }
}

rebuild();
