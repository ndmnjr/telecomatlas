import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const output = path.resolve(root, 'dist');
if (path.dirname(output) !== root || path.basename(output) !== 'dist')
  throw Error('Build output must remain inside the project dist directory');
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
await fs.mkdir('verification', { recursive: true });
for (const name of ['telecom_site.glb', 'telecom_inventory.json'])
  await fs.access('public/assets/' + name);
for (const name of ['index.html', 'styles.css']) await fs.copyFile(name, 'dist/' + name);
await fs.cp('src', 'dist/src', { recursive: true });
await fs.cp('public', 'dist', { recursive: true });
await fs.mkdir('dist/vendor', { recursive: true });
for (const file of [
  'build/three.module.js',
  'build/three.core.js',
  'examples/jsm/controls/OrbitControls.js',
  'examples/jsm/loaders/GLTFLoader.js',
  'examples/jsm/utils/BufferGeometryUtils.js',
]) {
  const target = 'dist/vendor/' + file.replace('examples/jsm/', 'addons/');
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile('node_modules/three/' + file, target);
}
const manifest = [];
async function walk(dir) {
  for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) await walk(file);
    else {
      const b = await fs.readFile(file);
      manifest.push({
        file: path.relative('dist', file).replaceAll('\\', '/'),
        bytes: b.length,
        sha256: createHash('sha256').update(b).digest('hex'),
      });
    }
  }
}
await walk('dist');
await fs.writeFile('verification/build-manifest.json', JSON.stringify(manifest, null, 2));
console.log(
  `Static build ready: ${manifest.length} local files; ${manifest.reduce((s, f) => s + f.bytes, 0)} bytes. No CDN or network runtime dependencies.`,
);
