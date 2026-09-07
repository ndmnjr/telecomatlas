import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

async function sourceFiles(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await sourceFiles(file)));
    else if (/\.(mjs|js)$/.test(entry.name)) files.push(file);
  }
  return files;
}

for (const directory of ['src', 'scripts', 'tests'])
  for (const file of await sourceFiles(directory)) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status) {
      console.error(result.stderr);
      process.exit(result.status);
    }
  }
console.log('Syntax checks passed for all source, scripts and tests.');
