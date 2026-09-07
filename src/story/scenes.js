import * as T from 'three';
import { JOURNEY_PATHS } from '../scenarios/paths.js';

export function createStoryScenes() {
  const group = new T.Group();
  group.name = 'storyContexts';
  const site = new T.Group(),
    transport = new T.Group(),
    core = new T.Group();
  site.name = 'site-context';
  transport.name = 'transport-cross-section';
  core.name = 'core-cutaway';
  group.add(site, transport, core);
  const materials = new Map();
  function box(parent, name, size, position, color) {
    if (!materials.has(color))
      materials.set(color, new T.MeshStandardMaterial({ color, roughness: 0.8 }));
    const mesh = new T.Mesh(new T.BoxGeometry(...size), materials.get(color));
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  box(site, 'operator-network-panel', [1.4, 0.25, 0.65], [-5.25, 0.13, 3.6], '#547b70');
  box(site, 'fiber-patch-panel', [0.3, 0.55, 0.28], [-1.4, 0.28, 1.55], '#c6d4cb');
  box(site, 'site-router', [0.3, 0.15, 0.25], [-0.95, 0.7, 1.55], '#426b65');
  box(site, 'radio-unit', [0.3, 0.45, 0.2], [2.4, 5.17, 0.77], '#547b70');
  box(transport, 'earth-section', [15, 0.9, 4], [0, -0.46, 0], '#b6ad92');
  box(transport, 'ground-surface', [15, 0.04, 4], [0, 0, 0], '#a4b69a');
  box(transport, 'exposed-fiber-duct', [12, 0.13, 0.16], [0, -0.38, 2.04], '#367d78');
  box(transport, 'protection-duct', [12, 0.12, 0.16], [0, -0.74, 2.04], '#487767');
  const transportIds = [
    'DEMO-CABINET-01',
    'site-router',
    'odf',
    'access-fiber',
    'aggregation',
    'metro-core',
    'data-center',
  ];
  const transportAnchors = {};
  for (let i = 0; i < transportIds.length; i++) {
    const x = -6 + i * 2;
    transportAnchors[transportIds[i]] = new T.Vector3(x, i === 3 ? -0.38 : 0.25, 2.15);
    if (i === 3) continue;
    const height = i === 6 ? 1.6 : i === 4 ? 1.1 : 0.8;
    box(
      transport,
      transportIds[i],
      [i >= 4 ? 1.4 : 0.65, height, 0.85],
      [x, height / 2, 0.7],
      i >= 4 ? '#d6d8c7' : '#71958d',
    );
    box(transport, `door-${i}`, [0.34, height * 0.7, 0.04], [x, height * 0.4, 1.14], '#355a55');
  }
  const towers = [-5, 5].map((x, i) => {
    for (const dx of [-0.25, 0.25])
      box(transport, `microwave-tower-${i}`, [0.08, 3.2, 0.08], [x + dx, 1.6, -0.9], '#67847b');
    for (const y of [0.6, 1.3, 2, 2.7, 3.2])
      box(transport, 'tower-crossbar', [0.6, 0.07, 0.08], [x, y, -0.9], '#67847b');
    box(transport, 'microwave-radio', [0.4, 0.35, 0.18], [x, 3.15, -0.75], '#e4ddbe');
    return new T.Vector3(x, 3.15, -0.65);
  });
  Object.assign(transportAnchors, {
    'DEMO-DISH-01': towers[0],
    'microwave-network': towers[1],
    'sync-source': new T.Vector3(-2, 0.2, -1.6),
    'protection-node': new T.Vector3(0, -0.74, 2.15),
  });
  box(transport, 'timing-support', [0.6, 0.5, 0.4], [-2, 0.25, -1.6], '#c59639');
  const transportPaths = {};
  for (const [id, definition] of Object.entries(JOURNEY_PATHS)) {
    if (!transportAnchors[definition.from] || !transportAnchors[definition.to]) continue;
    const from = transportAnchors[definition.from],
      to = transportAnchors[definition.to];
    let points = [from, new T.Vector3(from.x, -0.38, 2.15), new T.Vector3(to.x, -0.38, 2.15), to];
    if (id === 'protection-route')
      points = [from, new T.Vector3(from.x, -0.74, 2.15), new T.Vector3(to.x, -0.74, 2.15), to];
    if (id === 'sync-service') points = [from, new T.Vector3(to.x, 0.2, -1.6), to];
    if (id === 'microwave-branch')
      points = Array.from({ length: 25 }, (_, i) =>
        from
          .clone()
          .lerp(to, i / 24)
          .add(new T.Vector3(0, Math.sin((i / 24) * Math.PI) * 0.55, 0)),
      );
    transportPaths[id] = { ...definition, points, bidirectional: definition.plane === 'media' };
  }
  const exterior = new T.Group();
  exterior.name = 'data-centre-exterior';
  core.add(exterior);
  box(exterior, 'floor', [14, 0.25, 6], [0, -0.125, 0], '#b6c3b7');
  box(exterior, 'rear-wall', [14, 3.2, 0.2], [0, 1.6, -3], '#d0d8c9');
  box(exterior, 'side-wall', [0.18, 3.2, 6], [-7, 1.6, 0], '#b2c3b7');
  box(exterior, 'roof-line', [14, 0.15, 0.18], [0, 3.2, -2.8], '#608176');
  for (const x of [-6.6, 6.6])
    box(exterior, 'front-column', [0.16, 3.2, 0.16], [x, 1.6, 2.8], '#79958a');
  const layers = ['ims-service', 'subscriber-session', 'policy-quality', 'user-plane'];
  const coreAnchors = {};
  for (let i = 0; i < 4; i++) {
    const x = -4.8 + i * 3.2;
    coreAnchors[layers[i]] = new T.Vector3(x, 1.9, 1.3);
    for (const z of [-1.5, 1]) {
      box(core, 'shared-compute-rack', [1.3, 2, 0.8], [x, 1, z], '#294e49');
      for (let row = 0; row < 6; row++) {
        box(core, 'rack-shelf', [1.12, 0.16, 0.04], [x, 0.25 + row * 0.29, z + 0.43], '#6d9890');
        box(
          core,
          'rack-indicator',
          [0.06, 0.04, 0.045],
          [x + 0.42, 0.25 + row * 0.29, z + 0.46],
          '#cfeab0',
        );
      }
    }
  }
  const fabric = new T.Group();
  fabric.name = 'network-fabric';
  core.add(fabric);
  box(fabric, 'shared-fabric', [11, 0.09, 0.12], [0, 2.4, 0], '#299ba3');
  for (const x of [-4.8, -1.6, 1.6, 4.8])
    box(fabric, 'rack-fabric-link', [0.07, 0.09, 2.6], [x, 2.4, 0], '#299ba3');
  Object.assign(coreAnchors, {
    interconnect: new T.Vector3(-6, 0.4, 2.5),
    'remote-caller': new T.Vector3(-6, 0.4, 2.5),
    'packet-core': new T.Vector3(-1.6, 1.1, 1.4),
    'DEMO-CABINET-01': new T.Vector3(6, 0.4, 2.5),
    operations: new T.Vector3(0, 0.4, 2.5),
  });
  const corePaths = {};
  for (const [id, definition] of Object.entries(JOURNEY_PATHS)) {
    if (!coreAnchors[definition.from] || !coreAnchors[definition.to]) continue;
    const from = coreAnchors[definition.from],
      to = coreAnchors[definition.to];
    corePaths[id] = {
      ...definition,
      points: [from, new T.Vector3(from.x, 2.4, 0), new T.Vector3(to.x, 2.4, 0), to],
      bidirectional: definition.plane === 'media',
    };
  }
  return {
    group,
    site,
    transport,
    core,
    update(context) {
      site.visible = context === 'site';
      transport.visible = context === 'transport';
      core.visible = context === 'core';
    },
    model(context) {
      return context === 'transport'
        ? { anchors: transportAnchors, paths: transportPaths, towers, labels: transportIds }
        : { anchors: coreAnchors, paths: corePaths, layers, rackCount: 8, labels: layers };
    },
    dispose() {
      group.traverse((object) => object.geometry?.dispose());
      materials.forEach((material) => material.dispose());
    },
  };
}

export function sceneCaption(context, technical = false) {
  if (context === 'transport')
    return {
      title: 'Transport below the ground',
      text: 'Grounded cross-section · illustrative route, not geographic scale. Dashed lower duct: protection. Amber: timing support only.',
      cards: technical
        ? [
            '1 Site cabinet',
            '2 Site router',
            '3 ODF / patching',
            '4 Access fiber duct',
            '5 Aggregation',
            '6 Metro/core',
            '7 Data centre',
          ]
        : [
            '1 Equipment cabinet',
            '2 Site router',
            '3 Fiber patch panel',
            '4 Buried fiber',
            '5 Aggregation building',
            '6 Wider network',
            '7 Data centre',
          ],
    };
  return {
    title: 'Conceptual data centre',
    text: 'Logical roles share racks and network fabric. One function does not equal one physical server. No actual operator layout or scale is represented.',
    cards: technical
      ? [
          '1 IMS / SIP session control',
          '2 Subscriber / session',
          '3 Policy / quality',
          '4 User plane / media',
        ]
      : ['1 Call control', '2 Subscribers & sessions', '3 Service policy', '4 Voice traffic'],
  };
}
