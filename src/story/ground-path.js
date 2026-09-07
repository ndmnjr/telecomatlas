import * as T from 'three';
import { JOURNEY_PATHS } from '../scenarios/paths.js';

export function siteRoutes(parts, phone) {
  const part = (name) => parts.find((p) => p.sourceName === name);
  const sector = part('Panel Antenna A');
  const ground = part('Ground').bounds.max.y;
  const at = (x, y, z) => new T.Vector3(x, ground + y, z);
  const edge = at(-5.8, 0.12, 3.6);
  const anchors = {
    'remote-caller': edge.clone(),
    'ims-service': edge.clone().add(new T.Vector3(0.3, 0, 0)),
    'subscriber-session': edge.clone().add(new T.Vector3(0.6, 0, 0)),
    'packet-core': edge.clone().add(new T.Vector3(0.9, 0, 0)),
    'user-plane': edge.clone().add(new T.Vector3(0.6, 0, 0)),
    'transport-cloud': at(-4.4, 0.12, 3.6),
    'access-fiber': at(-2.3, 0.12, 2.8),
    odf: at(-1.4, 0.3, 1.55),
    'site-router': at(-0.95, 0.7, 1.55),
    'DEMO-CABINET-01': part('Equipment Rack').center.clone(),
    'radio-unit': new T.Vector3(sector.center.x, sector.center.y - 0.48, sector.center.z - 0.38),
    'DEMO-SECTOR-A': new T.Vector3(sector.center.x, sector.center.y, sector.bounds.max.z),
    'receiving-phone': phone.clone(),
  };
  const paths = {};
  for (const [id, path] of Object.entries(JOURNEY_PATHS)) {
    if (!anchors[path.from] || !anchors[path.to]) continue;
    const handoffs = [path.from, path.to];
    let points = handoffs.map((id) => anchors[id]);
    if (['transport-to-ran', 'media-transport-to-site'].includes(id)) {
      handoffs.splice(1, 0, 'access-fiber', 'odf', 'site-router');
      points = handoffs.map((id) => anchors[id]);
    }
    if (['ran-to-radio', 'media-site-to-radio'].includes(id)) {
      handoffs.splice(1, 0, 'DEMO-TRAY-01', 'tower-cable');
      points = [
        anchors[path.from],
        part('Cable Tray').center.clone(),
        new T.Vector3(sector.center.x, part('Cable Tray').center.y, part('Cable Tray').center.z),
        anchors[path.to],
      ];
    }
    paths[id] = { points, handoffs, bidirectional: path.plane === 'media' };
  }
  return { anchors, paths };
}

export function pointOnRoute(points, fraction) {
  const distances = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  let remaining = Math.max(0, Math.min(1, fraction)) * distances.reduce((a, b) => a + b, 0);
  for (let i = 0; i < distances.length; i++) {
    if (remaining <= distances[i] || i === distances.length - 1) {
      const t = distances[i] ? remaining / distances[i] : 0;
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * t,
        y: points[i].y + (points[i + 1].y - points[i].y) * t,
      };
    }
    remaining -= distances[i];
  }
  return points[0];
}
