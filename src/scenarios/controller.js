export function createJourneyController(scenarios, options = {}) {
  const stageDuration = options.stageDuration ?? 5000;
  const state = {
    scenarioIndex: 0,
    stageIndex: 0,
    playing: false,
    progress: 0,
    inspectionPaused: false,
  };
  const listeners = new Set();
  const emit = () => listeners.forEach((listener) => listener(api.getState(), api.getScenario()));
  const clampStage = (index) =>
    Math.max(0, Math.min(index, scenarios[state.scenarioIndex].stages.length - 1));
  const api = {
    getState: () => ({ ...state }),
    getScenario: () => scenarios[state.scenarioIndex],
    getStage: () => scenarios[state.scenarioIndex].stages[state.stageIndex],
    getStoryState(reduced = false) {
      const context = api.getScenario().storyContext;
      return {
        context,
        ...api.getStage().story,
        progress: reduced ? 0 : state.progress,
        reduced,
        playing: state.playing,
      };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    selectScenario(id) {
      const index = scenarios.findIndex((scenario) => scenario.id === id);
      if (index < 0) throw new Error(`Unknown scenario ${id}`);
      state.scenarioIndex = index;
      state.stageIndex = 0;
      state.progress = 0;
      state.playing = false;
      state.inspectionPaused = false;
      emit();
    },
    play() {
      state.playing = true;
      state.inspectionPaused = false;
      emit();
    },
    pause() {
      state.playing = false;
      state.inspectionPaused = false;
      emit();
    },
    toggle() {
      state.playing ? api.pause() : api.play();
    },
    next() {
      const last = scenarios[state.scenarioIndex].stages.length - 1;
      if (state.stageIndex === last) state.playing = false;
      else state.stageIndex += 1;
      state.progress = 0;
      emit();
    },
    previous() {
      state.stageIndex = clampStage(state.stageIndex - 1);
      state.progress = 0;
      emit();
    },
    seekStage(index) {
      state.stageIndex = clampStage(Number(index));
      state.progress = 0;
      emit();
    },
    seek(fraction) {
      const count = scenarios[state.scenarioIndex].stages.length;
      state.stageIndex = clampStage(Math.floor(Math.max(0, Math.min(0.999999, fraction)) * count));
      state.progress = 0;
      emit();
    },
    advance(milliseconds) {
      if (!state.playing || milliseconds <= 0) return;
      let elapsed = state.progress * stageDuration + milliseconds;
      while (elapsed >= stageDuration && state.playing) {
        elapsed -= stageDuration;
        const last = scenarios[state.scenarioIndex].stages.length - 1;
        if (state.stageIndex >= last) {
          state.progress = 1;
          state.playing = false;
          elapsed = 0;
        } else state.stageIndex += 1;
      }
      if (state.playing) state.progress = elapsed / stageDuration;
      emit();
    },
    pauseForInspection() {
      if (state.playing) {
        state.playing = false;
        state.inspectionPaused = true;
        emit();
      }
    },
    resumeAfterInspection() {
      if (state.inspectionPaused) {
        state.playing = true;
        state.inspectionPaused = false;
        emit();
      }
    },
  };
  return api;
}
