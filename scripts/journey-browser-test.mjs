import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { browser, sleep } from './cdp.mjs';

const scenarios = JSON.parse(await fs.readFile('src/scenarios/scenarios.json', 'utf8'));
const b = await browser();
const checks = [];
const stamp = `journeys-${Date.now()}`;
const screenshots = [];

function check(name, value) {
  checks.push({ name, pass: Boolean(value) });
  console.log(`${value ? 'PASS' : 'FAIL'} ${name}`);
  assert.ok(value, name);
}

async function journey() {
  return b.evaluate('atlas.journey()');
}

async function clickScenario(id) {
  await b.dom(`.journey-tab[data-scenario="${id}"]`);
  await sleep(80);
}

async function clickStage(index) {
  await b.dom(`.journey-step-button[data-stage="${index}"]`);
  await sleep(80);
}

async function verifyStage(viewport, scenario, index) {
  await clickStage(index);
  const state = await journey();
  const stage = scenario.stages[index];
  check(
    `${viewport} ${scenario.id} stage ${index + 1} state is exact`,
    state.scenarioId === scenario.id && state.stageId === stage.id && state.stageIndex === index,
  );
  check(
    `${viewport} ${scenario.id} stage ${index + 1} current step is unique`,
    await b.evaluate(
      'document.querySelectorAll(".journey-step-button[aria-current=true]").length===1',
    ),
  );
  check(
    `${viewport} ${scenario.id} stage ${index + 1} path mapping is exact`,
    await b.evaluate(
      `JSON.stringify([...document.querySelectorAll('.journey-lines path[data-active=true]')].map(e=>e.dataset.path))===${JSON.stringify(JSON.stringify(stage.paths))}`,
    ),
  );
  check(
    `${viewport} ${scenario.id} stage ${index + 1} overlay nodes stay inside stage`,
    await b.evaluate(
      `(()=>{const s=document.querySelector('#stage').getBoundingClientRect();return [...document.querySelectorAll('.journey-node')].every(e=>{const r=e.getBoundingClientRect();return r.left>=s.left-1&&r.right<=s.right+1&&r.top>=s.top-1&&r.bottom<=s.bottom+1})})()`,
    ),
  );
  check(
    `${viewport} ${scenario.id} stage ${index + 1} visible journey labels do not collide`,
    await b.evaluate(
      `(()=>{const rs=[...document.querySelectorAll('.journey-node-label')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect());return rs.every((a,i)=>rs.slice(i+1).every(c=>a.right<=c.left||c.right<=a.left||a.bottom<=c.top||c.bottom<=a.top))})()`,
    ),
  );
}

async function shot(name) {
  const path = `verification/${stamp}-${name}.png`;
  await b.shot(`${stamp}-${name}`);
  screenshots.push(path);
}

try {
  await b.viewport(1440, 1000);
  await b.navigate();
  await b.ready();
  await b.dom('#journeys');
  check(
    'desktop Journeys mode is additive and preserves 32 inventory rows',
    await b.evaluate(
      'atlas.journey().mode==="journeys"&&document.querySelectorAll(".part-row").length===32&&document.querySelectorAll(".journey-node").length>0',
    ),
  );
  check(
    'desktop journey controls and page have no horizontal clipping',
    await b.evaluate(
      'document.documentElement.scrollWidth<=innerWidth&&document.querySelector("#journey-panel").scrollWidth<=document.querySelector("#journey-panel").clientWidth',
    ),
  );
  check(
    'legend names green paths Media / service traffic',
    await b.evaluate(
      'document.querySelector(".plane-key [data-plane=media]").textContent==="Media / service traffic"',
    ),
  );

  for (const scenario of scenarios) {
    await clickScenario(scenario.id);
    check(
      `desktop ${scenario.id} Standards basis links are exact safe new-tab links`,
      await b.evaluate(
        `JSON.stringify([...document.querySelectorAll('.journey-source-link')].map(a=>({label:a.textContent,url:a.href,target:a.target,rel:a.rel})))===${JSON.stringify(
          JSON.stringify(
            scenario.sources.map((source) => ({
              label: source.label,
              url: source.url,
              target: '_blank',
              rel: 'noopener',
            })),
          ),
        )}`,
      ),
    );
    for (let index = 0; index < scenario.stages.length; index++)
      await verifyStage('desktop', scenario, index);
  }

  await clickScenario('incoming-call');
  await clickStage(7);
  await b.evaluate(
    'document.querySelector("#journey-panel").scrollTop=0;document.querySelector("#stage").scrollIntoView({block:"center"})',
  );
  await shot('desktop-incoming-media');
  check(
    'incoming established conversation uses the ordered segmented green media path set',
    await b.evaluate(
      `document.querySelector("#journey-overlay").dataset.plane==="media"&&JSON.stringify([...document.querySelectorAll('.journey-lines path[data-active=true][data-plane=media]')].map(e=>e.dataset.path))===${JSON.stringify(
        JSON.stringify(scenarios[0].stages.at(-1).paths),
      )}`,
    ),
  );

  await clickScenario('core-team');
  await clickStage(4);
  await b.evaluate(
    'document.querySelector("#journey-panel").scrollTop=0;document.querySelector("#stage").scrollIntoView({block:"center"})',
  );
  await shot('desktop-core-media');

  await clickScenario('transport-fiber');
  await clickStage(5);
  check(
    'transport protection is dashed conceptual and sync is amber support service',
    await b.evaluate(
      '!!document.querySelector(".journey-lines path[data-active=true][data-kind=protection]")&&!!document.querySelector(".journey-lines path[data-active=true][data-plane=support]")',
    ),
  );
  await b.evaluate(
    'document.querySelector("#journey-panel").scrollTop=0;document.querySelector("#stage").scrollIntoView({block:"center"})',
  );
  await shot('desktop-transport-protection');

  await clickScenario('incoming-call');
  await clickStage(0);
  await b.dom('.journey-play');
  await sleep(350);
  let state = await journey();
  check(
    'Play advances deterministic in-stage progress',
    state.playing && state.progress > 0 && state.stageIndex === 0,
  );
  await b.dom('.journey-play');
  const paused = await journey();
  await sleep(250);
  state = await journey();
  check(
    'Pause freezes stage and progress',
    !state.playing && state.stageIndex === paused.stageIndex && state.progress === paused.progress,
  );
  await b.dom('.journey-next');
  check('Next advances one stage', (await journey()).stageIndex === 1);
  await b.dom('.journey-previous');
  check('Previous returns one stage', (await journey()).stageIndex === 0);
  await b.dom('.journey-timeline');
  await b.key('End');
  check('timeline seek reaches final stage', (await journey()).stageIndex === 7);
  await b.key('Home');
  check('timeline seek returns to first stage', (await journey()).stageIndex === 0);
  await b.evaluate('document.querySelector("#journey-panel").focus()');
  await b.key('ArrowRight');
  check('journey keyboard Right advances stage', (await journey()).stageIndex === 1);
  await b.key('ArrowLeft');
  check('journey keyboard Left returns stage', (await journey()).stageIndex === 0);

  await clickStage(4);
  await b.dom('.journey-play');
  const inspectStage = (await journey()).stageIndex;
  await b.dom('.journey-node[data-target="DEMO-CABINET-01"]');
  state = await journey();
  check(
    'selecting highlighted real site asset pauses without losing stage',
    state.inspectionPaused &&
      !state.playing &&
      state.stageIndex === inspectStage &&
      (await b.evaluate('atlas.audit().selected')) > 0,
  );
  check(
    'paused inspection presents readable component detail and resume control',
    await b.evaluate(
      '!document.querySelector(".journey-inspection").hidden&&document.querySelector(".journey-inspection-title").textContent.length>0',
    ),
  );
  await b.dom('.journey-resume');
  state = await journey();
  check(
    'resume continues same journey stage',
    state.playing && !state.inspectionPaused && state.stageIndex === inspectStage,
  );
  await b.dom('.journey-play');
  await b.key('Escape');
  check(
    'leaving pause inspection restores full 32-mesh journey context',
    (await b.evaluate('atlas.audit().selected')) === null &&
      (await b.evaluate('atlas.audit().parts.filter(p=>p.visible).length')) === 32,
  );

  await b.viewport(390, 844);
  await b.evaluate('scrollTo(0,0)');
  check(
    'mobile page has no horizontal clipping in Journeys mode',
    await b.evaluate('document.documentElement.scrollWidth<=innerWidth'),
  );
  for (const scenario of scenarios) {
    await clickScenario(scenario.id);
    for (let index = 0; index < scenario.stages.length; index++)
      await verifyStage('mobile', scenario, index);
  }
  await clickScenario('transport-fiber');
  await clickStage(6);
  check(
    'optional microwave branch is explicitly marked optional',
    await b.evaluate(
      '!!document.querySelector(".journey-lines path[data-active=true][data-optional=true]")',
    ),
  );
  await b.evaluate('scrollTo(0,0)');
  await shot('mobile-transport-microwave');
  await b.evaluate('document.querySelector("#journey-panel").scrollIntoView({block:"start"})');
  await shot('mobile-journey-panel');

  await b.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await b.navigate();
  await b.ready();
  await b.dom('#journeys');
  await clickScenario('incoming-call');
  await clickStage(7);
  check(
    'reduced motion uses stepped static path state with no continuous journey pulse',
    await b.evaluate(
      'document.querySelector("#journey-overlay").dataset.reducedMotion==="true"&&[...document.querySelectorAll(".journey-lines path")].every(e=>e.dataset.motion==="stepped")',
    ),
  );
  await b.evaluate('scrollTo(0,0)');
  await shot('mobile-reduced-motion-incoming');

  check('journey browser run has no JavaScript exceptions', b.exceptions.length === 0);
  check(
    'journey browser run has no console errors',
    b.messages.filter((message) => message.type === 'error').length === 0,
  );
  console.log(
    `All ${checks.length} journey browser checks passed across ${scenarios.reduce((sum, scenario) => sum + scenario.stages.length, 0)} stages at desktop and mobile.`,
  );
} finally {
  const report = `verification/${stamp}-checks.json`;
  await fs.writeFile(
    report,
    JSON.stringify(
      {
        checks,
        screenshots,
        scenarios: scenarios.length,
        stages: scenarios.reduce((sum, scenario) => sum + scenario.stages.length, 0),
      },
      null,
      2,
    ),
  );
  console.log(`Report: ${report}`);
  await b.close();
}
