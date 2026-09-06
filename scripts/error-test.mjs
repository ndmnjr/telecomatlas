import assert from 'node:assert/strict';
import { browser, sleep } from './cdp.mjs';
const b = await browser();
try {
  await b.viewport(390, 844);
  await b.send('Network.setBlockedURLs', { urls: ['*telecom_site.glb'] });
  await b.navigate();
  await sleep(1200);
  const message = await b.evaluate('document.querySelector("#loading").textContent');
  assert.match(message, /model.*local build/i);
  console.log('PASS missing model names the failing asset and local recovery action');
} finally {
  await b.close();
}
