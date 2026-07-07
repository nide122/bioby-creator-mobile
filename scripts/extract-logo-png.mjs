import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = path.join(root, 'logo-color.svg');
const outPath = path.join(root, 'assets', 'images', 'brand-logo.png');

const svg = fs.readFileSync(svgPath, 'utf8');
const match =
  svg.match(/xlink:href="data:img\/png;base64,([^"]+)"/) ??
  svg.match(/href="data:image\/png;base64,([^"]+)"/);
if (!match) {
  console.error('Could not find embedded PNG in logo-color.svg');
  process.exit(1);
}

fs.writeFileSync(outPath, Buffer.from(match[1], 'base64'));
console.log(`Wrote ${outPath} (${fs.statSync(outPath).size} bytes)`);
