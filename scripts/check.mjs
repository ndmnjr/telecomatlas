import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
for (const dir of ['src', 'scripts', 'tests']) {
  for (const file of await fs.readdir(new URL('../' + dir + '/', import.meta.url))) {
    if (!/\.(mjs|js)$/.test(file)) continue;
    const result = spawnSync(process.execPath, ['--check', dir + '/' + file], { encoding: 'utf8' });
    if (result.status) {
      console.error(result.stderr);
      process.exit(result.status);
    }
  }
}
console.log('Syntax checks passed for all source, scripts and tests.');
