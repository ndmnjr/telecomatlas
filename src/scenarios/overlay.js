import {
  JOURNEY_PATHS,
  JOURNEY_TARGETS,
  pathVisualState,
  resolveTargetPositions,
} from './paths.js';

const unique = (values) => [...new Set(values)];

export function createOverlayModel(scenario, stage, projected = {}, progress = 0, reduced = false) {
  const pathIds = unique(scenario.stages.flatMap((item) => item.paths));
  const targetIds = unique([
    ...scenario.stages.flatMap((item) => [...item.focus, ...item.support]),
    ...pathIds.flatMap((id) => [JOURNEY_PATHS[id].from, JOURNEY_PATHS[id].to]),
  ]);
  const positions = resolveTargetPositions(targetIds, projected);
  const nodes = targetIds.map((id) => ({
    id,
    ...positions[id],
    active: stage.focus.includes(id),
    support: stage.support.includes(id),
  }));
  const paths = pathIds.map((id) => {
    const definition = JOURNEY_PATHS[id];
    const active = stage.paths.includes(id);
    return {
      id,
      ...definition,
      fromPoint: positions[definition.from],
      toPoint: positions[definition.to],
      active,
      visual: pathVisualState(definition, active ? progress : -1, reduced),
    };
  });
  return { nodes, paths, activePaths: paths.filter((path) => path.active) };
}

function curve(path) {
  const { fromPoint: from, toPoint: to } = path;
  if (path.kind === 'protection') {
    const lift = Math.min(from.y, to.y) - 22;
    return `M ${from.x} ${from.y} C ${from.x + 12} ${lift}, ${to.x - 12} ${lift}, ${to.x} ${to.y}`;
  }
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

export function createJourneyOverlay(host, onInspect) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('journey-lines');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const nodes = document.createElement('div');
  nodes.className = 'journey-nodes';
  host.replaceChildren(svg, nodes);

  return {
    render(scenario, stage, projected, state, reduced) {
      const model = createOverlayModel(scenario, stage, projected, state.progress, reduced);
      svg.replaceChildren();
      nodes.replaceChildren();
      for (const path of model.paths) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.dataset.path = path.id;
        line.dataset.plane = path.plane;
        line.dataset.active = String(path.active);
        line.dataset.motion = path.visual.mode;
        line.setAttribute('d', curve(path));
        line.setAttribute('pathLength', '1');
        if (path.kind) line.dataset.kind = path.kind;
        if (path.optional) line.dataset.optional = 'true';
        line.style.setProperty('--path-progress', path.visual.offset);
        svg.append(line);
      }
      for (const node of model.nodes) {
        const definition = JOURNEY_TARGETS[node.id];
        const element = document.createElement(definition.kind === 'inventory' ? 'button' : 'div');
        element.className = 'journey-node';
        element.dataset.target = node.id;
        element.dataset.kind = definition.kind;
        element.dataset.active = String(node.active);
        element.dataset.support = String(node.support);
        element.style.left = `${node.x}%`;
        element.style.top = `${node.y}%`;
        const marker = document.createElement('span');
        marker.className = 'journey-node-marker';
        marker.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.className = 'journey-node-label';
        label.textContent = node.label;
        element.append(marker, label);
        if (definition.kind === 'inventory') {
          element.type = 'button';
          element.title = `Pause and inspect ${node.label}`;
          element.setAttribute('aria-label', `Pause journey and inspect ${node.label}`);
          element.addEventListener('click', () => onInspect(node.id));
        }
        nodes.append(element);
      }
      host.dataset.plane = stage.activePlane;
      host.dataset.reducedMotion = String(reduced);
      return model;
    },
    clear() {
      svg.replaceChildren();
      nodes.replaceChildren();
      delete host.dataset.plane;
    },
  };
}
