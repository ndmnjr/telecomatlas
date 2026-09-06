import { test } from 'node:test';
import assert from 'node:assert/strict';
import { launch } from '../scripts/launch.mjs';
test('launcher opens the localhost URL only after its owned HTTP server is accepting requests', async () => {
  let opened = false;
  const server = await launch(async (url) => {
    const r = await fetch(url);
    assert.ok([200, 404].includes(r.status));
    opened = true;
  }, 0);
  try {
    assert.ok(opened, 'browser opener must be called after listen');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
