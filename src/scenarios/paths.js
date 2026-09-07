const target = (label, kind, x, y) => Object.freeze({ label, kind, x, y });

export const JOURNEY_TARGETS = Object.freeze({
  'remote-caller': target('Remote caller / interconnect', 'conceptual', 12, 19),
  'ims-service': target('IMS service control', 'conceptual', 26, 15),
  'subscriber-session': target('Subscriber & session', 'conceptual', 44, 15),
  'packet-core': target('Packet core', 'conceptual', 59, 25),
  'transport-cloud': target('Transport network', 'conceptual', 71, 38),
  'radio-unit': target('Radio unit', 'conceptual', 82, 56),
  'receiving-phone': target('Receiving phone', 'conceptual', 88, 25),
  'policy-quality': target('Policy & quality', 'conceptual', 43, 47),
  'user-plane': target('User plane / media', 'conceptual', 62, 54),
  operations: target('Operations & resilience', 'conceptual', 43, 76),
  interconnect: target('Interconnect edge', 'conceptual', 13, 35),
  'data-center': target('Conceptual data centre', 'conceptual', 89, 33),
  'site-router': target('Site router / switch', 'conceptual', 28, 33),
  odf: target('ODF / patching', 'conceptual', 40, 33),
  'access-fiber': target('Access fiber', 'conceptual', 53, 33),
  aggregation: target('Aggregation', 'conceptual', 65, 33),
  'metro-core': target('Metro / core transport', 'conceptual', 77, 33),
  'protection-node': target('Protection route', 'conceptual', 64, 68),
  'sync-source': target('Synchronization service', 'conceptual', 51, 76),
  'microwave-network': target('Optional microwave backhaul', 'conceptual', 46, 9),
  'DEMO-CABINET-01': target('Site equipment / baseband-DU', 'inventory', 16, 48),
  'DEMO-SECTOR-A': target('Serving sector antenna', 'inventory', 86, 42),
  'DEMO-POWER-01': target('Power & batteries', 'inventory', 18, 76),
  'DEMO-SHELTER-01': target('Equipment shelter', 'inventory', 26, 76),
  'DEMO-TRAY-01': target('Site cable route', 'inventory', 21, 59),
  'DEMO-DISH-01': target('Site microwave dish', 'inventory', 23, 16),
  'DEMO-TOWER-01': target('Tower structure', 'inventory', 34, 76),
  'DEMO-FENCE-01': target('Physical boundary', 'inventory', 11, 76),
  'DEMO-CAMERA-01': target('Site observation', 'inventory', 42, 76),
});

const path = (from, to, plane, extras = {}) => Object.freeze({ from, to, plane, ...extras });
export const JOURNEY_PATHS = Object.freeze({
  'caller-to-ims': path('remote-caller', 'ims-service', 'control'),
  'ims-to-subscriber': path('ims-service', 'subscriber-session', 'control'),
  'subscriber-to-core': path('subscriber-session', 'packet-core', 'control'),
  'core-to-transport': path('packet-core', 'transport-cloud', 'control'),
  'transport-to-ran': path('transport-cloud', 'DEMO-CABINET-01', 'control'),
  'ran-to-radio': path('DEMO-CABINET-01', 'radio-unit', 'control'),
  'radio-to-sector': path('radio-unit', 'DEMO-SECTOR-A', 'control'),
  'sector-to-phone': path('DEMO-SECTOR-A', 'receiving-phone', 'control'),
  'media-caller-to-user-plane': path('remote-caller', 'user-plane', 'media'),
  'media-user-plane-to-transport': path('user-plane', 'transport-cloud', 'media'),
  'media-transport-to-site': path('transport-cloud', 'DEMO-CABINET-01', 'media'),
  'media-site-to-radio': path('DEMO-CABINET-01', 'radio-unit', 'media'),
  'media-radio-to-sector': path('radio-unit', 'DEMO-SECTOR-A', 'media'),
  'media-sector-to-phone': path('DEMO-SECTOR-A', 'receiving-phone', 'media'),
  'interconnect-to-ims': path('interconnect', 'ims-service', 'control'),
  'ims-to-policy': path('ims-service', 'policy-quality', 'control'),
  'policy-to-user-plane': path('policy-quality', 'user-plane', 'control'),
  'user-plane-to-site': path('user-plane', 'DEMO-CABINET-01', 'media'),
  'operations-support': path('operations', 'ims-service', 'support'),
  'site-to-router': path('DEMO-CABINET-01', 'site-router', 'media'),
  'router-to-odf': path('site-router', 'odf', 'media'),
  'odf-to-access': path('odf', 'access-fiber', 'media'),
  'access-to-aggregation': path('access-fiber', 'aggregation', 'media'),
  'aggregation-to-metro': path('aggregation', 'metro-core', 'media'),
  'metro-to-datacenter': path('metro-core', 'data-center', 'media'),
  'protection-route': path('site-router', 'metro-core', 'media', { kind: 'protection' }),
  'sync-service': path('sync-source', 'site-router', 'support', { kind: 'service' }),
  'microwave-branch': path('DEMO-DISH-01', 'microwave-network', 'media', {
    optional: true,
  }),
});

export function pathVisualState(pathDefinition, progress, reducedMotion) {
  return {
    mode: reducedMotion ? 'stepped' : 'pulse',
    active: progress >= 0,
    offset: reducedMotion ? 0 : Math.max(0, Math.min(1, progress)),
  };
}

export function resolveTargetPositions(targetIds, projected = {}) {
  return Object.fromEntries(
    targetIds.map((id) => {
      const fallback = JOURNEY_TARGETS[id];
      const actual = projected[id] ?? fallback;
      return [id, { x: actual.x, y: actual.y, label: fallback.label, kind: fallback.kind }];
    }),
  );
}
