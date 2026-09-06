import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as T from 'three';
import { catalogue, validateModel } from '../src/catalogue.js';
import { prepareParts, packParts, applyExplosion } from '../src/layout.js';
import { Tap, calloutLayout, filterParts } from '../src/interaction.js';
const bytes = await fs.readFile('public/assets/telecom_site.glb');
const raw = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
const inventory = JSON.parse(await fs.readFile('public/assets/telecom_inventory.json', 'utf8'));
const load = () =>
  new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  );
test('real GLTFLoader geometry has exactly 32 named meshes, 11 verified asset ancestors and two explicit context meshes', async () => {
  const gltf = await load();
  const parts = validateModel(gltf, inventory);
  assert.equal(parts.length, 32);
  assert.equal(new Set(parts.filter((p) => p.assetId).map((p) => p.assetId)).size, 11);
  assert.deepEqual(
    parts.filter((p) => !p.assetId).map((p) => p.sourceName),
    ['Ground', 'Concrete Pad'],
  );
  assert.deepEqual(
    parts.map((p) => p.sourceName).sort(),
    raw.nodes
      .filter((n) => n.mesh !== undefined)
      .map((n) => n.name)
      .sort(),
  );
  assert.equal(catalogue.length, 32);
  assert.ok(
    parts.every((p) => p.mesh.geometry.attributes.position.count > 0 && p.label && p.description),
  );
});
test('tap selects but an out-and-back drag, pinch and cancelled pointer never select', () => {
  const t = new Tap();
  t.down(1, 0, 0);
  assert.equal(t.up(1, 1, 1), true);
  t.down(1, 0, 0);
  t.move(1, 100, 0);
  assert.equal(t.up(1, 0, 0), false);
  t.down(1, 0, 0);
  t.down(2, 0, 0);
  assert.equal(t.up(2, 0, 0), false);
  assert.equal(t.up(1, 0, 0), false);
  t.down(1, 0, 0);
  t.cancel(1);
  assert.equal(t.up(1, 0, 0), false);
});
test('32 collocated projected anchors become distinct reachable callouts at desktop and mobile sizes', () => {
  for (const [w, h] of [
    [1050, 620],
    [390, 530],
  ]) {
    const labels = calloutLayout(
      catalogue.map((p) => ({ number: p.number, x: w / 2, y: h / 2 })),
      w,
      h,
    );
    assert.equal(labels.length, 32);
    labels.forEach((p, i) => {
      assert.ok(p.x >= 16 && p.x <= w - 16 && p.y >= 40 && p.y <= h - 60);
      labels
        .slice(i + 1)
        .forEach((q) => assert.ok(Math.abs(p.x - q.x) >= 28 || Math.abs(p.y - q.y) >= 28));
    });
  }
});
test('search includes human labels, exact mesh names, asset IDs, groups and every numbered part', () => {
  assert.equal(filterParts(catalogue, ' DEMO-CABINET-01 ').length, 8);
  assert.deepEqual(
    filterParts(catalogue, 'site camera lens').map((p) => p.number),
    [32],
  );
  assert.deepEqual(
    filterParts(catalogue, '20').map((p) => p.number),
    [20],
  );
  assert.equal(filterParts(catalogue, '').length, 32);
  assert.equal(filterParts(catalogue, 'no-such-part').length, 0);
});
test('contract fails loudly on missing, duplicate, unmapped, misparented and non-finite meshes and inventory mismatch', async () => {
  let g = await load();
  g.scene.children[0].removeFromParent();
  assert.throws(() => validateModel(g, inventory), /expected 32/);
  g = await load();
  g.parser.json.nodes[1].name = 'Ground';
  assert.throws(() => validateModel(g, inventory), /duplicate/);
  g = await load();
  g.parser.json.nodes[0].name = 'Surprise';
  assert.throws(() => validateModel(g, inventory), /unmapped/);
  g = await load();
  g.scene.getObjectByName('DEMO-TOWER-01').name = 'DEMO-WRONG';
  assert.throws(() => validateModel(g, inventory), /ancestry/);
  g = await load();
  assert.throws(() => validateModel(g, { assets: inventory.assets.slice(1) }), /11 unique/);
  g = await load();
  g.scene.children[0].geometry.attributes.position.array[0] = NaN;
  assert.throws(() => validateModel(g, inventory), /non-finite/);
});
test('measured individual mesh packing has no overlap, preserves world rotation/scale, and returns exactly', async () => {
  const gltf = await load(),
    parts = validateModel(gltf, inventory);
  prepareParts(parts);
  const originals = parts.map((p) => p.mesh.matrixWorld.toArray());
  for (const aspect of [0.62, 1, 1.7]) {
    packParts(parts, aspect);
    applyExplosion(parts, 1);
    for (let i = 0; i < parts.length; i++)
      for (let j = i + 1; j < parts.length; j++) {
        assert.equal(
          new T.Box3()
            .setFromObject(parts[i].mesh)
            .intersectsBox(new T.Box3().setFromObject(parts[j].mesh)),
          false,
          `${parts[i].sourceName} / ${parts[j].sourceName}`,
        );
      }
    for (const t of [0.25, 0.5, 0.75, 1, 0]) {
      applyExplosion(parts, t);
      parts.forEach((p, i) => {
        const m = p.mesh.matrixWorld.toArray();
        assert.deepEqual(m.slice(0, 12), originals[i].slice(0, 12));
        if (t === 0) assert.deepEqual(m, originals[i]);
      });
    }
  }
});
