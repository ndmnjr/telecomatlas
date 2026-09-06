import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { browser, sleep } from './cdp.mjs';
const b = await browser(),
  checks = [],
  coverage = [];
function check(name, value) {
  checks.push({ name, pass: !!value });
  console.log((value ? 'PASS ' : 'FAIL ') + name);
  assert.ok(value, name);
}
const audit = () => b.evaluate('atlas.audit()');
async function settle() {
  for (let i = 0; i < 100; i++) {
    const a = await audit();
    if (
      !a.transition &&
      Math.abs(
        a.amount - Number(await b.evaluate('document.querySelector("#explode").value')) / 100,
      ) < 0.00001
    )
      return a;
    await sleep(60);
  }
  throw Error('Transition did not settle');
}
async function search(text) {
  await b.dom('#search');
  await b.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'a',
    code: 'KeyA',
    modifiers: 2,
    windowsVirtualKeyCode: 65,
  });
  await b.key('Backspace');
  if (text) await b.send('Input.insertText', { text });
  await sleep(80);
}
const overlap = (a, c) => a.min.every((v, i) => v <= c.max[i] && a.max[i] >= c.min[i]);
async function layoutChecks(prefix) {
  check(
    prefix + ' has no horizontal page overflow',
    await b.evaluate('document.documentElement.scrollWidth<=innerWidth'),
  );
  check(
    prefix + ' numbered callouts do not overlap each other or stage controls',
    await b.evaluate(
      `(()=>{const rs=[...document.querySelectorAll('.callout:not([hidden]),.stage-tools button')].map(e=>e.getBoundingClientRect());return rs.every((a,i)=>rs.slice(i+1).every(b=>a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top));})()`,
    ),
  );
}
try {
  await b.viewport(1440, 1000);
  await b.navigate();
  await sleep(500);
  check(
    'loaded page exposes 32 selectable legend entries',
    await b.evaluate('document.querySelectorAll(".part-row").length===32'),
  );
  await b.ready();
  await settle();
  check(
    'desktop sidebar remains within the viewer height',
    await b.evaluate(
      'document.querySelector(".sidebar").getBoundingClientRect().height<=document.querySelector(".viewer").getBoundingClientRect().height+1',
    ),
  );
  check(
    'desktop inspector and its controls fit inside the viewport',
    await b.evaluate(
      'document.querySelector(".inspector").getBoundingClientRect().bottom<innerHeight',
    ),
  );
  await layoutChecks('desktop');
  let a = await audit();
  const original = a.parts.map((p) => p.matrix);
  check('real geometry renders 2504 source triangles', a.triangles === 2504);
  check(
    'all 32 source names and 11 asset IDs are unique and represented',
    new Set(a.parts.map((p) => p.sourceName)).size === 32 &&
      new Set(a.parts.map((p) => p.assetId).filter(Boolean)).size === 11,
  );
  check(
    'all 32 numbered callouts are visible by default',
    await b.evaluate('document.querySelectorAll(".callout:not([hidden])").length===32'),
  );
  await b.shot('desktop-assembled');
  await b.dom('#labels');
  check(
    'labels toggle off removes all callouts',
    await b.evaluate('document.querySelectorAll(".callout:not([hidden])").length===0'),
  );
  const home = await b.shot('desktop-geometry-baseline');
  const stage = await b.evaluate(
    'document.querySelector("#stage").getBoundingClientRect().toJSON()',
  );
  await b.drag(stage.x + stage.width * 0.5, stage.y + stage.height * 0.5, 95, -25);
  a = await audit();
  check(
    'real canvas drag orbits without selecting',
    a.selected === null &&
      JSON.stringify(a.parts.map((p) => p.matrix)) === JSON.stringify(original),
  );
  const orbit = await b.shot('desktop-orbit');
  check('orbit visibly changes rendered pixels', !home.equals(orbit));
  await b.send('Input.dispatchMouseEvent', {
    type: 'mouseWheel',
    x: stage.x + stage.width / 2,
    y: stage.y + stage.height / 2,
    deltaY: -200,
    deltaX: 0,
  });
  await sleep(200);
  check('real wheel changes camera zoom', (await audit()).camera.zoom !== 1);
  const zoom = await b.shot('desktop-zoom');
  check('zoom visibly changes rendered pixels', !orbit.equals(zoom));
  await b.dom('#reset');
  await settle();
  const reset = await b.shot('desktop-reset');
  check('reset restores identical baseline pixels', home.equals(reset));
  const pick = await b.evaluate('atlas.pickPoint(10)');
  check('a visible tower triangle is available for ray picking', !!pick);
  await b.click(pick.x, pick.y);
  await settle();
  check('click on actual geometry selects tower mesh 10', (await audit()).selected === 10);
  await b.shot('desktop-geometry-selected');
  await b.dom('#show-all');
  await settle();
  await b.dom('#labels');
  await b.dom('.callout[data-part="32"]');
  await settle();
  check('numbered callout selects the camera lens', (await audit()).selected === 32);
  await b.dom('#show-all');
  await settle();
  await search('DEMO-CABINET-01');
  check(
    'real search text filters to eight cabinet meshes',
    await b.evaluate('document.querySelectorAll(".part-row").length===8'),
  );
  await search('no-such-part');
  check(
    'empty search shows helpful feedback',
    await b.evaluate('!document.querySelector("#no-results").hidden'),
  );
  await search('');
  for (let n = 1; n <= 32; n++) {
    await b.dom(`.part-row[data-part="${n}"]`);
    const s = await settle();
    const label = await b.evaluate('document.querySelector("#detail-title").textContent');
    const source = await b.evaluate('document.querySelector("#mesh-name").textContent');
    check(
      `list selection ${String(n).padStart(2, '0')} updates inspector and focuses actual mesh`,
      s.selected === n &&
        source === s.parts[n - 1].sourceName &&
        s.camera.height > 0 &&
        label.length > 0,
    );
    coverage.push({
      number: n,
      source,
      label,
      assetId: s.parts[n - 1].assetId,
      cameraHeight: s.camera.height,
    });
  }
  await b.dom('.part-row[data-part="20"]');
  await settle();
  await b.shot('desktop-small-part');
  check('tiny handle is fitted large enough to inspect', (await audit()).camera.height < 1);
  await b.dom('#isolate');
  check(
    'isolation leaves exactly the selected mesh visible',
    (await audit()).parts
      .filter((p) => p.visible)
      .map((p) => p.number)
      .join() === '20',
  );
  await b.shot('desktop-isolated');
  await b.dom('#show-all');
  await settle();
  check(
    'Show all restores 32 meshes and clears selection',
    (await audit()).parts.every((p) => p.visible) && (await audit()).selected === null,
  );
  await b.dom('#exploded');
  a = await settle();
  check('Exploded button reaches exact endpoint', a.amount === 1);
  check(
    'all 496 world bounds pairs are non-overlapping at exploded endpoint',
    a.parts.every((p, i) => a.parts.slice(i + 1).every((q) => !overlap(p.bounds, q.bounds))),
  );
  check(
    'individual mesh rotations and scales survive explosion',
    a.parts.every(
      (p, i) => JSON.stringify(p.matrix.slice(0, 12)) === JSON.stringify(original[i].slice(0, 12)),
    ),
  );
  await b.shot('desktop-exploded');
  await layoutChecks('desktop exploded');
  await b.dom('#explode');
  await b.key('Home');
  await settle();
  await b.key('ArrowRight');
  check(
    'slider responds to keyboard with a one-percent step',
    await b.evaluate('document.querySelector("#explode").value==="1"'),
  );
  const sr = await b.evaluate(
    'document.querySelector("#explode").getBoundingClientRect().toJSON()',
  );
  for (const value of [0.25, 0.5, 0.75]) {
    await b.click(sr.x + 8 + (sr.width - 16) * value, sr.y + sr.height / 2);
    a = await settle();
    check(
      `real slider pointer reaches ${value * 100}% midpoint`,
      Math.abs(a.amount - value) < 0.02,
    );
    check(
      `midpoint ${value} preserves all mesh shapes`,
      a.parts.every(
        (p, i) =>
          JSON.stringify(p.matrix.slice(0, 12)) === JSON.stringify(original[i].slice(0, 12)),
      ),
    );
  }
  await b.dom('#assembled');
  a = await settle();
  check(
    'Assembled button restores all 32 exact original world matrices',
    a.amount === 0 &&
      a.parts.every((p, i) => JSON.stringify(p.matrix) === JSON.stringify(original[i])),
  );
  await b.dom('#stage');
  await b.evaluate('document.querySelector("#stage").focus()');
  const cameraBefore = (await audit()).camera;
  await b.key('ArrowRight');
  check(
    'keyboard arrow orbits camera',
    JSON.stringify((await audit()).camera.position) !== JSON.stringify(cameraBefore.position),
  );
  await b.key('+', 'Equal');
  check('keyboard plus zooms camera', (await audit()).camera.zoom > 1);
  await b.key('r', 'KeyR');
  await settle();
  check('keyboard R resets camera', (await audit()).camera.zoom === 1);
  await b.key('/', 'Slash');
  check('slash shortcut focuses search', await b.evaluate('document.activeElement.id==="search"'));
  await b.key('Tab');
  check(
    'Tab moves keyboard focus to Show all',
    await b.evaluate('document.activeElement.id==="show-all"'),
  );
  await b.key('Tab');
  await b.key('Enter');
  check('keyboard Enter selects first legend part', (await audit()).selected === 1);
  await b.key('Escape');
  await settle();
  check('Escape clears inspection', (await audit()).selected === null);
  await b.dom('#inspect');
  await settle();
  check('Inspect opens focused component details', (await audit()).selected === 10);
  await b.dom('#explore');
  await settle();
  await b.viewport(390, 844);
  await b.evaluate('scrollTo(0,0)');
  await settle();
  await layoutChecks('mobile');
  check(
    'mobile stage remains at least 530 pixels tall',
    await b.evaluate('document.querySelector("#stage").clientHeight>=530'),
  );
  check(
    'mobile legend can scroll to all 32 entries',
    await b.evaluate(
      'document.querySelectorAll(".part-row").length===32&&document.querySelector("#legend").scrollHeight>document.querySelector("#legend").clientHeight',
    ),
  );
  await b.shot('mobile-assembled');
  await b.dom('#exploded');
  a = await settle();
  await b.evaluate('scrollTo(0,0)');
  await b.shot('mobile-exploded');
  check(
    'mobile packing has no bounds overlaps',
    a.parts.every((p, i) => a.parts.slice(i + 1).every((q) => !overlap(p.bounds, q.bounds))),
  );
  await b.dom('.part-row[data-part="32"]');
  await settle();
  await b.dom('#isolate');
  await b.evaluate('document.querySelector(".inspector").scrollIntoView({block:"end"})');
  await b.shot('mobile-inspector');
  check(
    'mobile real list and isolate controls work',
    (await audit()).selected === 32 && (await audit()).parts.filter((p) => p.visible).length === 1,
  );
  await b.evaluate('document.querySelector("#stage").scrollIntoView({block:"center"})');
  await b.shot('mobile-lens-geometry');
  check('no runtime JavaScript exceptions', b.exceptions.length === 0);
  check(
    'no unexpected browser console errors',
    b.messages.filter((m) => m.type === 'error').length === 0,
  );
  check(
    'every runtime request stays on the local origin',
    b.network.every((u) => u.startsWith(b.url) || u.startsWith('data:')),
  );
  check(
    'model, inventory and local Three library were served',
    ['telecom_site.glb', 'telecom_inventory.json', 'three.module.js'].every((name) =>
      b.requests.some((r) => r.url.endsWith(name) && r.status === 200),
    ),
  );
  await b.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await b.navigate();
  await b.ready();
  await b.dom('#exploded');
  a = await audit();
  check(
    'reduced motion sets transforms and camera immediately',
    a.reducedMotion && a.amount === 1 && !a.transition,
  );
  await b.shot('mobile-reduced-motion');
  await b.send('Network.setBlockedURLs', { urls: ['*telecom_site.glb'] });
  await b.navigate();
  await sleep(1000);
  check(
    'missing model produces actionable error and retry',
    await b.evaluate(
      'document.querySelector("#loading").getAttribute("role")==="alert"&&document.querySelector("#loading button").textContent==="Reload viewer"',
    ),
  );
  check(
    'model error names the failed asset and local recovery action',
    await b.evaluate('/model.*local build/i.test(document.querySelector("#loading").textContent)'),
  );
  await b.shot('mobile-error');
  await b.send('Network.setBlockedURLs', { urls: [] });
  await b.dom('#loading button');
  await b.ready();
  check('retry recovers after local asset becomes available', await b.evaluate('!!atlas.ready'));
  await b.send('Network.setBlockedURLs', { urls: ['*telecom_inventory.json'] });
  await b.navigate();
  await sleep(1000);
  check(
    'missing inventory cannot silently render unvalidated model',
    await b.evaluate(
      '!window.atlas&&document.querySelector("#loading").getAttribute("role")==="alert"',
    ),
  );
  console.log(
    `All ${checks.length} browser checks passed; ${coverage.length}/32 list selections verified.`,
  );
} finally {
  await fs.writeFile(
    'verification/browser-checks.json',
    JSON.stringify(
      {
        checks,
        coverage,
        counts: {
          checks: checks.length,
          passed: checks.filter((c) => c.pass).length,
          selected: coverage.length,
        },
        note: 'Final blocked requests deliberately test missing model/inventory recovery. Runtime log records these expected network errors.',
      },
      null,
      2,
    ),
  );
  await b.close();
}
