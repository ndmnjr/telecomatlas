const target = (label, kind, x, y) => Object.freeze({ label, kind, x, y });

export const JOURNEY_TARGETS = Object.freeze({
  'remote-caller': target('Remote caller / interconnect', 'conceptual', 12, 19),
  'ims-service': target('IMS service control', 'conceptual', 26, 15),
  'subscriber-session': target('Subscriber & session', 'conceptual', 44, 15),
  'packet-core': target('Packet core', 'conceptual', 59, 25),
  'transport-cloud': target('Transport network', 'conceptual', 71, 38),
  'radio-unit': target('Radio unit', 'conceptual', 82, 56),
  'receiving-phone': target('Receiving phone', 'conceptual', 88, 25),
  'user-plane': target('Packet user plane / core', 'conceptual', 62, 54),
  'internet-service': target('Internet / data network', 'conceptual', 56, 15),
  'site-router': target('Site router / switch', 'conceptual', 28, 33),
  odf: target('ODF / patching', 'conceptual', 40, 33),
  'access-fiber': target('Access fiber', 'conceptual', 53, 33),
  'DEMO-CABINET-01': target('Site equipment / baseband-DU', 'inventory', 16, 48),
  'DEMO-SECTOR-A': target('Serving sector antenna', 'inventory', 86, 42),
  'DEMO-POWER-01': target('Power & batteries', 'inventory', 18, 76),
  'DEMO-SHELTER-01': target('Equipment shelter', 'inventory', 26, 76),
  'DEMO-TRAY-01': target('Site cable route', 'inventory', 21, 59),
  'DEMO-TOWER-01': target('Tower structure', 'inventory', 34, 76),
});

export const DIRECTION = Object.freeze({
  UPLINK: 'uplink',
  DOWNLINK: 'downlink',
  BIDIRECTIONAL: 'bidirectional',
});

const directionValues = Object.values(DIRECTION);

function validateDirection(direction) {
  if (!directionValues.includes(direction)) {
    throw Error(
      'Invalid direction: ' + direction + '. Must be one of: ' + directionValues.join(', '),
    );
  }
  return direction;
}

const path = (from, to, plane, extras = {}) => {
  const result = Object.freeze({ from, to, plane, ...extras });
  if (extras.direction) validateDirection(extras.direction);
  return result;
};
const uplink = (from, to) => path(from, to, 'control', { direction: DIRECTION.UPLINK });
const downlink = (from, to) => path(from, to, 'media', { direction: DIRECTION.DOWNLINK });

export const JOURNEY_PATHS = Object.freeze({
  'caller-to-ims': path('remote-caller', 'ims-service', 'control'),
  'ims-to-subscriber': path('ims-service', 'subscriber-session', 'control'),
  'subscriber-to-core': path('subscriber-session', 'packet-core', 'control'),
  'core-to-transport': path('packet-core', 'transport-cloud', 'control'),
  'transport-to-ran': path('transport-cloud', 'DEMO-CABINET-01', 'control'),
  'ran-to-radio': path('DEMO-CABINET-01', 'radio-unit', 'control'),
  'radio-to-sector': path('radio-unit', 'DEMO-SECTOR-A', 'control'),
  'sector-to-phone': path('DEMO-SECTOR-A', 'receiving-phone', 'control'),
  'media-caller-to-user-plane': path('remote-caller', 'user-plane', 'media', {
    direction: DIRECTION.BIDIRECTIONAL,
  }),
  'media-user-plane-to-transport': path('user-plane', 'transport-cloud', 'media', {
    direction: DIRECTION.BIDIRECTIONAL,
  }),
  'media-transport-to-site': path('transport-cloud', 'DEMO-CABINET-01', 'media', {
    direction: DIRECTION.BIDIRECTIONAL,
  }),
  'media-site-to-radio': path('DEMO-CABINET-01', 'radio-unit', 'media', {
    direction: DIRECTION.BIDIRECTIONAL,
  }),
  'media-radio-to-sector': path('radio-unit', 'DEMO-SECTOR-A', 'media', {
    direction: DIRECTION.BIDIRECTIONAL,
  }),
  'media-sector-to-phone': path('DEMO-SECTOR-A', 'receiving-phone', 'media', {
    direction: DIRECTION.BIDIRECTIONAL,
  }),
  'browse-uplink': uplink('receiving-phone', 'DEMO-SECTOR-A'),
  'browse-request-sector-to-radio': uplink('DEMO-SECTOR-A', 'radio-unit'),
  'browse-request-radio-to-cabinet': uplink('radio-unit', 'DEMO-CABINET-01'),
  'browse-request-cabinet-to-router': uplink('DEMO-CABINET-01', 'site-router'),
  'browse-request-router-to-odf': uplink('site-router', 'odf'),
  'browse-request-odf-to-access': uplink('odf', 'access-fiber'),
  'browse-request-access-to-transport': uplink('access-fiber', 'transport-cloud'),
  'browse-request-transport-to-user-plane': uplink('transport-cloud', 'user-plane'),
  'browse-request-user-plane-to-internet': uplink('user-plane', 'internet-service'),
  'browse-response-internet-to-user-plane': downlink('internet-service', 'user-plane'),
  'browse-response-user-plane-to-transport': downlink('user-plane', 'transport-cloud'),
  'browse-response-transport-to-access': downlink('transport-cloud', 'access-fiber'),
  'browse-response-access-to-odf': downlink('access-fiber', 'odf'),
  'browse-response-odf-to-router': downlink('odf', 'site-router'),
  'browse-response-router-to-cabinet': downlink('site-router', 'DEMO-CABINET-01'),
  'browse-response-cabinet-to-radio': downlink('DEMO-CABINET-01', 'radio-unit'),
  'browse-response-radio-to-sector': downlink('radio-unit', 'DEMO-SECTOR-A'),
  'browse-response-sector-to-phone': downlink('DEMO-SECTOR-A', 'receiving-phone'),
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
