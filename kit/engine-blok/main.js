// Frame driver for the blok style. Generic: everything story-specific lives in story.js.
// window.renderFrame(f) draws frame f onto #c (1080x1920). render.mjs calls it once per frame.
// index.html#sheet  -> character test sheet of every CAST preset (render with HASH=#sheet).
// index.html#f=120  -> draws frame 120 on load (quick still in any browser, no Playwright needed).
import { createRenderer } from './render.js';
import * as WORLD from './world.js';
import { CAST, human, EXPRESSIONS } from './blok.js';
import { TOTAL, camAt, dofAt, sceneAt, fxAt } from './story.js';

const cv = document.getElementById('c');
const R = createRenderer(cv);

/** layer: { islands: [I...], shadows: [[x,y,z,r,a?]...], foam: [{xz, w}...], boats: [{pos, yaw}...] (foam only), items: [{parts, pos, yaw, k, tilt}] } */
function drawLayer(L, t, final) {
  for (const I of L.islands || []) WORLD.island(R, I, t);
  for (const b of L.boats || []) WORLD.boatFoam(R, b.pos, b.yaw || 0);
  for (const fm of L.foam || []) R.foam(fm.xz, fm.w ?? 0.15, fm.y ?? 0);
  for (const s of L.shadows || []) R.shadow(s[0], s[1], s[2], s[3], s[4]);
  for (const o of L.items || []) R.add(o.parts, o.pos, o.yaw || 0, o.k || 1, o.tilt || null);
  R.flush(final);
}

function renderFrame(f) {
  const t = f / 30, cam = camAt(f), sc = sceneAt(f), fx = fxAt ? fxAt(f) : {};
  R.begin(cam, dofAt ? dofAt(f) : {});
  const hl = WORLD.sky(R, t, sc.sky || {});
  WORLD.sea(R, t, hl, sc.sea || {});
  const layers = sc.layers || [];
  layers.forEach((L, i) => drawLayer(L, t, i === layers.length - 1));
  if (!layers.length) R.flush(true);
  for (const z of fx.zzz || []) R.zzz(z.p, f, z.a ?? 1);
  if (fx.draw) fx.draw(R, f); // optional custom 2D overlay (diegetic signs, sparkles)
  R.grade({ flash: fx.flash || 0, vignette: fx.vignette ?? 0.22 });
}

/** Character test sheet: every CAST preset in a few expressions, on a plain backdrop with names. */
function castSheet() {
  const g = cv.getContext('2d'), keys = Object.keys(CAST);
  R.begin({ pos: [0, 8.4, 38], look: [0, 2.8, 0], fov: 30 });
  g.fillStyle = '#f6efe3'; g.fillRect(0, 0, R.W, R.H);
  const cols = 3, gapX = 4.4, rowY = [7.6, 0.2, -6.6], exprs = ['neutral', 'happy', 'surprised'];
  keys.forEach((k, i) => {
    const col = i % cols, row = Math.floor(i / cols) % 2, x = (col - 1) * gapX, y = rowY[row];
    R.add(human(CAST[k], { expr: CAST[k].expr }), [x, y, 0], -0.3, CAST[k].k || 1);
  });
  exprs.forEach((e, i) => R.add(human(CAST.warga, { expr: EXPRESSIONS.includes(e) ? e : 'neutral' }), [(i - 1) * gapX, rowY[2], 0], 0.25, 1));
  R.flush(true);
  g.textAlign = 'center'; g.fillStyle = '#4a2340'; g.font = '700 30px "Segoe UI", Arial, sans-serif';
  keys.forEach((k, i) => { const col = i % cols, row = Math.floor(i / cols) % 2, p = R.proj([(col - 1) * gapX, rowY[row] - 0.25, 0]); if (p) g.fillText(CAST[k].name || k, p[0], p[1] + 44); });
  exprs.forEach((e, i) => { const p = R.proj([(i - 1) * gapX, rowY[2] - 0.25, 0]); if (p) g.fillText(`expr: ${e}`, p[0], p[1] + 44); });
  g.font = '700 44px "Segoe UI", Arial, sans-serif'; g.fillText('Test sheet karakter', R.W / 2, 90);
}

window.renderFrame = (f) => (location.hash.includes('sheet') ? castSheet() : renderFrame(f));
window.TOTAL = TOTAL;
const m = location.hash.match(/f=(\d+)/);
if (location.hash.includes('sheet')) castSheet(); else if (m) renderFrame(+m[1]);
window.ready = true;
