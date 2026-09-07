import { createSiteNetworkStrip, siteRoutes } from './story/ground-path.js';
import { rfWavefronts } from './story/rf.js';
import { DIRECTION } from './scenarios/paths.js';
import { createStoryActors } from './story/actors.js';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { validateModel } from './catalogue.js';
import { prepareParts, packParts, applyExplosion, explodedDirection } from './layout.js';
import { Tap, calloutLayout } from './interaction.js';

export async function createScene(host, state, onSelect) {
  const renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor('#f1f2ed');
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', 'Telecom site geometry');
  host.prepend(renderer.domElement);
  const scene = new T.Scene(),
    camera = new T.OrthographicCamera(-10, 10, 10, -10, 0.01, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.minZoom = 0.2;
  controls.maxZoom = 25;
  controls.maxPolarAngle = Math.PI * 0.9;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  scene.add(new T.HemisphereLight(0xffffff, 0x96a08b, 2.1));
  const key = new T.DirectionalLight(0xfff9e9, 3.2);
  key.position.set(-7, 15, 9);
  key.castShadow = true;
  Object.assign(key.shadow.camera, {
    left: -15,
    right: 15,
    top: 15,
    bottom: -15,
    near: 0.1,
    far: 60,
  });
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.001;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const fill = new T.DirectionalLight(0xe0f1f0, 1.6);
  fill.position.set(10, 6, -9);
  scene.add(fill);
  const [gltf, inventory] = await Promise.all([
    new GLTFLoader().loadAsync('assets/telecom_site.glb').catch(() => {
      throw Error(
        'The model could not be loaded. Check the local build files, then reload the viewer.',
      );
    }),
    fetch('assets/telecom_inventory.json')
      .then((r) => {
        if (!r.ok) throw Error('HTTP ' + r.status);
        return r.json();
      })
      .catch(() => {
        throw Error(
          'The inventory could not be loaded. Check the local build files, then reload the viewer.',
        );
      }),
  ]);
  const parts = validateModel(gltf, inventory);
  prepareParts(parts);
  const palette = {
    'Site context': '#bcc2aa',
    Shelter: '#ced1b9',
    Boundary: '#7e948c',
    Tower: '#6f8888',
    Radio: '#e2e1c9',
    Backhaul: '#c6d4ca',
    Cabinet: '#91ada2',
    'Cable route': '#a4b3ad',
    Power: '#789989',
    Camera: '#d0daca',
  };
  for (const p of parts) {
    scene.add(p.mesh);
    p.mesh.castShadow = p.number !== 1;
    p.mesh.receiveShadow = true;
    const material = new T.MeshStandardMaterial({
      color: palette[p.group],
      roughness: 0.72,
      metalness: p.group === 'Tower' ? 0.35 : 0.12,
    });
    if (p.number === 1) material.color.set('#c6c9b7');
    if (p.sourceName.includes('Lens')) material.color.set('#263f39');
    p.mesh.material = material;
    p.color = material.color.clone();
  }
  const actors = createStoryActors(parts);
  const networkStrip = createSiteNetworkStrip();
  actors.group.add(networkStrip.group);
  actors.group.visible = false;
  scene.add(actors.group);
  let story = null;
  let projectionListener = () => {};
  let amount = state.amount,
    journeyStage = null,
    height = 20,
    targetHeight = 20,
    transition = true,
    dirty = true,
    last = performance.now(),
    frame = 0;
  const targetPosition = new T.Vector3(),
    targetLook = new T.Vector3();
  const leaders = document.querySelector('#leaders'),
    callouts = document.querySelector('#callouts');
  const nodes = new Map();
  for (const p of parts) {
    const button = document.createElement('button');
    button.className = 'callout';
    button.textContent = String(p.number).padStart(2, '0');
    button.title = p.label;
    button.setAttribute('aria-label', `${p.number}. ${p.label}`);
    button.dataset.part = p.number;
    button.addEventListener('click', () => onSelect(p.number));
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line'),
      dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r', '2');
    leaders.append(line, dot);
    callouts.append(button);
    nodes.set(p.number, { button, line, dot });
  }
  const corners = (box) =>
    Array.from(
      { length: 8 },
      (_, i) =>
        new T.Vector3(
          i & 1 ? box.max.x : box.min.x,
          i & 2 ? box.max.y : box.min.y,
          i & 4 ? box.max.z : box.min.z,
        ),
    );
  function fit(immediate = false) {
    const chosen = state.selected ? parts.filter((p) => p.number === state.selected) : parts;
    const box = new T.Box3();
    chosen.forEach((p) => box.union(new T.Box3().setFromObject(p.mesh)));
    const direction = new T.Vector3(1, 0.85, 1.4)
      .normalize()
      .lerp(explodedDirection, amount)
      .normalize();
    const right = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), direction).normalize(),
      up = new T.Vector3().crossVectors(direction, right);
    const c = box.getCenter(new T.Vector3()),
      extent = new T.Box2();
    for (const p of chosen)
      for (const v of corners(new T.Box3().setFromObject(p.mesh))) {
        v.sub(c);
        extent.expandByPoint(new T.Vector2(v.dot(right), v.dot(up)));
      }
    const size = extent.getSize(new T.Vector2()),
      aspect = host.clientWidth / host.clientHeight;
    const projectedCenter = extent.getCenter(new T.Vector2());
    c.addScaledVector(right, projectedCenter.x).addScaledVector(up, projectedCenter.y);
    targetHeight =
      Math.max(
        0.22,
        size.y / 0.76,
        size.x / aspect / (1 - (host.clientWidth < 500 ? 62 : 96) / host.clientWidth),
      ) * 1.08;
    if (story?.context === 'site' && !state.selected) {
      const close = story.phase === 'ring';
      c.set(close ? 2.7 : -0.3, close ? 2.6 : 2.2, 1.6);
      targetHeight = Math.max(close ? 8.5 : 10.5, (close ? 6.4 : 12) / aspect);
    }

    targetLook.copy(c);
    targetPosition.copy(c).addScaledVector(direction, 80);
    camera.zoom = 1;
    transition = true;
    dirty = true;
    if (immediate || reduced.matches) {
      camera.position.copy(targetPosition);
      controls.target.copy(targetLook);
      height = targetHeight;
      transition = false;
      projection();
      controls.update();
    }
  }
  function projection() {
    const aspect = host.clientWidth / host.clientHeight;
    camera.left = (-height * aspect) / 2;
    camera.right = (height * aspect) / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
  }
  function resize() {
    renderer.setSize(host.clientWidth, host.clientHeight);
    packParts(parts, host.clientWidth / host.clientHeight);
    applyExplosion(parts, amount);
    fit(true);
    dirty = true;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  controls.addEventListener('start', () => {
    transition = false;
  });
  controls.addEventListener('change', () => {
    dirty = true;
  });
  const raycaster = new T.Raycaster(),
    tap = new Tap();
  function hits(x, y) {
    const r = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(
      new T.Vector2(((x - r.x) / r.width) * 2 - 1, (-(y - r.y) / r.height) * 2 + 1),
      camera,
    );
    return raycaster.intersectObjects(
      parts.filter((p) => p.mesh.visible).map((p) => p.mesh),
      false,
    );
  }
  const down = (e) => tap.down(e.pointerId, e.clientX, e.clientY),
    move = (e) => tap.move(e.pointerId, e.clientX, e.clientY),
    cancel = (e) => tap.cancel(e.pointerId);
  const up = (e) => {
    if (tap.up(e.pointerId, e.clientX, e.clientY)) {
      const hit = hits(e.clientX, e.clientY)[0];
      if (hit) onSelect(parts.find((p) => p.mesh === hit.object).number);
    }
  };
  for (const [name, fn] of [
    ['pointerdown', down],
    ['pointermove', move],
    ['pointerup', up],
    ['pointercancel', cancel],
  ])
    renderer.domElement.addEventListener(name, fn);
  function updateSelection() {
    const journeyFocus = new Set(journeyStage?.focus ?? []),
      journeySupport = new Set(journeyStage?.support ?? []),
      journeyColor =
        journeyStage?.activePlane === 'media'
          ? new T.Color('#25a765')
          : journeyStage?.activePlane === 'support'
            ? new T.Color('#c68a20')
            : new T.Color('#00a7bd'),
      supportColor = new T.Color('#c68a20');
    for (const p of parts) {
      const selected = p.number === state.selected,
        focused = journeyFocus.has(p.assetId) || journeyFocus.has(p.sourceName),
        supporting = journeySupport.has(p.assetId) || journeySupport.has(p.sourceName);
      p.mesh.visible =
        (!story || story.context === 'site' || selected) && (!state.isolate || selected);
      p.mesh.material.color.copy(
        selected
          ? new T.Color('#117a68')
          : focused
            ? journeyColor
            : supporting
              ? supportColor
              : p.color,
      );
      const dim = state.selected ? !selected : !!journeyStage && !focused && !supporting;
      p.mesh.material.transparent = dim;
      p.mesh.material.opacity = dim ? (state.selected ? 0.14 : 0.72) : 1;
      p.mesh.material.depthWrite = !dim;
      p.mesh.material.needsUpdate = true;
      p.mesh.castShadow = !state.selected && !journeyStage && p.number !== 1;
    }
    dirty = true;
  }
  function labels() {
    const points = parts
      .filter((p) => p.mesh.visible && (!state.selected || p.number === state.selected))
      .map((p) => {
        const v = p.center.clone().addScaledVector(p.offset, amount).project(camera);
        return {
          number: p.number,
          x: ((v.x + 1) * host.clientWidth) / 2,
          y: ((1 - v.y) * host.clientHeight) / 2,
        };
      });
    const positioned = new Map(
      calloutLayout(points, host.clientWidth, host.clientHeight).map((p) => [p.number, p]),
    );
    for (const p of parts) {
      const { button, line, dot } = nodes.get(p.number),
        v = positioned.get(p.number);
      const visible = state.labels && !!v;
      button.hidden = !visible;
      line.style.display = dot.style.display = visible ? '' : 'none';
      if (!visible) continue;
      button.style.left = v.x + 'px';
      button.style.top = v.y + 'px';
      button.setAttribute('aria-pressed', String(p.number === state.selected));
      line.setAttribute('x1', v.x);
      line.setAttribute('y1', v.y);
      line.setAttribute('x2', v.anchorX);
      line.setAttribute('y2', v.anchorY);
      dot.setAttribute('cx', v.anchorX);
      dot.setAttribute('cy', v.anchorY);
    }
  }
  function animate(now) {
    frame = requestAnimationFrame(animate);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const k = reduced.matches ? 1 : 1 - Math.exp(-12 * dt);
    if (Math.abs(amount - state.amount) > 0.00001) {
      amount = reduced.matches ? state.amount : T.MathUtils.lerp(amount, state.amount, k);
      if (Math.abs(amount - state.amount) < 0.0001) amount = state.amount;
      applyExplosion(parts, amount);
      fit();
      dirty = true;
    }
    if (transition) {
      camera.position.lerp(targetPosition, k);
      controls.target.lerp(targetLook, k);
      height = T.MathUtils.lerp(height, targetHeight, k);
      if (
        camera.position.distanceTo(targetPosition) < 0.0001 &&
        Math.abs(height - targetHeight) < 0.0001
      ) {
        camera.position.copy(targetPosition);
        controls.target.copy(targetLook);
        height = targetHeight;
        transition = false;
      }
      projection();
      controls.update();
      dirty = true;
    }
    if (dirty) {
      key.castShadow = amount < 0.01 && !state.selected;
      renderer.render(scene, camera);
      labels();
      dirty = false;
      if (story) projectionListener();
    }
  }
  frame = requestAnimationFrame(animate);
  const keyboard = (e) => {
    if (e.target !== host && e.target !== renderer.domElement) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      transition = false;
      const spherical = new T.Spherical().setFromVector3(
        camera.position.clone().sub(controls.target),
      );
      spherical.theta += e.key === 'ArrowLeft' ? -0.12 : e.key === 'ArrowRight' ? 0.12 : 0;
      spherical.phi += e.key === 'ArrowUp' ? -0.12 : e.key === 'ArrowDown' ? 0.12 : 0;
      spherical.makeSafe();
      camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(spherical));
      controls.update();
      dirty = true;
    } else if (['+', '=', '-'].includes(e.key)) {
      e.preventDefault();
      transition = false;
      camera.zoom = T.MathUtils.clamp(camera.zoom * (e.key === '-' ? 0.85 : 1.18), 0.2, 25);
      camera.updateProjectionMatrix();
      dirty = true;
    } else if (e.key.toLowerCase() === 'r') {
      e.preventDefault();
      fit();
    }
  };
  host.addEventListener('keydown', keyboard);
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    document.dispatchEvent(
      new CustomEvent('atlas-error', {
        detail: 'The graphics session was interrupted. Reload the viewer to continue.',
      }),
    );
  });
  function projectWorld(point) {
    const p = point.clone().project(camera);
    return { x: (p.x + 1) * 50, y: (1 - p.y) * 50 };
  }
  function storyVisual() {
    if (!story) return {};
    const model = siteRoutes(parts, actors.phone.getWorldPosition(new T.Vector3()));
    const anchors = Object.fromEntries(
      Object.entries(model.anchors).map(([id, p]) => [id, projectWorld(p)]),
    );
    const pixel = (p) => ({
      x: (p.x * host.clientWidth) / 100,
      y: (p.y * host.clientHeight) / 100,
    });
    const projectedSector = anchors['DEMO-SECTOR-A'] ? pixel(anchors['DEMO-SECTOR-A']) : null;
    const projectedPhone = anchors['receiving-phone'] ? pixel(anchors['receiving-phone']) : null;
    const uplink = story.phase === 'browse-uplink';
    const rf = story.rf
      ? rfWavefronts(
          uplink ? projectedPhone : projectedSector,
          uplink ? projectedSector : projectedPhone,
          story.progress,
          story.reduced,
          story.phone === 'connected'
            ? DIRECTION.BIDIRECTIONAL
            : uplink
              ? DIRECTION.UPLINK
              : DIRECTION.DOWNLINK,
        )
      : null;
    return {
      context: story.context,
      anchors,
      projectedSector,
      projectedPhone,
      rf,
      routes: Object.entries(model.paths).map(([id, path]) => ({
        id,
        ...path,
        worldPoints: path.points.map((p) => p.toArray()),
        points: path.points.map(projectWorld),
        active: journeyStage.paths.includes(id),
      })),
    };
  }
  function audit() {
    return {
      story: story ? { actors: actors.audit(), groundY: actors.groundY, ...storyVisual() } : null,
      amount,
      selected: state.selected,
      isolate: state.isolate,
      labels: state.labels,
      reducedMotion: reduced.matches,
      transition,
      camera: {
        position: camera.position.toArray(),
        target: controls.target.toArray(),
        zoom: camera.zoom,
        height,
      },
      triangles: renderer.info.render.triangles,
      parts: parts.map((p) => {
        const bounds = new T.Box3().setFromObject(p.mesh);
        return {
          number: p.number,
          sourceName: p.sourceName,
          assetId: p.assetId,
          visible: p.mesh.visible,
          matrix: p.mesh.matrixWorld.toArray(),
          original: p.base.toArray(),
          bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
        };
      }),
    };
  }
  return {
    parts,
    reset: () => fit(),
    change(kind) {
      if (kind === 'selection') {
        updateSelection();
        fit();
      } else if (kind === 'amount' && reduced.matches) {
        amount = state.amount;
        applyExplosion(parts, amount);
        fit(true);
      }
      dirty = true;
    },
    audit,
    onProjection(listener) {
      projectionListener = listener;
    },
    storyVisual,
    journey(stage, nextStory) {
      const changed = story?.context !== nextStory.context || story?.phase !== nextStory.phase;
      story = nextStory;
      actors.update(story);
      actors.group.visible = !state.selected;
      actors.person.visible = story.context === 'site';
      journeyStage = stage;
      if (changed) fit();
      updateSelection();
    },
    clearJourney() {
      journeyStage = null;
      story = null;
      actors.group.visible = false;
      fit();
      updateSelection();
    },
    projectAnchors(ids) {
      const result = {};
      for (const id of ids) {
        const matched = parts.filter((p) => p.assetId === id || p.sourceName === id);
        if (!matched.length) continue;
        const point = matched
          .reduce(
            (sum, p) => sum.add(p.center.clone().addScaledVector(p.offset, amount)),
            new T.Vector3(),
          )
          .divideScalar(matched.length)
          .project(camera);
        result[id] = {
          x: T.MathUtils.clamp(((point.x + 1) * 100) / 2, 13, 87),
          y: T.MathUtils.clamp(((1 - point.y) * 100) / 2, 10, 90),
        };
      }
      return result;
    },
    // Read-only diagnostics: find a real visible triangle hit for CDP pixel picking.
    pickPoint(number) {
      const p = parts.find((p) => p.number === number),
        g = p.mesh.geometry,
        pos = g.attributes.position,
        idx = g.index;
      const r = host.getBoundingClientRect();
      for (let i = 0; i < (idx ? idx.count : pos.count); i += 3) {
        const v = new T.Vector3();
        for (let j = 0; j < 3; j++)
          v.add(new T.Vector3().fromBufferAttribute(pos, idx ? idx.getX(i + j) : i + j));
        v.divideScalar(3).applyMatrix4(p.mesh.matrixWorld).project(camera);
        const x = r.x + ((v.x + 1) * r.width) / 2,
          y = r.y + ((1 - v.y) * r.height) / 2;
        if (x < r.x + 45 || x > r.right - 45 || y < r.y + 45 || y > r.bottom - 65) continue;
        if (hits(x, y)[0]?.object === p.mesh) return { x, y };
      }
      return null;
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      host.removeEventListener('keydown', keyboard);
      for (const p of parts) {
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
      }
      networkStrip.dispose();
      actors.dispose();
      renderer.dispose();
    },
  };
}
