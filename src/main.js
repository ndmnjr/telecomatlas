import { createPhoneInset } from './story/phone.js';
import { stageCopy, scenarioTitles } from './story/copy.js';
import { catalogue } from './catalogue.js';
import { filterParts } from './interaction.js';
import { createScene } from './scene.js';
import { loadScenarios } from './scenarios/data.js';
import { createJourneyController } from './scenarios/controller.js';
import { JOURNEY_TARGETS } from './scenarios/paths.js';
import { createJourneyOverlay } from './scenarios/overlay.js';
import { createJourneyPanel, journeyKeyAction } from './scenarios/panel.js';

const $ = (selector) => document.querySelector(selector);
const state = {
  amount: 0,
  selected: null,
  isolate: false,
  labels: true,
  mode: 'explore',
  journey: false,
};
let view;
let journeyController;
let journeyPanel;
let journeyOverlay;
let journeyTimer;
let phoneInset;
let technical = false;

function renderLegend() {
  const matches = filterParts(catalogue, $('#search').value);
  $('#legend').replaceChildren();
  for (const part of matches) {
    const button = document.createElement('button');
    button.className = 'part-row';
    button.dataset.part = part.number;
    button.setAttribute('aria-pressed', String(part.number === state.selected));
    const number = document.createElement('span');
    number.className = 'number';
    number.textContent = String(part.number).padStart(2, '0');
    const copy = document.createElement('span');
    copy.className = 'part-copy';
    const label = document.createElement('strong');
    label.textContent = part.label;
    const id = document.createElement('small');
    id.textContent = part.assetId ?? 'SITE CONTEXT / NO ASSET ID';
    copy.append(label, id);
    button.append(number, copy);
    button.addEventListener('click', () => select(part.number));
    $('#legend').append(button);
  }
  $('#result-count').textContent = `${matches.length} of 32 components`;
  $('#no-results').hidden = matches.length > 0;
}

function ui() {
  for (const button of document.querySelectorAll('.part-row'))
    button.setAttribute('aria-pressed', String(Number(button.dataset.part) === state.selected));
  $('#visible-count').textContent = `${state.isolate ? 1 : 32} / 32 MESHES`;
  $('#amount').value = Math.round(state.amount * 100) + '%';
  $('#explode').value = Math.round(state.amount * 100);
  $('#assembled').setAttribute('aria-pressed', String(state.amount === 0));
  $('#exploded').setAttribute('aria-pressed', String(state.amount === 1));
  $('#labels').setAttribute('aria-pressed', String(state.labels));
  $('#labels-state').textContent = state.labels ? 'on' : 'off';
  for (const mode of ['explore', 'inspect', 'journeys'])
    $('#' + mode).setAttribute('aria-pressed', String(state.mode === mode));
  const part = view?.parts.find((item) => item.number === state.selected);
  $('#detail-kicker').textContent = part
    ? `PART ${String(part.number).padStart(2, '0')} / ${part.group.toUpperCase()}`
    : 'INSPECT A COMPONENT';
  $('#detail-title').textContent = part ? part.label : 'The whole is in the details.';
  $('#detail-description').textContent = part
    ? part.description
    : 'Choose any numbered part to bring it closer and see its role in this demonstration site.';
  $('#detail-meta').hidden = $('#function-note').hidden = !part;
  if (part) {
    $('#mesh-name').textContent = part.sourceName;
    $('#asset-id').textContent = part.assetId ?? 'None · source site context';
    $('#function-note').textContent = part.assetId
      ? 'Illustrative function from the demonstration inventory.'
      : 'Context explanation authored for this viewer; absent from the equipment inventory.';
  }
  $('#isolate').disabled = !part;
  $('#isolate').textContent = state.isolate ? 'Show all' : 'Isolate selected ↗';
  if (!state.journey) {
    $('#view-name').textContent = state.isolate
      ? 'ISOLATED COMPONENT'
      : state.selected
        ? 'COMPONENT DETAIL'
        : state.amount === 0
          ? 'ASSEMBLED SITE'
          : state.amount === 1
            ? 'COMPONENT ATLAS'
            : 'SEPARATING COMPONENTS';
    $('#view-subtitle').textContent = state.selected
      ? 'Use Show all to return to the complete site'
      : '32 component meshes · 11 equipment assets';
  }
}

function inspectedPart() {
  return view?.parts.find((part) => part.number === state.selected) ?? null;
}

function renderJourney() {
  if (!state.journey || !journeyController || !view) return;
  const scenario = journeyController.getScenario();
  const stage = journeyController.getStage();
  const journeyState = journeyController.getState();
  const story = journeyController.getStoryState(
    matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  view.journey(stage, story);
  phoneInset.render(story);
  renderJourneyVisual();
  journeyPanel.render(scenario, stage, journeyState, inspectedPart());
  $('#view-name').textContent = stageCopy(stage, technical).title.toUpperCase();
  $('#view-subtitle').textContent =
    `${scenarioTitles[scenario.id]} · ${stage.order} of ${scenario.stages.length}`;
}

function renderJourneyVisual() {
  if (!state.journey || !journeyController) return;
  const inventoryIds = Object.entries(JOURNEY_TARGETS)
    .filter(([, target]) => target.kind === 'inventory')
    .map(([id]) => id);
  journeyOverlay.render(
    journeyController.getScenario(),
    journeyController.getStage(),
    view.projectAnchors(inventoryIds),
    journeyController.getState(),
    matchMedia('(prefers-reduced-motion: reduce)').matches,
    view.storyVisual(),
    technical,
  );
}

function select(number) {
  if (!view) return;
  state.selected = number;
  state.isolate = false;
  if (state.journey) journeyController.pauseForInspection();
  else state.mode = 'inspect';
  ui();
  view.change('selection');
  renderJourney();
}

function showAll() {
  state.selected = null;
  state.isolate = false;
  ui();
  view?.change('selection');
  renderJourney();
}

function explode(amount) {
  state.amount = amount;
  ui();
  view?.change('amount');
}

function setMode(mode) {
  state.mode = mode;
  state.journey = mode === 'journeys';
  document.body.dataset.mode = mode;
  $('#journey-panel').hidden = !state.journey;
  $('#journey-overlay').hidden = !state.journey;
  if (state.journey) {
    state.amount = 0;
    state.isolate = false;
    explode(0);
    journeyOverlay.clear();
    renderJourney();
  } else {
    journeyController?.pause();
    journeyOverlay?.clear();
    view?.clearJourney();
    if (mode === 'explore') showAll();
    else if (!state.selected) select(10);
  }
  ui();
}

$('#search').addEventListener('input', renderLegend);
$('#show-all').addEventListener('click', showAll);
$('#explore').addEventListener('click', () => setMode('explore'));
$('#journeys').addEventListener('click', () => setMode('journeys'));
$('#inspect').addEventListener('click', () => {
  setMode('inspect');
  $('#detail-title').setAttribute('tabindex', '-1');
  $('#detail-title').focus({ preventScroll: true });
  if (innerWidth <= 720) $('#detail-title').scrollIntoView({ block: 'center' });
});
$('#isolate').addEventListener('click', () => {
  if (state.isolate) return showAll();
  state.isolate = true;
  ui();
  view?.change('selection');
});
$('#assembled').addEventListener('click', () => explode(0));
$('#exploded').addEventListener('click', () => explode(1));
$('#explode').addEventListener('input', (event) => explode(Number(event.target.value) / 100));
$('#reset').addEventListener('click', () => view?.reset());
$('#labels').addEventListener('click', () => {
  state.labels = !state.labels;
  ui();
  view?.change('labels');
});
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
    event.preventDefault();
    $('#search').focus();
  }
  if (state.journey) {
    const action = journeyKeyAction({ key: event.key, tagName: event.target.tagName });
    if (action) {
      event.preventDefault();
      if (action === 'toggle') journeyController.toggle();
      else if (action === 'next') journeyController.next();
      else if (action === 'previous') journeyController.previous();
      else if (action === 'first') journeyController.seekStage(0);
      else journeyController.seekStage(journeyController.getScenario().stages.length - 1);
      return;
    }
  }
  if (event.key === 'Escape') {
    if (event.target === $('#search')) {
      $('#search').value = '';
      renderLegend();
    } else showAll();
  }
});

function error(message) {
  const loading = $('#loading');
  loading.hidden = false;
  loading.setAttribute('role', 'alert');
  loading.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = 'The site could not be opened';
  const detail = document.createElement('span');
  detail.textContent = message;
  const retry = document.createElement('button');
  retry.textContent = 'Reload viewer';
  retry.addEventListener('click', () => location.reload());
  loading.append(title, detail, retry);
}
document.addEventListener('atlas-error', (event) => error(event.detail));
renderLegend();

try {
  const [scene, scenarios] = await Promise.all([
    createScene($('#stage'), state, select),
    loadScenarios(),
  ]);
  view = scene;
  journeyController = createJourneyController(scenarios);
  journeyOverlay = createJourneyOverlay($('#journey-overlay'), (assetId) => {
    const part = view.parts.find((item) => item.assetId === assetId);
    if (part) select(part.number);
  });
  phoneInset = createPhoneInset($('#stage'), () => journeyController.seekStage(7));
  journeyPanel = createJourneyPanel($('#journey-panel'), scenarios, {
    selectScenario: journeyController.selectScenario,
    previous: journeyController.previous,
    next: journeyController.next,
    toggle: journeyController.toggle,
    seekStage: journeyController.seekStage,
    resume: journeyController.resumeAfterInspection,
    terms(value) {
      technical = value;
      renderJourney();
    },
  });
  view.onProjection(renderJourneyVisual);
  journeyController.subscribe(renderJourney);
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  motionPreference.addEventListener('change', renderJourney);
  journeyTimer = setInterval(() => journeyController.advance(100), 100);
  ui();
  $('#loading').hidden = true;
  window.atlas = Object.freeze({
    ready: true,
    audit: () => view.audit(),
    pickPoint: (number) => view.pickPoint(number),
    journey: () => ({
      mode: state.mode,
      ...journeyController.getState(),
      scenarioId: journeyController.getScenario().id,
      stageId: journeyController.getStage().id,
      story: journeyController.getStoryState(
        matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
    }),
  });
  window.addEventListener(
    'pagehide',
    () => {
      clearInterval(journeyTimer);
      motionPreference.removeEventListener('change', renderJourney);
      view.dispose();
    },
    { once: true },
  );
} catch (cause) {
  error(cause.message || 'Enable WebGL in your browser and reload.');
}
