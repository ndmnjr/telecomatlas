import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { validateScenarios } from '../src/scenarios/schema.js';
import { createJourneyController } from '../src/scenarios/controller.js';
import {
  DIRECTION,
  JOURNEY_PATHS,
  JOURNEY_TARGETS,
  pathVisualState,
} from '../src/scenarios/paths.js';
import { createOverlayModel, pulseDirections } from '../src/scenarios/overlay.js';
import { panelViewModel, journeyKeyAction } from '../src/scenarios/panel.js';

const scenarios = JSON.parse(await fs.readFile('src/scenarios/scenarios.json', 'utf8'));
const clone = (value) => structuredClone(value);

function validate(value = scenarios) {
  return validateScenarios(value, {
    targets: JOURNEY_TARGETS,
    paths: JOURNEY_PATHS,
  });
}

test('two integrated service stories validate with unique contiguous stages', () => {
  const result = validate();
  assert.equal(result.length, 2);
  assert.deepEqual(
    result.map((scenario) => scenario.id),
    ['incoming-call', 'browse-internet'],
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
    validated.map((scenario) => scenario.sources),
    [
      [
        {
          label: '3GPP VoLTE / VoNR overview',
          url: 'https://www.3gpp.org/technologies/volte-vonr',
        },
        {
          label: '3GPP TS 23.228',
          url: 'https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=821',
        },
        {
          label: 'GSMA VoLTE',
          url: 'https://www.gsma.com/solutions-and-impact/technologies/networks/ip_services/volte',
        },
      ],
      [
        {
          label: '3GPP 5G System overview',
          url: 'https://www.3gpp.org/technologies/5g-system-overview',
        },
        {
          label: '3GPP TS 23.501',
          url: 'https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=3144',
        },
      ],
    ],
  );
  assert.doesNotMatch(JSON.stringify(validated), /volte-vnr/);

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

test('all path endpoints exist and exact incoming-call mappings are stable', () => {
  for (const [id, path] of Object.entries(JOURNEY_PATHS)) {
    assert.ok(JOURNEY_TARGETS[path.from], `${id} from ${path.from}`);
    assert.ok(JOURNEY_TARGETS[path.to], `${id} to ${path.to}`);
  }

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

test('browse follows the full uplink-response cycle with RF, media and control planes', () => {
  const browse = validate().find((scenario) => scenario.id === 'browse-internet');
  assert.equal(browse.technology, 'Mobile data over 4G/5G — conceptual');
  assert.deepEqual(
    browse.stages.map((stage) => stage.id),
    [
      'open-website',
      'send-uplink',
      'convert-to-data',
      'carry-fiber',
      'route-internet',
      'response-return',
      'page-loaded',
    ],
  );
  assert.deepEqual(
    browse.stages.slice(0, 5).map((stage) => stage.activePlane),
    ['control', 'control', 'control', 'control', 'control'],
  );
  assert.equal(browse.stages[browse.stages.length - 1].activePlane, 'media');
  assert.equal(browse.stages[0].paths.length, 0);
  assert.ok(browse.stages.some((stage) => stage.paths.includes('browse-uplink')));
  assert.ok(browse.stages.some((stage) => stage.paths.includes('browse-response-sector-to-phone')));
  assert.ok(browse.stages.some((stage) => stage.story.rf === true));
  assert.equal(browse.stages[browse.stages.length - 1].story.phone, 'loaded');
  assert.ok(browse.stages.every((stage) => stage.story && stage.story.phase));
});

test('browse request and response explicitly reverse every physical handoff', () => {
  const browse = validate().find((scenario) => scenario.id === 'browse-internet');
  const request = [
    'browse-uplink',
    'browse-request-sector-to-radio',
    'browse-request-radio-to-cabinet',
    'browse-request-cabinet-to-router',
    'browse-request-router-to-odf',
    'browse-request-odf-to-access',
    'browse-request-access-to-transport',
    'browse-request-transport-to-user-plane',
    'browse-request-user-plane-to-internet',
  ];
  const response = [
    'browse-response-internet-to-user-plane',
    'browse-response-user-plane-to-transport',
    'browse-response-transport-to-access',
    'browse-response-access-to-odf',
    'browse-response-odf-to-router',
    'browse-response-router-to-cabinet',
    'browse-response-cabinet-to-radio',
    'browse-response-radio-to-sector',
    'browse-response-sector-to-phone',
  ];
  const endpoints = (ids) => ids.map((id) => [JOURNEY_PATHS[id].from, JOURNEY_PATHS[id].to]);
  assert.deepEqual(endpoints(request), [
    ['receiving-phone', 'DEMO-SECTOR-A'],
    ['DEMO-SECTOR-A', 'radio-unit'],
    ['radio-unit', 'DEMO-CABINET-01'],
    ['DEMO-CABINET-01', 'site-router'],
    ['site-router', 'odf'],
    ['odf', 'access-fiber'],
    ['access-fiber', 'transport-cloud'],
    ['transport-cloud', 'user-plane'],
    ['user-plane', 'internet-service'],
  ]);
  assert.deepEqual(
    endpoints(response),
    endpoints(request)
      .toReversed()
      .map(([from, to]) => [to, from]),
  );
  assert.ok(request.every((id) => JOURNEY_PATHS[id].direction === DIRECTION.UPLINK));
  assert.ok(response.every((id) => JOURNEY_PATHS[id].direction === DIRECTION.DOWNLINK));
  assert.deepEqual(browse.stages.find((stage) => stage.id === 'route-internet').paths, request);
  assert.deepEqual(browse.stages.find((stage) => stage.id === 'response-return').paths, response);
  assert.deepEqual(browse.stages.find((stage) => stage.id === 'page-loaded').paths, [
    'browse-response-radio-to-sector',
    'browse-response-sector-to-phone',
  ]);
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
  controller.selectScenario('browse-internet');
  assert.equal(controller.getScenario().id, 'browse-internet');
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

test('pulse directions exactly follow controlled route direction metadata', () => {
  assert.deepEqual(pulseDirections({ direction: DIRECTION.UPLINK }), ['uplink']);
  assert.deepEqual(pulseDirections({ direction: DIRECTION.DOWNLINK }), ['downlink']);
  assert.deepEqual(pulseDirections({ direction: DIRECTION.BIDIRECTIONAL }), [
    'outbound',
    'inbound',
  ]);
  assert.deepEqual(pulseDirections({}), ['outbound']);
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
      assert.deepEqual(model.activePaths.map((path) => path.id).sort(), [...stage.paths].sort());
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
