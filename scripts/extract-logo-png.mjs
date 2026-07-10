import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const imagesDir = path.join(root, 'assets', 'images');
const sourcePath = path.join(imagesDir, 'bioby-logo.png');

if (!fs.existsSync(sourcePath)) {
  console.error(`Missing canonical logo: ${sourcePath}`);
  process.exit(1);
}

const targets = [
  'app-icon.png',
  'brand-logo.png',
  'favicon.png',
  'icon.png',
  'splash-icon.png',
  'adaptive-icon.png',
];

for (const name of targets) {
  const outPath = path.join(imagesDir, name);
  fs.copyFileSync(sourcePath, outPath);
  console.log(`Synced ${name} (${fs.statSync(outPath).size} bytes)`);
}
