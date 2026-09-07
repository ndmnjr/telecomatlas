import * as T from 'three';
import { DIRECTION, JOURNEY_PATHS } from '../scenarios/paths.js';

const STRIP_BOXES = [
  ['internet-data-network-edge', [0.7, 0.25, 0.65], [-5.8, 0.13, 3.6], '#71958d'],
  ['packet-user-plane-edge', [0.7, 0.25, 0.65], [-5.1, 0.13, 3.6], '#426b65'],
  ['transport-edge', [0.7, 0.25, 0.65], [-4.4, 0.13, 3.6], '#547b70'],
  ['fiber-patch-panel', [0.3, 0.55, 0.28], [-1.4, 0.28, 1.55], '#c6d4cb'],
  ['site-router', [0.3, 0.15, 0.25], [-0.95, 0.7, 1.55], '#426b65'],
  ['radio-unit', [0.3, 0.45, 0.2], [2.4, 5.17, 0.77], '#547b70'],
];

export function createSiteNetworkStrip() {
  const group = new T.Group();
  group.name = 'site-network-strip';
  const materials = new Map();
  for (const [name, size, position, color] of STRIP_BOXES) {
    if (!materials.has(color))
      materials.set(color, new T.MeshStandardMaterial({ color, roughness: 0.8 }));
    const mesh = new T.Mesh(new T.BoxGeometry(...size), materials.get(color));
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return {
    group,
    dispose() {
      group.traverse((object) => object.geometry?.dispose());
      materials.forEach((material) => material.dispose());
    },
  };
}

export function siteRoutes(parts, phone) {
  const part = (name) => parts.find((item) => item.sourceName === name);
  const sector = part('Panel Antenna A');
  const cabinet = part('Equipment Rack');
  const tray = part('Cable Tray');
  const ground = part('Ground').bounds.max.y;
  const at = (x, y, z) => new T.Vector3(x, ground + y, z);
  const anchors = {
    'remote-caller': at(-5.8, 0.12, 3.6),
    'ims-service': at(-5.5, 0.12, 3.6),
    'subscriber-session': at(-5.2, 0.12, 3.6),
    'packet-core': at(-5.1, 0.12, 3.6),
    'user-plane': at(-5.1, 0.12, 3.6),
    'internet-service': at(-5.8, 0.12, 3.6),
    'transport-cloud': at(-4.4, 0.12, 3.6),
    'access-fiber': at(-2.3, 0.12, 2.8),
    odf: at(-1.4, 0.3, 1.55),
    'site-router': at(-0.95, 0.7, 1.55),
    'DEMO-CABINET-01': cabinet.center.clone(),
    'radio-unit': new T.Vector3(sector.center.x, sector.center.y - 0.48, sector.center.z - 0.38),
    'DEMO-SECTOR-A': new T.Vector3(sector.center.x, sector.center.y, sector.bounds.max.z),
    'receiving-phone': phone.clone(),
  };
  const cabinetToRadio = [
    anchors['DEMO-CABINET-01'],
    tray.center.clone(),
    new T.Vector3(sector.center.x, tray.center.y, tray.center.z),
    anchors['radio-unit'],
  ];
  const paths = {};
  for (const [id, definition] of Object.entries(JOURNEY_PATHS)) {
    if (!anchors[definition.from] || !anchors[definition.to]) continue;
    let handoffs = [definition.from, definition.to];
    let points = handoffs.map((anchor) => anchors[anchor]);
    if (definition.from === 'DEMO-CABINET-01' && definition.to === 'radio-unit') {
      handoffs = ['DEMO-CABINET-01', 'DEMO-TRAY-01', 'tower-cable', 'radio-unit'];
      points = cabinetToRadio;
    } else if (definition.from === 'radio-unit' && definition.to === 'DEMO-CABINET-01') {
      handoffs = ['radio-unit', 'tower-cable', 'DEMO-TRAY-01', 'DEMO-CABINET-01'];
      points = cabinetToRadio.toReversed();
    } else if (definition.from === 'transport-cloud' && definition.to === 'DEMO-CABINET-01') {
      handoffs = ['transport-cloud', 'access-fiber', 'odf', 'site-router', 'DEMO-CABINET-01'];
      points = handoffs.map((anchor) => anchors[anchor]);
    }
    paths[id] = {
      from: definition.from,
      to: definition.to,
      points,
      handoffs,
      direction: definition.direction,
      bidirectional: definition.direction === DIRECTION.BIDIRECTIONAL,
    };
  }
  return { anchors, paths };
}

export function pointOnRoute(points, fraction) {
  const distances = points
    .slice(1)
    .map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
  let remaining = Math.max(0, Math.min(1, fraction)) * distances.reduce((a, b) => a + b, 0);
  for (let index = 0; index < distances.length; index++) {
    if (remaining <= distances[index] || index === distances.length - 1) {
      const progress = distances[index] ? remaining / distances[index] : 0;
      return {
        x: points[index].x + (points[index + 1].x - points[index].x) * progress,
        y: points[index].y + (points[index + 1].y - points[index].y) * progress,
      };
    }
    remaining -= distances[index];
  }
  return points[0];
}
