const PLANES = new Set(['control', 'media', 'support', 'mixed']);
const CAMERAS = new Set(['site-wide', 'sector-a', 'cabinet', 'core-diagram', 'transport-diagram']);
const SOURCE_HOSTS = new Set([
  '3gpp.org',
  'www.3gpp.org',
  'portal.3gpp.org',
  'gsma.com',
  'www.gsma.com',
  'itu.int',
  'www.itu.int',
  'o-ran.org',
  'www.o-ran.org',
]);
const UNSAFE_FIELDS = new Set([
  'operator',
  'coordinates',
  'latitude',
  'longitude',
  'capacity',
  'ipAddress',
  'ip',
  'alarm',
  'configuration',
  'location',
  'hostname',
]);

function fail(message) {
  throw new Error(`Scenario contract failed: ${message}`);
}

function inspectPublicFields(value, path = 'scenarios') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (UNSAFE_FIELDS.has(key)) fail(`unsafe public field ${path}.${key}`);
    inspectPublicFields(child, `${path}.${key}`);
  }
}

function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} must be non-empty`);
}

function sourceUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${label} source URL must be valid HTTPS`);
  }
  if (parsed.protocol !== 'https:' || !SOURCE_HOSTS.has(parsed.hostname.toLowerCase()))
    fail(`${label} source URL must use an approved official HTTPS host`);
}

export function validateScenarios(input, registries) {
  inspectPublicFields(input);
  if (!Array.isArray(input) || input.length !== 3) fail('expected exactly three scenarios');
  const targets = registries?.targets ?? {};
  const paths = registries?.paths ?? {};
  const scenarioIds = new Set();
  for (const scenario of input) {
    text(scenario.id, 'scenario id');
    text(scenario.title, `${scenario.id} title`);
    text(scenario.scope, `${scenario.id} scope`);
    text(scenario.disclaimer, `${scenario.id} disclaimer`);
    if (!Array.isArray(scenario.sources) || !scenario.sources.length)
      fail(`${scenario.id} sources must be non-empty`);
    scenario.sources.forEach((source, index) => {
      text(source?.label, `${scenario.id} source label ${index + 1}`);
      sourceUrl(source?.url, `${scenario.id} source ${index + 1}`);
    });
    if (scenario.scope !== 'synthetic-vendor-neutral') fail(`${scenario.id} has unsafe scope`);
    if (scenarioIds.has(scenario.id)) fail(`duplicate scenario id ${scenario.id}`);
    scenarioIds.add(scenario.id);
    if (!Array.isArray(scenario.stages) || !scenario.stages.length)
      fail(`${scenario.id} stages must be non-empty`);
    const stageIds = new Set();
    scenario.stages.forEach((stage, index) => {
      text(stage.id, `${scenario.id} stage id`);
      text(stage.label, `${scenario.id}/${stage.id} label`);
      text(stage.narrative, `${scenario.id}/${stage.id} narrative`);
      if (stageIds.has(stage.id)) fail(`duplicate stage id ${stage.id}`);
      stageIds.add(stage.id);
      if (stage.order !== index + 1) fail(`${scenario.id} stage order must be contiguous`);
      if (!PLANES.has(stage.activePlane)) fail(`${stage.id} activePlane is invalid`);
      if (!CAMERAS.has(stage.camera)) fail(`${stage.id} camera is invalid`);
      for (const key of ['focus', 'support', 'paths'])
        if (!Array.isArray(stage[key])) fail(`${stage.id} ${key} must be an array`);
      for (const id of [...stage.focus, ...stage.support])
        if (!targets[id]) fail(`${stage.id} references unknown target ${id}`);
      for (const id of stage.paths) {
        const path = paths[id];
        if (!path) fail(`${stage.id} references unknown path ${id}`);
        if (!targets[path.from] || !targets[path.to]) fail(`${id} path endpoint does not exist`);
      }
      if (stage.condition !== undefined) text(stage.condition, `${stage.id} condition`);
    });
  }
  return input;
}

export const scenarioEnums = Object.freeze({
  planes: Object.freeze([...PLANES]),
  cameras: Object.freeze([...CAMERAS]),
});
