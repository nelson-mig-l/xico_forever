import convert from 'fbx2gltf';
import path from 'path';
import fs from 'fs';

async function convertFbxToGlb(srcPath, destPath) {
  console.log(`Rebuilding: ${srcPath} -> ${destPath}`);
  try {
    const result = await convert(srcPath, destPath, ['--binary']);
    console.log(`Successfully built GLB at: ${result}`);
  } catch (err) {
    console.error(`❌ Failed to convert ${srcPath}:`, err);
    throw err;
  }
}

async function rebuildAll() {
  const dirsToScan = [
    'public/assets/Models',
    'public/assets/Buildings'
  ];

  try {
    for (const dir of dirsToScan) {
      const resolvedDir = path.resolve(dir);
      if (!fs.existsSync(resolvedDir)) {
        console.warn(`Directory not found: ${resolvedDir}`);
        continue;
      }

      const files = fs.readdirSync(resolvedDir);
      for (const file of files) {
        if (file.toLowerCase().endsWith('.fbx')) {
          const srcPath = path.join(resolvedDir, file);
          const baseName = path.basename(file, path.extname(file));
          const destPath = path.join(resolvedDir, `${baseName}.glb`);
          
          await convertFbxToGlb(srcPath, destPath);
        }
      }
    }
    console.log('✨ All 3D models rebuilt and converted successfully with correct binary encoding!');
  } catch (err) {
    console.error('❌ Failed to rebuild 3D models:', err);
    process.exit(1);
  }
}

rebuildAll();

