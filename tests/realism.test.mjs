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

test('routes: browse cycle follows exact direction, endpoints, ground fiber and tower cable', async () => {
  const { siteRoutes } = await import('../src/story/ground-path.js');
  const { DIRECTION, JOURNEY_PATHS } = await import('../src/scenarios/paths.js');
  const phone = new T.Vector3(3.78, 1.17, 3.605);
  const routes = siteRoutes(parts, phone);
  const panel = parts.find((p) => p.sourceName === 'Panel Antenna A');
  assert.deepEqual(routes.anchors['DEMO-SECTOR-A'].toArray(), [
    panel.center.x,
    panel.center.y,
    panel.bounds.max.z,
  ]);
  const fiber = routes.paths['browse-response-transport-to-access'];
  assert.ok(fiber.points.every((point) => point.y <= routes.anchors.odf.y));
  assert.ok(fiber.points[0].equals(routes.anchors['transport-cloud']));
  assert.ok(fiber.points.at(-1).equals(routes.anchors['access-fiber']));
  const riser = routes.paths['ran-to-radio'].points;
  assert.ok(riser.some((p) => p.equals(parts.find((p) => p.sourceName === 'Cable Tray').center)));
  assert.ok(riser.at(-1).y > 5);
  for (const id of scenarios[0].stages.at(-1).paths)
    assert.equal(routes.paths[id].bidirectional, true);
  for (const [id, definition] of Object.entries(JOURNEY_PATHS)) {
    assert.equal(routes.paths[id].direction, definition.direction);
    assert.equal(routes.paths[id].bidirectional, definition.direction === DIRECTION.BIDIRECTIONAL);
    assert.deepEqual(
      [routes.paths[id].from, routes.paths[id].to],
      [definition.from, definition.to],
      `${id} endpoint metadata`,
    );
    assert.ok(routes.paths[id].points[0].equals(routes.anchors[definition.from]), `${id} from`);
    assert.ok(routes.paths[id].points.at(-1).equals(routes.anchors[definition.to]), `${id} to`);
  }
  assert.ok(
    Object.values(routes.paths).every(
      (p) => !p.handoffs.some((id) => /POWER|SHELTER|TOWER/.test(id)),
    ),
  );
});

test('rf: four curved wavefronts use exact directional endpoints and static reduced motion', async () => {
  const { rfWavefronts } = await import('../src/story/rf.js');
  const { DIRECTION } = await import('../src/scenarios/paths.js');
  const sector = { x: 52, y: 118 },
    phone = { x: 271, y: 362 };
  const downlink = rfWavefronts(sector, phone, 0.1, false, DIRECTION.DOWNLINK);
  const later = rfWavefronts(sector, phone, 0.3, false, DIRECTION.DOWNLINK);
  assert.deepEqual(downlink.from, sector);
  assert.deepEqual(downlink.to, phone);
  assert.equal(downlink.waves.length, 4);
  assert.ok(
    downlink.waves.every((wave) => wave.d.includes(' Q ') && wave.direction === DIRECTION.DOWNLINK),
  );
  assert.notDeepEqual(downlink.waves, later.waves);
  assert.deepEqual(
    rfWavefronts(phone, sector, 0.1, true, DIRECTION.UPLINK),
    rfWavefronts(phone, sector, 0.8, true, DIRECTION.UPLINK),
  );
  const uplink = rfWavefronts(phone, sector, 0.2, false, DIRECTION.UPLINK);
  assert.deepEqual([uplink.from, uplink.to], [phone, sector]);
  assert.deepEqual(new Set(uplink.waves.map((wave) => wave.direction)), new Set(['uplink']));
  assert.deepEqual(
    new Set(
      rfWavefronts(sector, phone, 0.2, false, DIRECTION.BIDIRECTIONAL).waves.map(
        (wave) => wave.direction,
      ),
    ),
    new Set(['outbound', 'inbound']),
  );
});

test('site network strip keeps only grounded transport, user-plane, Internet and patching roles', async () => {
  const { createSiteNetworkStrip } = await import('../src/story/ground-path.js');
  const strip = createSiteNetworkStrip();
  assert.equal(strip.group.name, 'site-network-strip');
  assert.deepEqual(
    strip.group.children.map((object) => object.name),
    [
      'internet-data-network-edge',
      'packet-user-plane-edge',
      'transport-edge',
      'fiber-patch-panel',
      'site-router',
      'radio-unit',
    ],
  );
  strip.group.traverse((object) => assert.equal(object.userData.assetId, undefined));
  strip.dispose();
});

test('state: declarative story survives scenario reordering and every visual stage has motion-independent text', async () => {
  const { validateScenarios } = await import('../src/scenarios/schema.js');
  const { JOURNEY_PATHS, JOURNEY_TARGETS } = await import('../src/scenarios/paths.js');
  for (const scenario of scenarios)
    for (const stage of scenario.stages) {
      assert.equal(scenario.storyContext, 'site');
      assert.ok(stage.story.phase && stage.story.phone && typeof stage.story.rf === 'boolean');
    }
  const reordered = [scenarios[1], scenarios[0]];
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
