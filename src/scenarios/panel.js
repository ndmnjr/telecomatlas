export function panelViewModel(scenario, stage, state) {
  const last = scenario.stages.length - 1;
  return {
    stepText: `Step ${state.stageIndex + 1} of ${scenario.stages.length}`,
    previousDisabled: state.stageIndex === 0,
    nextDisabled: state.stageIndex === last,
    timelineValue: state.stageIndex,
    timelineMax: last,
    playLabel: state.playing ? 'Pause' : 'Play',
    sources: scenario.sources.map((source) => ({
      ...source,
      target: '_blank',
      rel: 'noopener',
    })),
    stage,
  };
}

export function journeyKeyAction({ key, tagName }) {
  if (['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT'].includes(tagName)) return null;
  return (
    {
      ' ': 'toggle',
      ArrowRight: 'next',
      ArrowLeft: 'previous',
      Home: 'first',
      End: 'last',
    }[key] ?? null
  );
}

const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

export function createJourneyPanel(host, scenarios, handlers) {
  const kicker = element('div', 'eyebrow', 'LEARN / NETWORK JOURNEYS');
  const tabs = element('div', 'journey-tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Network journey scenarios');
  const question = element('h2', 'journey-question');
  question.id = 'journey-question';
  const technology = element('p', 'journey-technology');
  const progress = element('div', 'journey-step-count');
  const stageTitle = element('h3', 'journey-stage-title');
  const narrative = element('p', 'journey-narrative');
  narrative.setAttribute('aria-live', 'polite');
  const condition = element('p', 'journey-condition');
  const plane = element('div', 'plane-key');
  plane.innerHTML =
    '<span data-plane="control">Signalling</span><span data-plane="media">Media / service traffic</span><span data-plane="support">Availability support</span>';
  const controls = element('div', 'journey-controls');
  const previous = element('button', 'journey-previous', '← Previous');
  const play = element('button', 'journey-play', 'Play');
  const next = element('button', 'journey-next', 'Next →');
  previous.type = play.type = next.type = 'button';
  controls.append(previous, play, next);
  const timelineLabel = element('label', 'journey-timeline-label', 'Journey timeline');
  const timeline = element('input', 'journey-timeline');
  timeline.type = 'range';
  timeline.min = '0';
  timeline.step = '1';
  timelineLabel.append(timeline);
  const listTitle = element('div', 'eyebrow journey-list-title', 'ALL STEPS');
  const list = element('ol', 'journey-step-list');
  const inspection = element('section', 'journey-inspection');
  inspection.hidden = true;
  const inspectionKicker = element('div', 'eyebrow', 'PAUSED FOR INSPECTION');
  const inspectionTitle = element('h3', 'journey-inspection-title');
  const inspectionCopy = element('p', 'journey-inspection-copy');
  const resume = element('button', 'journey-resume', 'Resume journey');
  resume.type = 'button';
  inspection.append(inspectionKicker, inspectionTitle, inspectionCopy, resume);
  const sources = element('section', 'journey-sources');
  const sourcesTitle = element('div', 'eyebrow journey-sources-title', 'STANDARDS BASIS');
  const sourceLinks = element('div', 'journey-source-links');
  sources.append(sourcesTitle, sourceLinks);
  const disclaimer = element('p', 'journey-disclaimer');
  host.replaceChildren(
    kicker,
    tabs,
    question,
    technology,
    progress,
    stageTitle,
    narrative,
    condition,
    plane,
    controls,
    timelineLabel,
    listTitle,
    list,
    inspection,
    sources,
    disclaimer,
  );

  for (const scenario of scenarios) {
    const button = element('button', 'journey-tab', scenario.title);
    button.type = 'button';
    button.dataset.scenario = scenario.id;
    button.setAttribute('role', 'tab');
    button.addEventListener('click', () => handlers.selectScenario(scenario.id));
    tabs.append(button);
  }
  previous.addEventListener('click', handlers.previous);
  play.addEventListener('click', handlers.toggle);
  next.addEventListener('click', handlers.next);
  timeline.addEventListener('input', (event) => handlers.seekStage(Number(event.target.value)));
  resume.addEventListener('click', handlers.resume);

  let renderedScenario = null;
  return {
    render(scenario, stage, state, inspectedPart = null) {
      const model = panelViewModel(scenario, stage, state);
      for (const tab of tabs.children) {
        const selected = tab.dataset.scenario === scenario.id;
        tab.setAttribute('aria-selected', String(selected));
        tab.setAttribute('tabindex', selected ? '0' : '-1');
      }
      question.textContent = scenario.question;
      technology.textContent = scenario.technology;
      progress.textContent = model.stepText;
      stageTitle.textContent = stage.label;
      narrative.textContent = stage.narrative;
      condition.hidden = !stage.condition;
      condition.textContent = stage.condition ?? '';
      previous.disabled = model.previousDisabled;
      next.disabled = model.nextDisabled;
      play.textContent = model.playLabel;
      play.setAttribute('aria-pressed', String(state.playing));
      timeline.max = String(model.timelineMax);
      timeline.value = String(model.timelineValue);
      timeline.setAttribute('aria-valuetext', model.stepText);
      host.dataset.plane = stage.activePlane;
      disclaimer.textContent = scenario.disclaimer;
      if (renderedScenario !== scenario.id) {
        list.replaceChildren();
        for (const item of scenario.stages) {
          const row = element('li', 'journey-step-item');
          const button = element('button', 'journey-step-button');
          button.type = 'button';
          button.dataset.stage = String(item.order - 1);
          const number = element(
            'span',
            'journey-step-number',
            String(item.order).padStart(2, '0'),
          );
          const label = element('span', '', item.label);
          button.append(number, label);
          button.addEventListener('click', () => handlers.seekStage(item.order - 1));
          row.append(button);
          list.append(row);
        }
        sourceLinks.replaceChildren();
        for (const source of model.sources) {
          const link = element('a', 'journey-source-link', source.label);
          link.href = source.url;
          link.target = source.target;
          link.rel = source.rel;
          sourceLinks.append(link);
        }
        renderedScenario = scenario.id;
      }
      for (const button of list.querySelectorAll('button'))
        button.setAttribute(
          'aria-current',
          String(Number(button.dataset.stage) === state.stageIndex),
        );
      inspection.hidden = !inspectedPart;
      if (inspectedPart) {
        inspectionTitle.textContent = inspectedPart.label;
        inspectionCopy.textContent = inspectedPart.description;
      }
      return model;
    },
  };
}
