import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { browser, sleep } from './cdp.mjs';
const b = await browser();
function check(name, value) {
  console.log(`${value ? '🟢 PASS' : '🔴 FAIL'} ${name}`);
  assert.ok(value, name);
}
async function stagePixelDigest() {
  await b.evaluate('document.querySelector("#stage").scrollIntoView({block:"start"})');
  await sleep(50);
  const clip = await b.evaluate(
    '(()=>{const r=document.querySelector("#stage").getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()',
  );
  const { data } = await b.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    clip,
  });
  return createHash('sha256').update(Buffer.from(data, 'base64')).digest('hex');
}
async function groundRouteSnapshot() {
  return b.evaluate(
    `JSON.stringify({
      paths:[...document.querySelectorAll('.journey-lines path[data-active="true"]')].map(element=>({
        path:element.dataset.path,
        d:element.getAttribute('d'),
      })),
      pulses:[...document.querySelectorAll('.journey-lines .story-pulse')].map(element=>({
        cx:element.getAttribute('cx'),
        cy:element.getAttribute('cy'),
        direction:element.dataset.direction,
        plane:element.dataset.plane,
      })),
    })`,
  );
}
async function reducedRfSnapshot() {
  return b.evaluate(
    `JSON.stringify({
      actors:atlas.audit().story.actors,
      phone:{
        state:atlas.journey().story.phone,
        motion:document.querySelector('.story-phone').dataset.motion,
      },
      waves:[...document.querySelectorAll('.story-rf-wave')].map(element=>({
        d:element.getAttribute('d'),
        direction:element.dataset.direction,
      })),
    })`,
  );
}
async function isolatedOverlayPixelDigest(targetSelector, hiddenSelector) {
  await b.evaluate('document.querySelector("#stage").scrollIntoView({block:"start"})');
  await sleep(50);
  const clip = await b.evaluate(
    `(()=>{
      const target=document.querySelector(${JSON.stringify(targetSelector)});
      const unrelated=[...document.querySelectorAll(${JSON.stringify(hiddenSelector)})];
      const originals=unrelated.map(element=>[
        element,
        element.style.getPropertyValue('visibility'),
        element.style.getPropertyPriority('visibility'),
      ]);
      unrelated.forEach(element=>element.style.setProperty('visibility','hidden','important'));
      window.__restoreGroundOverlayPixels=()=>{
        originals.forEach(([element,value,priority])=>
          value
            ? element.style.setProperty('visibility',value,priority)
            : element.style.removeProperty('visibility'),
        );
        delete window.__restoreGroundOverlayPixels;
      };
      const r=target.getBoundingClientRect();
      return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1};
    })()`,
  );
  try {
    const { data } = await b.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
      clip,
    });
    return createHash('sha256').update(Buffer.from(data, 'base64')).digest('hex');
  } finally {
    await b.evaluate('window.__restoreGroundOverlayPixels?.()');
  }
}
const groundOverlayPixelDigest = () =>
  isolatedOverlayPixelDigest(
    '.journey-lines',
    '#stage canvas, .story-phone, .story-operator, .story-support, .story-rf, .journey-nodes, #leaders, #callouts, .stage-watermark, #loading',
  );
const rfOverlayPixelDigest = () =>
  isolatedOverlayPixelDigest(
    '.story-rf',
    '#stage canvas, .story-phone, .story-operator, .story-support, .journey-lines, .journey-nodes, #leaders, #callouts, .stage-watermark, #loading',
  );
try {
  await b.viewport(1440, 1000);
  await b.navigate();
  await b.ready();
  await b.dom('#journeys');
  check(
    'Simple is the default explanation',
    await b.evaluate(
      'document.querySelector(".story-technical")?.getAttribute("aria-pressed")==="false"',
    ),
  );
  check(
    'procedural person stands on ground with phone in hand',
    await b.evaluate(
      '(()=>{const a=atlas.audit().story;return a?.actors.height>=1.6&&Math.abs(a.actors.footY-a.groundY)<0.001&&a.actors.phoneHandDistance<0.12})()',
    ),
  );
  await b.dom('.journey-step-button[data-stage="6"]');
  await sleep(800);
  check(
    'ringing handset and readable inset agree',
    await b.evaluate(
      'atlas.journey().story.phone==="ringing"&&document.querySelector(".story-phone-title").textContent==="Incoming call"',
    ),
  );
  const before = await b.evaluate('JSON.stringify(atlas.journey())');
  await b.dom('.story-technical');
  check(
    'technical toggle preserves complete journey state',
    before === (await b.evaluate('JSON.stringify(atlas.journey())')),
  );
  await b.dom('.story-technical');
  await b.shot('realism-desktop-ringing');
  await b.dom('.story-answer');
  check(
    'Answer connects the conversation',
    await b.evaluate('atlas.journey().story.phone==="connected"'),
  );
  await b.viewport(390, 844);
  await b.dom('.journey-step-button[data-stage="6"]');
  await b.evaluate('document.querySelector("#stage").scrollIntoView({block:"start"})');
  await sleep(800);
  check(
    '390px phone inset is readable and contained',
    await b.evaluate(
      '(()=>{const e=document.querySelector(".story-phone-title"),r=e.getBoundingClientRect(),p=document.querySelector(".story-phone").getBoundingClientRect();return parseFloat(getComputedStyle(e).fontSize)>=16&&r.left>=0&&r.right<=innerWidth&&p.width>=130&&p.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth})()',
    ),
  );
  await b.shot('realism-mobile-ringing');
  {
    check(
      'RF has exactly four curved fronts between exact projected anchors',
      await b.evaluate(
        `(()=>{const a=atlas.audit().story; const paths=[...document.querySelectorAll('.story-rf-wave')];return paths.length===4&&paths.every(p=>p.getAttribute('d').includes(' Q '))&&JSON.stringify(a.rf.from)===JSON.stringify(a.projectedSector)&&JSON.stringify(a.rf.to)===JSON.stringify(a.projectedPhone)})()`,
      ),
    );
    check(
      'incoming conceptual nodes are absent above the defined 35% site horizon',
      await b.evaluate(
        '(()=>{const stage=document.querySelector("#stage").getBoundingClientRect(),labels=[...document.querySelectorAll(".journey-node[data-kind=conceptual]")],element=document.querySelector(".story-operator"),operator=element.getBoundingClientRect();return labels.length===0&&(element.hidden||operator.top>=stage.top+stage.height*0.35)&&element.textContent.includes("conceptual")})()',
      ),
    );
    await b.dom('.journey-step-button[data-stage="3"]');
    await sleep(800);
    check(
      'mobile ground-edge panel has the exact readable conceptual label',
      await b.evaluate(
        '(()=>{const e=document.querySelector(".story-operator"),r=e.getBoundingClientRect();return !e.hidden&&e.textContent.includes("Transport")&&e.textContent.includes("Packet core / User plane")&&e.textContent.includes("IMS")&&r.left>=0&&r.right<=innerWidth})()',
      ),
    );
    await b.dom('.journey-step-button[data-stage="6"]');
    await sleep(800);
    await b.dom('.story-answer');
    check(
      'every connected handoff has outbound and inbound media pulses',
      await b.evaluate(
        '(()=>{const a=atlas.audit().story;return a.routes.filter(r=>r.active).every(r=>r.bidirectional)&&document.querySelectorAll(".story-pulse[data-direction=inbound]").length===6&&document.querySelectorAll(".story-pulse[data-direction=outbound]").length===6})()',
      ),
    );
    await b.shot('realism-mobile-connected');
  }
  check(
    'no runtime exceptions or console errors',
    !b.exceptions.length && !b.messages.some((m) => m.type === 'error'),
  );
  for (const [width, height, label] of [
    [1440, 1000, 'desktop'],
    [390, 844, 'mobile'],
  ]) {
    await b.viewport(width, height);
    await b.dom('.journey-tab[data-scenario="incoming-call"]');
    await b.dom('.journey-step-button[data-stage="3"]');
    await sleep(700);
    const pathPixelsA = await stagePixelDigest();
    await b.dom('.journey-play');
    await sleep(900);
    await b.dom('.journey-play');
    const pathPixelsB = await stagePixelDigest();
    check(`${label} ground-path pixels travel during playback`, pathPixelsA !== pathPixelsB);
    for (const [index, name] of [
      [0, 'approach'],
      [3, 'ground-fiber'],
      [4, 'tower-cable'],
      [7, 'conversation'],
    ]) {
      await b.dom(`.journey-step-button[data-stage="${index}"]`);
      await sleep(700);
      await b.evaluate('document.querySelector("#stage").scrollIntoView({block:"start"})');
      if (index === 4)
        check(
          `${label} preparation climbs cable before RF`,
          await b.evaluate(
            'atlas.audit().story.rf===null&&atlas.audit().story.routes.some(r=>r.id==="ran-to-radio"&&r.active)',
          ),
        );
      await b.shot(`realism-${label}-${name}`);
    }
    await b.dom('.journey-step-button[data-stage="6"]');
    await sleep(700);
    await b.dom('.journey-play');
    await sleep(200);
    await b.dom('.journey-play');
    const a = await b.evaluate(
      'JSON.stringify([...document.querySelectorAll(".story-rf-wave")].map(e=>e.getAttribute("d")))',
    );
    const rfPixelsA = await stagePixelDigest();
    await b.evaluate('document.querySelector("#stage").scrollIntoView({block:"start"})');
    await b.shot(`realism-${label}-rf-a`);
    await b.dom('.journey-play');
    await sleep(350);
    await b.dom('.journey-play');
    const c = await b.evaluate(
      'JSON.stringify([...document.querySelectorAll(".story-rf-wave")].map(e=>e.getAttribute("d")))',
    );
    const rfPixelsB = await stagePixelDigest();
    check(`${label} RF fronts travel during playback`, a !== c);
    check(`${label} RF pixels change between sampled frames`, rfPixelsA !== rfPixelsB);
    await sleep(150);
    check(
      `${label} Pause freezes all RF fronts`,
      c ===
        (await b.evaluate(
          'JSON.stringify([...document.querySelectorAll(".story-rf-wave")].map(e=>e.getAttribute("d")))',
        )),
    );
    await b.evaluate('document.querySelector("#stage").scrollIntoView({block:"start"})');
    await b.shot(`realism-${label}-rf-b`);
  }
  {
    await b.dom('.journey-tab[data-scenario="incoming-call"]');
    await b.dom('.journey-step-button[data-stage="6"]');
    await sleep(800);
    await b.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await sleep(250);
    check(
      'live reduced-motion changes paused actors and ringing inset immediately',
      await b.evaluate(
        'atlas.audit().story.actors.pose==="static"&&document.querySelector(".story-phone").dataset.motion==="static-ring"',
      ),
    );
    const snapshot = await reducedRfSnapshot();
    const reducedPixelsA = await rfOverlayPixelDigest();
    const reducedProgressA = await b.evaluate('atlas.journey().progress');
    await b.dom('.journey-play');
    await sleep(350);
    const reducedProgressB = await b.evaluate('atlas.journey().progress');
    check(
      'reduced motion freezes actors, phone, and exact RF fronts while timeline advances',
      reducedProgressA !== reducedProgressB && snapshot === (await reducedRfSnapshot()),
    );
    const reducedPixelsB = await rfOverlayPixelDigest();
    check(
      'reduced-motion RF pixels are static between sampled frames',
      reducedPixelsA === reducedPixelsB,
    );
    await b.dom('.journey-play');
    await b.evaluate('document.querySelector("#stage").scrollIntoView({block:"start"})');
    await b.shot('realism-mobile-reduced-motion');
    await b.dom('.journey-step-button[data-stage="3"]');
    await sleep(500);
    const reducedPathStateA = await groundRouteSnapshot();
    const reducedPathPixelsA = await groundOverlayPixelDigest();
    const reducedPathProgressA = await b.evaluate('atlas.journey().progress');
    await b.dom('.journey-play');
    await sleep(350);
    const reducedPathStateB = await groundRouteSnapshot();
    const reducedPathPixelsB = await groundOverlayPixelDigest();
    const reducedPathProgressB = await b.evaluate('atlas.journey().progress');
    check(
      'reduced-motion ground-route geometry and pulses are static while the timeline advances',
      reducedPathProgressA !== reducedPathProgressB && reducedPathStateA === reducedPathStateB,
    );
    check(
      'reduced-motion ground-overlay pixels are static while the timeline advances',
      reducedPathPixelsA === reducedPathPixelsB,
    );
    await b.dom('#explore');
    await sleep(800);
    check(
      'Explore restores all 32 original mesh matrices and 11 asset identities',
      await b.evaluate(
        '(()=>{const a=atlas.audit();return a.story===null&&a.parts.length===32&&new Set(a.parts.map(p=>p.assetId).filter(Boolean)).size===11&&a.parts.every(p=>p.visible&&JSON.stringify(p.matrix)===JSON.stringify(p.original))})()',
      ),
    );
  }
  check(
    'complete realism suite has no runtime exceptions or console errors',
    !b.exceptions.length && !b.messages.some((m) => m.type === 'error'),
  );
  console.log('All realism checks passed at desktop and 390x844.');
} finally {
  await b.close();
}
