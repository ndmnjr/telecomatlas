import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { validateScenarios } from '../src/scenarios/schema.js';
import { createJourneyController } from '../src/scenarios/controller.js';
import { JOURNEY_PATHS, JOURNEY_TARGETS, pathVisualState } from '../src/scenarios/paths.js';
import { createOverlayModel } from '../src/scenarios/overlay.js';
import { panelViewModel, journeyKeyAction } from '../src/scenarios/panel.js';

const scenarios = JSON.parse(await fs.readFile('src/scenarios/scenarios.json', 'utf8'));
const clone = (value) => structuredClone(value);

function validate(value = scenarios) {
  return validateScenarios(value, {
    targets: JOURNEY_TARGETS,
    paths: JOURNEY_PATHS,
  });
}

test('three synthetic vendor-neutral scenarios validate with unique contiguous stages', () => {
  const result = validate();
  assert.equal(result.length, 3);
  assert.deepEqual(
    result.map((scenario) => scenario.id),
    ['incoming-call', 'core-team', 'transport-fiber'],
  );
  for (const scenario of result) {
    assert.equal(scenario.scope, 'synthetic-vendor-neutral');
    assert.deepEqual(
      scenario.stages.map((stage) => stage.order),
      scenario.stages.map((_, index) => index + 1),
    );
  }
});

test('scenario standards sources are non-empty HTTPS links on official standards hosts', () => {
  const validated = validate();
  assert.deepEqual(
    validated.map((scenario) => scenario.sources.map((source) => source.label)),
    [
      ['3GPP VoLTE / VoNR overview', '3GPP TS 23.228', 'GSMA VoLTE'],
      ['3GPP VoLTE / VoNR overview', '3GPP TS 23.228', 'GSMA VoLTE'],
      ['ITU-T GSTR-TN5G', 'O-RAN WG4'],
    ],
  );

  let bad = clone(scenarios);
  bad[0].sources[0].url = 'http://www.3gpp.org/technologies/volte-vonr';
  assert.throws(() => validate(bad), /source URL/i);
  bad = clone(scenarios);
  bad[0].sources[0].url = 'https://standards.example/volte';
  assert.throws(() => validate(bad), /source URL/i);
  bad = clone(scenarios);
  bad[0].sources[0].label = '   ';
  assert.throws(() => validate(bad), /source label/i);
});

test('schema rejects duplicate stages, missing targets, unknown paths, invalid enums and unsafe public fields', () => {
  let bad = clone(scenarios);
  bad[0].stages[1].id = bad[0].stages[0].id;
  assert.throws(() => validate(bad), /duplicate stage id/i);
  bad = clone(scenarios);
  bad[0].stages[1].order = 7;
  assert.throws(() => validate(bad), /contiguous/i);
  bad = clone(scenarios);
  bad[0].stages[0].focus = ['REAL-SECRET-ASSET'];
  assert.throws(() => validate(bad), /unknown target/i);
  bad = clone(scenarios);
  bad[0].stages[0].paths = ['unknown-route'];
  assert.throws(() => validate(bad), /unknown path/i);
  bad = clone(scenarios);
  bad[0].stages[0].activePlane = 'management';
  assert.throws(() => validate(bad), /activePlane/i);
  for (const [field, value] of [
    ['operator', 'Example operator'],
    ['coordinates', [24.1, 46.2]],
    ['capacity', '10 Gbit/s'],
    ['ipAddress', '10.0.0.1'],
    ['alarm', 'active'],
  ]) {
    bad = clone(scenarios);
    bad[0][field] = value;
    assert.throws(() => validate(bad), /unsafe public field/i, field);
  }
});

test('all path endpoints exist and exact transport and incoming-call mappings are stable', () => {
  for (const [id, path] of Object.entries(JOURNEY_PATHS)) {
    assert.ok(JOURNEY_TARGETS[path.from], `${id} from ${path.from}`);
    assert.ok(JOURNEY_TARGETS[path.to], `${id} to ${path.to}`);
  }
  assert.deepEqual(
    [
      'site-to-router',
      'router-to-odf',
      'odf-to-access',
      'access-to-aggregation',
      'aggregation-to-metro',
      'metro-to-datacenter',
    ].map((id) => [JOURNEY_PATHS[id].from, JOURNEY_PATHS[id].to]),
    [
      ['DEMO-CABINET-01', 'site-router'],
      ['site-router', 'odf'],
      ['odf', 'access-fiber'],
      ['access-fiber', 'aggregation'],
      ['aggregation', 'metro-core'],
      ['metro-core', 'data-center'],
    ],
  );
  assert.deepEqual(
    [
      'caller-to-ims',
      'core-to-transport',
      'transport-to-ran',
      'ran-to-radio',
      'radio-to-sector',
      'sector-to-phone',
    ].map((id) => [JOURNEY_PATHS[id].from, JOURNEY_PATHS[id].to]),
    [
      ['remote-caller', 'ims-service'],
      ['packet-core', 'transport-cloud'],
      ['transport-cloud', 'DEMO-CABINET-01'],
      ['DEMO-CABINET-01', 'radio-unit'],
      ['radio-unit', 'DEMO-SECTOR-A'],
      ['DEMO-SECTOR-A', 'receiving-phone'],
    ],
  );
});

test('connected conversation follows an ordered segmented green media path through every service handoff', () => {
  const incoming = validate().find((scenario) => scenario.id === 'incoming-call');
  const connected = incoming.stages.find((stage) => stage.id === 'connected-conversation');
  const expectedPaths = [
    'media-caller-to-user-plane',
    'media-user-plane-to-transport',
    'media-transport-to-site',
    'media-site-to-radio',
    'media-radio-to-sector',
    'media-sector-to-phone',
  ];
  assert.equal(JOURNEY_PATHS['media-end-to-end'], undefined);
  assert.deepEqual(connected.paths, expectedPaths);
  assert.deepEqual(connected.focus, [
    'remote-caller',
    'user-plane',
    'transport-cloud',
    'DEMO-CABINET-01',
    'radio-unit',
    'DEMO-SECTOR-A',
    'receiving-phone',
  ]);
  assert.deepEqual(
    expectedPaths.map((id) => [JOURNEY_PATHS[id].from, JOURNEY_PATHS[id].to]),
    [
      ['remote-caller', 'user-plane'],
      ['user-plane', 'transport-cloud'],
      ['transport-cloud', 'DEMO-CABINET-01'],
      ['DEMO-CABINET-01', 'radio-unit'],
      ['radio-unit', 'DEMO-SECTOR-A'],
      ['DEMO-SECTOR-A', 'receiving-phone'],
    ],
  );
  assert.ok(expectedPaths.every((id) => JOURNEY_PATHS[id].plane === 'media'));
});

test('incoming call distinguishes conditional paging, signalling, media and support systems', () => {
  const incoming = validate().find((scenario) => scenario.id === 'incoming-call');
  assert.equal(incoming.technology, 'IMS voice over 4G/5G — conceptual');
  const paging = incoming.stages.find((stage) => stage.id === 'page-and-prepare');
  assert.equal(
    paging.condition,
    'Paging occurs when the device is not already reachable through an active connection.',
  );
  assert.equal(paging.activePlane, 'control');
  assert.equal(incoming.stages.at(-1).activePlane, 'media');
  assert.ok(incoming.stages.some((stage) => stage.support.includes('DEMO-POWER-01')));
  assert.ok(
    incoming.stages.every(
      (stage) => !stage.paths.some((id) => JOURNEY_PATHS[id].plane === 'support'),
    ),
  );
});

test('transport follows the functional order with green payload, dashed protection, amber sync and optional microwave', () => {
  const transport = validate().find((scenario) => scenario.id === 'transport-fiber');
  const payloadPaths = [
    'site-to-router',
    'router-to-odf',
    'odf-to-access',
    'access-to-aggregation',
    'aggregation-to-metro',
    'metro-to-datacenter',
  ];
  assert.deepEqual(
    transport.stages.slice(0, 5).map((stage) => stage.paths),
    [
      ['site-to-router'],
      ['router-to-odf'],
      ['odf-to-access'],
      ['access-to-aggregation'],
      ['aggregation-to-metro', 'metro-to-datacenter'],
    ],
  );
  assert.deepEqual(
    [
      'DEMO-CABINET-01',
      'site-router',
      'odf',
      'access-fiber',
      'aggregation',
      'metro-core',
      'data-center',
    ].map((id) => JOURNEY_TARGETS[id].x),
    [16, 28, 40, 53, 65, 77, 89],
  );
  assert.deepEqual(
    transport.stages.slice(0, 5).map((stage) => stage.id),
    ['site-handoff', 'patch-to-fiber', 'access-fiber', 'aggregate-sites', 'metro-core'],
  );
  assert.deepEqual(
    transport.stages.slice(0, 5).map((stage) => stage.focus),
    [
      ['DEMO-CABINET-01', 'site-router'],
      ['site-router', 'odf'],
      ['odf', 'access-fiber'],
      ['access-fiber', 'aggregation'],
      ['aggregation', 'metro-core', 'data-center'],
    ],
  );
  assert.ok(
    transport.stages
      .slice(0, 5)
      .every((stage) => /media and service traffic/i.test(stage.narrative)),
  );
  assert.equal(JOURNEY_PATHS['site-to-odf'], undefined);
  assert.equal(JOURNEY_PATHS['odf-to-router'], undefined);
  assert.equal(JOURNEY_PATHS['router-to-access'], undefined);
  assert.ok(payloadPaths.every((id) => JOURNEY_PATHS[id].plane === 'media'));
  assert.ok(transport.stages.slice(0, 5).every((stage) => stage.activePlane === 'media'));
  assert.ok(transport.stages.some((stage) => stage.paths.includes('protection-route')));
  assert.equal(JOURNEY_PATHS['protection-route'].kind, 'protection');
  assert.equal(JOURNEY_PATHS['protection-route'].plane, 'media');
  assert.equal(JOURNEY_PATHS['sync-service'].plane, 'support');
  assert.equal(JOURNEY_PATHS['microwave-branch'].plane, 'media');
  assert.equal(JOURNEY_PATHS['microwave-branch'].optional, true);
  assert.match(transport.disclaimer, /actual.*vary/i);
});

test('controller play, pause, previous, next, seek and scenario selection are deterministic', () => {
  const controller = createJourneyController(validate(), { stageDuration: 1000 });
  assert.deepEqual(controller.getState(), {
    scenarioIndex: 0,
    stageIndex: 0,
    playing: false,
    progress: 0,
    inspectionPaused: false,
  });
  controller.play();
  controller.advance(250);
  assert.equal(controller.getState().progress, 0.25);
  controller.advance(750);
  assert.equal(controller.getState().stageIndex, 1);
  assert.equal(controller.getState().progress, 0);
  controller.pause();
  controller.advance(5000);
  assert.equal(controller.getState().stageIndex, 1);
  controller.next();
  assert.equal(controller.getState().stageIndex, 2);
  controller.previous();
  assert.equal(controller.getState().stageIndex, 1);
  controller.seek(0.75);
  assert.equal(controller.getState().stageIndex, 6);
  controller.selectScenario('core-team');
  assert.equal(controller.getScenario().id, 'core-team');
  assert.equal(controller.getState().stageIndex, 0);
});

test('pause-to-inspect and resume preserve the current journey stage', () => {
  const controller = createJourneyController(validate());
  controller.seekStage(4);
  controller.play();
  controller.pauseForInspection();
  assert.equal(controller.getState().playing, false);
  assert.equal(controller.getState().inspectionPaused, true);
  controller.resumeAfterInspection();
  assert.equal(controller.getState().playing, true);
  assert.equal(controller.getState().stageIndex, 4);
});

test('reduced motion path state is stepped and never continuously animated', () => {
  assert.deepEqual(pathVisualState(JOURNEY_PATHS['caller-to-ims'], 0.42, true), {
    mode: 'stepped',
    active: true,
    offset: 0,
  });
  assert.deepEqual(pathVisualState(JOURNEY_PATHS['caller-to-ims'], 0.42, false), {
    mode: 'pulse',
    active: true,
    offset: 0.42,
  });
});

test('inventory overlay labels remain physical and do not imply cooling or grounding meshes', () => {
  assert.equal(JOURNEY_TARGETS['DEMO-SHELTER-01'].label, 'Equipment shelter');
  assert.equal(JOURNEY_TARGETS['DEMO-TOWER-01'].label, 'Tower structure');
  const inventoryLabels = Object.values(JOURNEY_TARGETS)
    .filter((target) => target.kind === 'inventory')
    .map((target) => target.label)
    .join(' ');
  assert.doesNotMatch(inventoryLabels, /cooling|grounding/i);
});

test('overlay model exposes each scenario target and separates path planes and support', () => {
  for (const scenario of validate()) {
    for (const stage of scenario.stages) {
      const model = createOverlayModel(scenario, stage, { 'DEMO-SECTOR-A': { x: 61, y: 21 } });
      assert.ok(model.nodes.every((node) => node.label && Number.isFinite(node.x)));
      assert.deepEqual(
        model.activePaths.map((path) => path.id),
        stage.paths,
      );
      assert.ok(
        model.nodes.filter((node) => node.active).every((node) => stage.focus.includes(node.id)),
      );
      assert.ok(
        model.nodes.filter((node) => node.support).every((node) => stage.support.includes(node.id)),
      );
      assert.ok(model.activePaths.every((path) => path.plane === JOURNEY_PATHS[path.id].plane));
    }
  }
  const radio = createOverlayModel(validate()[0], validate()[0].stages[6], {
    'DEMO-SECTOR-A': { x: 61, y: 21 },
  }).nodes.find((node) => node.id === 'DEMO-SECTOR-A');
  assert.deepEqual({ x: radio.x, y: radio.y }, { x: 61, y: 21 });
});

test('panel model has stable progress, disabled endpoints and keyboard actions', () => {
  const controller = createJourneyController(validate());
  let model = panelViewModel(
    controller.getScenario(),
    controller.getStage(),
    controller.getState(),
  );
  assert.equal(model.stepText, 'Step 1 of 8');
  assert.equal(model.previousDisabled, true);
  assert.equal(model.nextDisabled, false);
  assert.equal(model.timelineValue, 0);
  assert.deepEqual(
    model.sources.map(({ label, url, target, rel }) => ({ label, url, target, rel })),
    scenarios[0].sources.map((source) => ({
      ...source,
      target: '_blank',
      rel: 'noopener',
    })),
  );
  controller.seekStage(7);
  model = panelViewModel(controller.getScenario(), controller.getStage(), controller.getState());
  assert.equal(model.previousDisabled, false);
  assert.equal(model.nextDisabled, true);
  assert.equal(model.timelineValue, 7);
  assert.equal(journeyKeyAction({ key: ' ', tagName: 'DIV' }), 'toggle');
  assert.equal(journeyKeyAction({ key: 'ArrowRight', tagName: 'DIV' }), 'next');
  assert.equal(journeyKeyAction({ key: 'ArrowLeft', tagName: 'DIV' }), 'previous');
  assert.equal(journeyKeyAction({ key: 'Home', tagName: 'DIV' }), 'first');
  assert.equal(journeyKeyAction({ key: 'End', tagName: 'DIV' }), 'last');
  assert.equal(journeyKeyAction({ key: ' ', tagName: 'BUTTON' }), null);
});
