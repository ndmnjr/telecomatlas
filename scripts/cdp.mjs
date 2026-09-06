import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { serve } from './serve.mjs';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function browser() {
  const executable = process.env.CHROME_PATH;
  if (!executable) throw Error('Set CHROME_PATH to an installed Chrome or Chromium executable.');
  await fs.access(executable);
  await fs.mkdir('verification', { recursive: true });
  const requests = [],
    exceptions = [],
    messages = [],
    network = [];
  const server = await serve(0, requests),
    url = `http://127.0.0.1:${server.address().port}/`;
  const profile = path.resolve('verification/chrome-' + Date.now());
  const chrome = spawn(
    executable,
    [
      '--headless=new',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-sync',
      '--disable-extensions',
      '--metrics-recording-only',
      '--remote-debugging-port=0',
      '--remote-debugging-address=127.0.0.1',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--user-data-dir=' + profile,
      'about:blank',
    ],
    { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] },
  );
  let stderr = '',
    socket,
    id = 0;
  const pending = new Map();
  chrome.stderr.on('data', (b) => (stderr += b));
  chrome.on('error', (error) => (stderr += error.message));
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const seq = ++id,
        timer = setTimeout(() => {
          pending.delete(seq);
          reject(Error('Timeout: ' + method));
        }, 20000);
      pending.set(seq, { resolve, reject, timer });
      socket.send(JSON.stringify({ id: seq, method, params }));
    });
  async function close() {
    try {
      if (socket?.readyState === 1) await send('Browser.close');
    } catch {}
    socket?.close();
    if (chrome.exitCode === null) chrome.kill();
    await new Promise((r) => server.close(r));
    await fs.writeFile('verification/chrome.log', stderr);
    await fs.writeFile(
      'verification/runtime.json',
      JSON.stringify(
        {
          url,
          chromePid: chrome.pid,
          profile,
          requests,
          exceptions,
          messages,
          network,
          closed: true,
        },
        null,
        2,
      ),
    );
  }
  try {
    for (let n = 0; n < 150 && !stderr.includes('DevTools listening on'); n++) await sleep(100);
    const endpoint = stderr.match(/DevTools listening on (ws:\/\/\S+)/)?.[1];
    if (!endpoint) throw Error('Chrome startup failed');
    const tabs = await (await fetch('http://' + new URL(endpoint).host + '/json/list')).json();
    socket = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = reject;
    });
    socket.onmessage = (e) => {
      const m = JSON.parse(e.data),
        p = pending.get(m.id);
      if (p) {
        pending.delete(m.id);
        clearTimeout(p.timer);
        m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result);
      }
      if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params);
      if (m.method === 'Runtime.consoleAPICalled')
        messages.push({
          type: m.params.type,
          text: m.params.args.map((a) => a.value ?? a.description).join(' '),
        });
      if (m.method === 'Network.requestWillBeSent') network.push(m.params.request.url);
    };
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');
    const evaluate = async (expression) => {
      const r = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (r.exceptionDetails)
        throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    };
    const click = async (x, y) => {
      await send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x,
        y,
        button: 'left',
        buttons: 1,
        clickCount: 1,
      });
      await send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x,
        y,
        button: 'left',
        buttons: 0,
        clickCount: 1,
      });
      await sleep(100);
    };
    return {
      url,
      send,
      evaluate,
      close,
      exceptions,
      messages,
      requests,
      network,
      async viewport(width, height) {
        await send('Emulation.setDeviceMetricsOverride', {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: false,
        });
        await sleep(200);
      },
      async navigate(suffix = '') {
        await send('Page.navigate', { url: url + suffix });
      },
      async ready() {
        for (let i = 0; i < 100; i++) {
          if (await evaluate('!!window.atlas?.ready')) return;
          await sleep(100);
        }
        throw Error('Viewer did not become ready');
      },
      async shot(name) {
        await sleep(250);
        const r = await send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false,
        });
        const b = Buffer.from(r.data, 'base64');
        await fs.writeFile('verification/' + name + '.png', b);
        return b;
      },
      click,
      async dom(selector) {
        const r = await evaluate(
          `(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing control');e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`,
        );
        await click(r.x, r.y);
      },
      async key(key, code = key) {
        const vk = {
          Tab: 9,
          Enter: 13,
          ' ': 32,
          Home: 36,
          End: 35,
          ArrowLeft: 37,
          ArrowUp: 38,
          ArrowRight: 39,
          ArrowDown: 40,
          Escape: 27,
          Backspace: 8,
        }[key];
        await send('Input.dispatchKeyEvent', {
          type: 'keyDown',
          key,
          code,
          ...(vk ? { windowsVirtualKeyCode: vk } : {}),
          ...(key === 'Enter' ? { text: '\r' } : key === ' ' ? { text: ' ' } : {}),
        });
        await send('Input.dispatchKeyEvent', {
          type: 'keyUp',
          key,
          code,
          ...(vk ? { windowsVirtualKeyCode: vk } : {}),
        });
      },
      async drag(x, y, dx, dy) {
        await send('Input.dispatchMouseEvent', {
          type: 'mousePressed',
          x,
          y,
          button: 'left',
          buttons: 1,
        });
        for (let i = 1; i <= 8; i++)
          await send('Input.dispatchMouseEvent', {
            type: 'mouseMoved',
            x: x + (dx * i) / 8,
            y: y + (dy * i) / 8,
            buttons: 1,
          });
        await send('Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          x: x + dx,
          y: y + dy,
          button: 'left',
          buttons: 0,
        });
        await sleep(250);
      },
    };
  } catch (e) {
    await close();
    throw e;
  }
}
