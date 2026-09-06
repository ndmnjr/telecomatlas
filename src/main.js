import { catalogue } from './catalogue.js';
import { filterParts } from './interaction.js';
import { createScene } from './scene.js';
const $ = (s) => document.querySelector(s);
const state = { amount: 0, selected: null, isolate: false, labels: true };
let view;
function renderLegend() {
  const matches = filterParts(catalogue, $('#search').value);
  $('#legend').replaceChildren();
  for (const p of matches) {
    const b = document.createElement('button');
    b.className = 'part-row';
    b.dataset.part = p.number;
    b.setAttribute('aria-pressed', String(p.number === state.selected));
    const n = document.createElement('span');
    n.className = 'number';
    n.textContent = String(p.number).padStart(2, '0');
    const copy = document.createElement('span');
    copy.className = 'part-copy';
    const label = document.createElement('strong');
    label.textContent = p.label;
    const id = document.createElement('small');
    id.textContent = p.assetId ?? 'SITE CONTEXT / NO ASSET ID';
    copy.append(label, id);
    b.append(n, copy);
    b.addEventListener('click', () => select(p.number));
    $('#legend').append(b);
  }
  $('#result-count').textContent = `${matches.length} of 32 components`;
  $('#no-results').hidden = matches.length > 0;
}
function ui() {
  for (const b of document.querySelectorAll('.part-row'))
    b.setAttribute('aria-pressed', String(Number(b.dataset.part) === state.selected));
  $('#visible-count').textContent = `${state.isolate ? 1 : 32} / 32 MESHES`;
  $('#amount').value = Math.round(state.amount * 100) + '%';
  $('#explode').value = Math.round(state.amount * 100);
  $('#assembled').setAttribute('aria-pressed', String(state.amount === 0));
  $('#exploded').setAttribute('aria-pressed', String(state.amount === 1));
  $('#labels').setAttribute('aria-pressed', String(state.labels));
  $('#labels-state').textContent = state.labels ? 'on' : 'off';
  $('#explore').setAttribute('aria-pressed', String(!state.selected));
  $('#inspect').setAttribute('aria-pressed', String(!!state.selected));
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
  const p = view?.parts.find((p) => p.number === state.selected);
  $('#detail-kicker').textContent = p
    ? `PART ${String(p.number).padStart(2, '0')} / ${p.group.toUpperCase()}`
    : 'INSPECT A COMPONENT';
  $('#detail-title').textContent = p ? p.label : 'The whole is in the details.';
  $('#detail-description').textContent = p
    ? p.description
    : 'Choose any numbered part to bring it closer and see its role in this demonstration site.';
  $('#detail-meta').hidden = $('#function-note').hidden = !p;
  if (p) {
    $('#mesh-name').textContent = p.sourceName;
    $('#asset-id').textContent = p.assetId ?? 'None · source site context';
    $('#function-note').textContent = p.assetId
      ? 'Illustrative function from the demonstration inventory.'
      : 'Context explanation authored for this viewer; absent from the equipment inventory.';
  }
  $('#isolate').disabled = !p;
  $('#isolate').textContent = state.isolate ? 'Show all' : 'Isolate selected ↗';
}
function select(number) {
  if (!view) return;
  state.selected = number;
  state.isolate = false;
  ui();
  view.change('selection');
}
function showAll() {
  state.selected = null;
  state.isolate = false;
  ui();
  view?.change('selection');
}
function explode(amount) {
  state.amount = amount;
  ui();
  view?.change('amount');
}
$('#search').addEventListener('input', renderLegend);
$('#show-all').addEventListener('click', showAll);
$('#explore').addEventListener('click', showAll);
$('#inspect').addEventListener('click', () => {
  if (!state.selected) select(10);
  $('#detail-title').setAttribute('tabindex', '-1');
  $('#detail-title').focus({ preventScroll: true });
  if (innerWidth <= 720) $('#detail-title').scrollIntoView({ block: 'center' });
});
$('#isolate').addEventListener('click', () => {
  if (state.isolate) {
    showAll();
    return;
  }
  state.isolate = true;
  ui();
  view?.change('selection');
});
$('#assembled').addEventListener('click', () => explode(0));
$('#exploded').addEventListener('click', () => explode(1));
$('#explode').addEventListener('input', (e) => explode(Number(e.target.value) / 100));
$('#reset').addEventListener('click', () => view?.reset());
$('#labels').addEventListener('click', () => {
  state.labels = !state.labels;
  ui();
  view?.change('labels');
});
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
    e.preventDefault();
    $('#search').focus();
  }
  if (e.key === 'Escape') {
    if (e.target === $('#search')) {
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
document.addEventListener('atlas-error', (e) => error(e.detail));
renderLegend();
try {
  view = await createScene($('#stage'), state, select);
  ui();
  $('#loading').hidden = true;
  window.atlas = Object.freeze({
    ready: true,
    audit: () => view.audit(),
    pickPoint: (n) => view.pickPoint(n),
  });
  window.addEventListener('pagehide', () => view.dispose(), { once: true });
} catch (e) {
  error(e.message || 'Enable WebGL in your browser and reload.');
}
