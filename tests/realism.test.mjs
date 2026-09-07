import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { validateModel } from '../src/catalogue.js';
import { prepareParts } from '../src/layout.js';
import { createJourneyController } from '../src/scenarios/controller.js';

const scenarios = JSON.parse(await fs.readFile('src/scenarios/scenarios.json', 'utf8'));
const buffer = await fs.readFile('public/assets/telecom_site.glb');
const gltf = await new GLTFLoader().parseAsync(
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  '',
);
const parts = validateModel(
  gltf,
  JSON.parse(await fs.readFile('public/assets/telecom_inventory.json', 'utf8')),
);
prepareParts(parts);

test('actors: grounded human scale, attached handset, deterministic walk and static reduced motion', async () => {
  const { createStoryActors } = await import('../src/story/actors.js');
  const actors = createStoryActors(parts);
  assert.equal(actors.group.name, 'storyActors');
  actors.group.traverse((object) => assert.equal(object.userData.assetId, undefined));
  const controller = createJourneyController(scenarios);
  actors.update(controller.getStoryState(false));
  let audit = actors.audit();
  assert.equal(audit.footY, parts[0].bounds.max.y);
  assert.ok(audit.height >= 1.6 && audit.height <= 1.9);
  assert.ok(audit.phoneHandDistance < 0.12);
  const start = audit.person;
  controller.play();
  controller.advance(2000);
  actors.update(controller.getStoryState(false));
  assert.notDeepEqual(actors.audit().person, start);
  controller.seekStage(6);
  actors.update(controller.getStoryState(true));
  audit = actors.audit();
  controller.advance(500);
  actors.update(controller.getStoryState(true));
  assert.deepEqual(actors.audit(), audit);
  assert.equal(controller.getStoryState(true).phone, 'ringing');
  controller.seekStage(7);
  assert.equal(controller.getStoryState(false).phone, 'connected');
  assert.equal(parts.length, 32);
  assert.equal(new Set(parts.map((p) => p.assetId).filter(Boolean)).size, 11);
  actors.dispose();
});

test('copy: every stage has plain language and technical equivalent without changing playback', async () => {
  const { stageCopy, PUBLIC_DISCLAIMER } = await import('../src/story/copy.js');
  for (const scenario of scenarios)
    for (const stage of scenario.stages) {
      const simple = stageCopy(stage, false),
        technical = stageCopy(stage, true);
      assert.ok(simple.title && simple.text && technical.title && technical.text);
      assert.doesNotMatch(simple.title, /\b(IMS|SIP|RF|DU|CU|ODF|RAN|KPI)\b/);
    }
  assert.match(PUBLIC_DISCLAIMER, /operator's actual topology/);
  const controller = createJourneyController(scenarios);
  controller.seekStage(6);
  assert.equal(controller.getStoryState().phone, 'ringing');
  const { phoneViewModel } = await import('../src/story/phone.js');
  assert.equal(phoneViewModel(controller.getStoryState()).title, 'Incoming call');
  assert.equal(phoneViewModel(controller.getStoryState(true)).motion, 'static-ring');
  controller.seekStage(7);
  assert.equal(phoneViewModel(controller.getStoryState()).title, 'Connected');
});

test('routes: exact panel anchor, ground fiber and tray-to-tower handoffs, bidirectional media', async () => {
  const { siteRoutes } = await import('../src/story/ground-path.js');
  const phone = new T.Vector3(3.78, 1.17, 3.605);
  const routes = siteRoutes(parts, phone);
  const panel = parts.find((p) => p.sourceName === 'Panel Antenna A');
  assert.deepEqual(routes.anchors['DEMO-SECTOR-A'].toArray(), [
    panel.center.x,
    panel.center.y,
    panel.bounds.max.z,
  ]);
  const fiber = routes.paths['transport-to-ran'];
  assert.ok(fiber.points[0].y <= 0.15);
  for (const id of ['access-fiber', 'odf', 'site-router', 'DEMO-CABINET-01'])
    assert.ok(
      fiber.points.some((p) => p.equals(routes.anchors[id])),
      id,
    );
  const riser = routes.paths['ran-to-radio'].points;
  assert.ok(riser.some((p) => p.equals(parts.find((p) => p.sourceName === 'Cable Tray').center)));
  assert.ok(riser.at(-1).y > 5);
  for (const id of scenarios[0].stages.at(-1).paths)
    assert.equal(routes.paths[id].bidirectional, true);
  assert.ok(
    Object.values(routes.paths).every(
      (p) => !p.handoffs.some((id) => /POWER|SHELTER|TOWER/.test(id)),
    ),
  );
});

test('rf: four curved wavefronts use exact antenna and phone endpoints, reverse media and static reduced motion', async () => {
  const { rfWavefronts } = await import('../src/story/rf.js');
  const from = { x: 52, y: 118 },
    to = { x: 271, y: 362 };
  const a = rfWavefronts(from, to, 0.1, false, false);
  const b = rfWavefronts(from, to, 0.3, false, false);
  assert.deepEqual(a.from, from);
  assert.deepEqual(a.to, to);
  assert.equal(a.waves.length, 4);
  assert.ok(a.waves.every((w) => w.d.includes(' Q ') && w.direction === 'outbound'));
  assert.notDeepEqual(a.waves, b.waves);
  assert.deepEqual(
    rfWavefronts(from, to, 0.1, true, true),
    rfWavefronts(from, to, 0.8, true, true),
  );
  assert.deepEqual(
    new Set(rfWavefronts(from, to, 0.2, false, true).waves.map((w) => w.direction)),
    new Set(['outbound', 'inbound']),
  );
});

test('scenes: transport is a grounded cross-section with a second duct and two microwave towers; core is a separate cutaway', async () => {
  const { createStoryScenes } = await import('../src/story/scenes.js');
  const scenes = createStoryScenes(parts);
  scenes.group.traverse((object) => assert.equal(object.userData.assetId, undefined));
  const transport = scenes.model('transport');
  for (const id of [
    'site-to-router',
    'router-to-odf',
    'odf-to-access',
    'access-to-aggregation',
    'aggregation-to-metro',
    'metro-to-datacenter',
    'protection-route',
  ])
    assert.ok(
      transport.paths[id].points.every((p) => p.y <= 0.35),
      id,
    );
  assert.ok(transport.paths['protection-route'].points.some((p) => p.y < -0.5));
  assert.equal(transport.paths['sync-service'].plane, 'support');
  assert.equal(transport.towers.length, 2);
  const microwave = transport.paths['microwave-branch'];
  assert.deepEqual(microwave.points[0], transport.towers[0]);
  assert.deepEqual(microwave.points.at(-1), transport.towers[1]);
  scenes.update('core');
  assert.equal(scenes.core.visible, true);
  assert.equal(scenes.transport.visible, false);
  assert.ok(scenes.core.getObjectByName('data-centre-exterior'));
  assert.ok(scenes.core.getObjectByName('network-fabric'));
  assert.equal(scenes.model('core').layers.length, 4);
  assert.ok(scenes.model('core').rackCount > scenes.model('core').layers.length);
  scenes.update('site');
  assert.equal(scenes.core.visible, false);
  assert.equal(scenes.transport.visible, false);
  scenes.dispose();
});

test('state: declarative story survives scenario reordering and every visual stage has motion-independent text', async () => {
  const { validateScenarios } = await import('../src/scenarios/schema.js');
  const { JOURNEY_PATHS, JOURNEY_TARGETS } = await import('../src/scenarios/paths.js');
  for (const scenario of scenarios)
    for (const stage of scenario.stages) {
      assert.ok(['site', 'transport', 'core'].includes(scenario.storyContext));
      assert.ok(stage.story.phase && stage.story.phone && typeof stage.story.rf === 'boolean');
    }
  const reordered = [scenarios[2], scenarios[0], scenarios[1]];
  const controller = createJourneyController(reordered);
  controller.selectScenario('incoming-call');
  controller.seekStage(6);
  assert.equal(controller.getStoryState(true).context, 'site');
  assert.equal(controller.getStoryState(true).phone, 'ringing');
  controller.play();
  controller.advance(400);
  assert.equal(controller.getStoryState(true).progress, 0);
  const bad = structuredClone(scenarios);
  bad[0].stages[6].story.phone = 'private-number';
  assert.throws(
    () => validateScenarios(bad, { targets: JOURNEY_TARGETS, paths: JOURNEY_PATHS }),
    /story/i,
  );
});

test('sequence: preparation climbs the tower cable before the radio-wave and ringing stages', () => {
  const stages = scenarios[0].stages;
  assert.ok(stages.find((s) => s.story.phase === 'prepare').paths.includes('ran-to-radio'));
  assert.ok(stages.find((s) => s.story.phase === 'radio').paths.includes('sector-to-phone'));
  assert.equal(stages.find((s) => s.story.phase === 'prepare').story.rf, false);
});
