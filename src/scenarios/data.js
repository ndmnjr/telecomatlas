import { validateScenarios } from './schema.js';
import { JOURNEY_PATHS, JOURNEY_TARGETS } from './paths.js';

export const SCENARIO_DATA_URL = 'src/scenarios/scenarios.json';

export async function loadScenarios(fetcher = fetch) {
  const response = await fetcher(SCENARIO_DATA_URL);
  if (!response.ok) throw new Error(`Journey data could not be loaded (HTTP ${response.status}).`);
  return validateScenarios(await response.json(), {
    targets: JOURNEY_TARGETS,
    paths: JOURNEY_PATHS,
  });
}
