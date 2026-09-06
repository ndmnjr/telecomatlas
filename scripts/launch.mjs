import { serve } from './serve.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export async function launch(openBrowser, port = 4173) {
  const server = await serve(port);
  try {
    await openBrowser(`http://127.0.0.1:${server.address().port}/`);
    return server;
  } catch (error) {
    await new Promise((resolve) => server.close(resolve));
    throw error;
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const server = await launch(
      (url) =>
        new Promise((resolve, reject) => {
          const opener = spawn('cmd.exe', ['/d', '/c', 'start', '', url], {
            windowsHide: true,
            stdio: 'ignore',
          });
          opener.once('error', reject);
          opener.once('exit', (code) =>
            code === 0 ? resolve() : reject(Error('Browser could not be opened.')),
          );
        }),
    );
    console.log(
      'Telecom Atlas: http://127.0.0.1:4173/\nKeep this terminal open. Press Ctrl+C to stop.',
    );
    for (const signal of ['SIGINT', 'SIGTERM'])
      process.on(signal, () => server.close(() => process.exit()));
  } catch (error) {
    console.error(
      error.code === 'EADDRINUSE'
        ? 'Port 4173 is already in use. Stop its server and relaunch.'
        : error.message,
    );
    process.exitCode = 1;
  }
}
