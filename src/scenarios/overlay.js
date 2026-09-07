import { pointOnRoute } from '../story/ground-path.js';
import {
  DIRECTION,
  JOURNEY_PATHS,
  JOURNEY_TARGETS,
  pathVisualState,
  resolveTargetPositions,
} from './paths.js';

const unique = (values) => [...new Set(values)];

export function pulseDirections(route) {
  if (route.direction === DIRECTION.BIDIRECTIONAL) return ['outbound', 'inbound'];
  return [route.direction ?? 'outbound'];
}

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
  const rf = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  rf.classList.add('story-rf');
  rf.setAttribute('aria-hidden', 'true');
  const operator = document.createElement('div');
  operator.className = 'story-operator';
  operator.textContent = 'Operator network \u2014 conceptual';
  const support = document.createElement('div');
  support.className = 'story-support';
  support.textContent = 'Support only: power / shelter / tower structure';
  host.replaceChildren(svg, nodes, rf, operator, support);

  return {
    render(scenario, stage, projected, state, reduced, story = {}, technical = false) {
      const model = createOverlayModel(
        scenario,
        stage,
        { ...projected, ...story.anchors },
        state.progress,
        reduced,
      );
      host.dataset.context = story.context ?? '';

      operator.textContent =
        scenario.id === 'browse-internet'
          ? 'Transport · Packet core / User plane · Internet / Data network — conceptual'
          : 'Transport · Packet core / User plane · IMS — conceptual';
      operator.dataset.service = scenario.id === 'browse-internet' ? 'internet' : 'ims';
      operator.hidden = story.context !== 'site';
      support.hidden = story.context !== 'site';
      const edge = story.anchors?.['transport-cloud'];
      if (edge) {
        const halfLabel = (72 / host.clientWidth) * 100;
        operator.style.left = `${Math.max(halfLabel, Math.min(100 - halfLabel, edge.x))}%`;
        operator.style.top = `${edge.y}%`;
        operator.hidden = edge.x < 0 || edge.x > 100 || edge.y < 10 || edge.y > 85;
      }
      rf.replaceChildren();
      rf.setAttribute('viewBox', `0 0 ${host.clientWidth} ${host.clientHeight}`);
      rf.dataset.plane = stage.activePlane;
      if (story.rf)
        for (const wave of story.rf.waves) {
          const arc = document.createElementNS(svg.namespaceURI, 'path');
          arc.classList.add('story-rf-wave');
          arc.setAttribute('d', wave.d);
          arc.dataset.direction = wave.direction;
          rf.append(arc);
        }
      svg.replaceChildren();
      nodes.replaceChildren();
      for (const path of model.paths) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.dataset.path = path.id;
        line.dataset.plane = path.plane;
        line.dataset.active = String(path.active);
        line.dataset.motion = path.visual.mode;
        const route = story.routes?.find((r) => r.id === path.id);
        line.setAttribute(
          'd',
          route
            ? route.points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')
            : curve(path),
        );
        line.setAttribute('pathLength', '1');
        if (path.kind) line.dataset.kind = path.kind;
        if (path.optional) line.dataset.optional = 'true';
        line.style.setProperty('--path-progress', path.visual.offset);
        svg.append(line);
        if (route && path.active) {
          const directions = pulseDirections(route);
          for (const direction of directions) {
            const fraction = reduced
              ? direction === 'inbound'
                ? 0.65
                : 0.35
              : direction === 'inbound'
                ? 1 - state.progress
                : state.progress;
            const p = pointOnRoute(route.points, fraction);
            const pulse = document.createElementNS(svg.namespaceURI, 'circle');
            pulse.classList.add('story-pulse');
            pulse.dataset.direction = direction;
            pulse.dataset.plane = path.plane;
            pulse.setAttribute('cx', p.x);
            pulse.setAttribute('cy', p.y);
            pulse.setAttribute('r', direction === 'inbound' ? 0.65 : 0.45);
            svg.append(pulse);
          }
        }
      }
      for (const node of model.nodes) {
        const definition = JOURNEY_TARGETS[node.id];
        if (
          story.context === 'site' &&
          (definition.kind === 'conceptual' ||
            !['DEMO-CABINET-01', 'DEMO-SECTOR-A'].includes(node.id))
        )
          continue;
        if (story.context && story.context !== 'site' && !story.anchors?.[node.id]) continue;
        const element = document.createElement(definition.kind === 'inventory' ? 'button' : 'div');
        element.className = 'journey-node';
        element.dataset.target = node.id;
        element.dataset.kind = definition.kind;
        element.dataset.active = String(node.active);
        element.dataset.support = String(node.support);
        element.style.left = `${Math.max(13, Math.min(87, node.x))}%`;
        element.style.top = `${Math.max(12, Math.min(88, node.y))}%`;
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
      rf.replaceChildren();
      operator.hidden = support.hidden = true;
      delete host.dataset.plane;
    },
  };
}
