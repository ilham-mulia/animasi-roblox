// usage: node render.mjs <outdir> <frames: "a-b" or "1,2,3"> [step] [quality]
// Env: RESUME=1 skip existing frames · HASH=#sheet|#e|#nd page hash · WEB=<folder> (default ./web) · BROWSER=<chrome/msedge path>
// Uses Playwright when installed; otherwise drives an installed Edge/Chrome over the DevTools protocol (no npm needed, Node 22+).
import http from 'http'; import fs from 'fs'; import path from 'path'; import os from 'os'; import { spawn, spawnSync } from 'child_process';

const [,, outdir, spec, step = '1', qual = '0.96'] = process.argv;
if (!outdir || !spec) { console.log('usage: node render.mjs <outdir> <frames "a-b" or "1,2,3"> [step] [quality]'); process.exit(1); }
fs.mkdirSync(outdir, { recursive: true });
const frames = [];
for (const part of spec.split(',')) { if (part.includes('-')) { const [a, b] = part.split('-').map(Number); for (let f = a; f <= b; f += +step) frames.push(f); } else frames.push(+part); }

const root = process.env.WEB || path.resolve('web');
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, s) => {
  const p = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(s);
}).listen(0, '127.0.0.1');
await new Promise((r) => srv.on('listening', r));
const url = `http://127.0.0.1:${srv.address().port}/index.html${process.env.HASH || ''}`;
const GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']; // CPU WebGL for the card engine

let page;
try {
  const { chromium } = await import('playwright');
  const b = await chromium.launch({ args: GL_ARGS });
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  pg.on('console', (m) => console.log('PAGE', m.text())); pg.on('pageerror', (e) => console.log('ERR', e.message));
  await pg.goto(url);
  page = { eval: (expr) => pg.evaluate(expr), close: () => b.close(), via: 'playwright' };
} catch (e) {
  if (e.code !== 'ERR_MODULE_NOT_FOUND' && !/Cannot find (package|module)/.test(String(e.message))) throw e;
  page = await cdpPage(url);
}
console.log(`renderer: ${page.via}`);

const t_ready = Date.now();
while (!(await page.eval('!!(window.ready || window.err)').catch(() => false))) { // navigation may still be swapping contexts
  if (Date.now() - t_ready > 180000) { console.log('page never became ready'); await page.close(); process.exit(1); }
  await new Promise((r) => setTimeout(r, 150));
}
const err = await page.eval('window.err || ""');
if (err) { console.log('page error:', err); await page.close(); srv.close(); process.exit(1); }

const t0 = Date.now(); let done = 0;
for (const f of frames) {
  const file = path.join(outdir, `f${String(f).padStart(4, '0')}.jpg`);
  if (process.env.RESUME && fs.existsSync(file)) continue;
  const d = await page.eval(`(() => { if (location.hash === "#nd") window.DEBUG_ND = 1; if (location.hash === "#e") window.DEBUG_E = 1; window.renderFrame(${f}); return document.getElementById('c').toDataURL('image/jpeg', ${+qual}); })()`);
  fs.writeFileSync(file, Buffer.from(d.split(',')[1], 'base64'));
  done++;
  if (done % 30 === 0) console.log(`frame ${f}  (${done}/${frames.length}, ${((Date.now() - t0) / done / 1000).toFixed(2)} s/frame)`);
}
console.log(`done ${done} frames, ${done ? ((Date.now() - t0) / done / 1000).toFixed(2) : 0} s/frame`);
await page.close(); srv.close();

// ---------- DevTools-protocol fallback ----------
function findBrowser() {
  if (process.env.BROWSER && fs.existsSync(process.env.BROWSER)) return process.env.BROWSER;
  const e = process.env, list = process.platform === 'win32'
    ? [`${e['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`, `${e.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${e.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`, `${e['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`, `${e.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`]
    : process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Chromium.app/Contents/MacOS/Chromium']
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'];
  return list.find((p) => p && !p.startsWith('undefined') && fs.existsSync(p));
}
async function cdpPage(url) {
  const exe = findBrowser();
  if (!exe) { console.log('No Playwright and no Edge/Chrome found. Install one, set BROWSER=<path>, or: npm i playwright && npx playwright install chromium'); process.exit(1); }
  if (typeof WebSocket === 'undefined') { console.log('Node 22+ is needed for the built-in WebSocket (or install Playwright).'); process.exit(1); }
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'short-cdp-'));
  const proc = spawn(exe, ['--headless=new', ...GL_ARGS, '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--mute-audio',
    `--user-data-dir=${prof}`, '--remote-debugging-port=0', '--window-size=1080,1920', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((res, rej) => {
    let buf = ''; const to = setTimeout(() => rej(new Error('browser did not start in 60 s')), 60000);
    proc.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(to); res(m[1]); } });
    proc.on('exit', (c) => rej(new Error('browser exited with code ' + c)));
  });
  const port = new URL(wsUrl).port;
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new`, { method: 'PUT' })).json(); // about:blank; navigate below (keeps #hash)
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('DevTools websocket failed')); });
  let id = 0; const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else if (m.method === 'Runtime.consoleAPICalled') console.log('PAGE', m.params.args.map((a) => a.value ?? a.description).join(' '));
    else if (m.method === 'Runtime.exceptionThrown') console.log('ERR', m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable');
  await send('Page.navigate', { url });
  let killed = false;
  const kill = () => {
    if (killed) return; killed = true;
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' }); else proc.kill('SIGKILL');
    for (let i = 0; i < 5; i++) { try { fs.rmSync(prof, { recursive: true, force: true }); break; } catch { spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},300)']); } }
  };
  process.on('exit', () => { try { kill(); } catch {} });
  return {
    via: `devtools (${path.basename(exe)})`,
    eval: async (expr) => {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.error) throw new Error(r.error.message);
      if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
      return r.result.result.value;
    },
    close: async () => { try { ws.close(); } catch {} kill(); },
  };
}
