import fs from 'node:fs';
import { spawn } from 'node:child_process';

const [phase, command, ...args] = process.argv.slice(2);
if (!['red', 'green'].includes(phase) || !command) throw Error('Use red|green command args');
fs.mkdirSync('verification', { recursive: true });
const file = `verification/realism-${phase}.log`;
fs.appendFileSync(file, `\n$ ${command} ${args.join(' ')}\n`);
const child = spawn(command === 'node' ? process.execPath : command, args, {
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
for (const [stream, output] of [
  [child.stdout, process.stdout],
  [child.stderr, process.stderr],
])
  stream.on('data', (chunk) => {
    fs.appendFileSync(file, chunk);
    output.write(chunk);
  });
child.on('error', (error) => {
  fs.appendFileSync(file, `${error.stack}\n`);
  process.exitCode = 1;
});
child.on('close', (code) => {
  fs.appendFileSync(file, `\n[exit ${code}]\n`);
  process.exitCode = code ?? 1;
});
