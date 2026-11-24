// World kit for the blok style: sky & sea that follow the camera, islands, and village props (original designs).
// Everything is a pure function of (renderer, time in s, options) so frames stay deterministic.
import { P, box, cone, prismX, extrudeY, line, circ, INK, rng } from './blok.js';

const dirAz = (az, el = 0) => [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)]; // az 0 = looking toward -z
function blobsAt(g, list, fill, lw) {
  g.lineWidth = lw; g.strokeStyle = INK;
  for (const [x, y, rx, ry] of list) { g.beginPath(); g.ellipse(x, y, rx, ry || rx, 0, 0, 7); g.stroke(); }
  g.fillStyle = fill;
  for (const [x, y, rx, ry] of list) { g.beginPath(); g.ellipse(x, y, rx, ry || rx, 0, 0, 7); g.fill(); }
}
export function horizon(R) {
  const fw = R.cam.fw, az0 = Math.atan2(fw[0], -fw[2]);
  const a = R.projDir(dirAz(az0 - 0.4)), b = R.projDir(dirAz(az0 + 0.4));
  return a && b ? [a, b] : null;
}

// ---------- sky ----------
const CLOUDS = [{ az: -0.03, el: 0.068, s: 1 }, { az: 0.075, el: 0.04, s: 0.7 }, { az: -0.34, el: 0.1, s: 1.2 }, { az: 0.32, el: 0.13, s: 1.1 }, { az: 0.05, el: 0.2, s: 1.4 }, { az: -0.6, el: 0.06, s: 1 }, { az: 0.62, el: 0.08, s: 0.9 }];
const BIRDS = [{ az: -0.07, el: 0.03, s: 1, v: 1 }, { az: -0.056, el: 0.022, s: 0.8, v: 1 }, { az: 0.035, el: 0.077, s: 0.9, v: -1 }];
const FAR_ISLANDS = [{ az: 0.115, w: 0.058, h: 0.0145 }, { az: 0.195, w: 0.034, h: 0.0088 }];
/** o: { top, horizon (colours), sunAz, sunEl, clouds, birds, volcano:false|{az}, islands } . Returns the horizon line. */
export function sky(R, t, o = {}) {
  const g = R.ctx, hl = horizon(R), sc = R.cam.FP / 2059;
  const hy = hl ? Math.min(hl[0][1], hl[1][1]) : -1;
  const gr = g.createLinearGradient(0, Math.min(0, hy - 1400 * sc), 0, Math.max(1, hy));
  gr.addColorStop(0, o.top || '#6fb6e6'); gr.addColorStop(1, o.horizon || '#e6f4f1');
  g.fillStyle = gr; g.fillRect(0, 0, R.W, R.H);
  if (!hl) return null;
  const sun = R.projDir(dirAz(o.sunAz ?? 0.17, o.sunEl ?? 0.052));
  if (sun) {
    g.beginPath(); g.arc(sun[0], sun[1], 62 * sc, 0, 7); g.fillStyle = 'rgba(255,246,200,0.45)'; g.fill();
    g.beginPath(); g.arc(sun[0], sun[1], 42 * sc, 0, 7); g.fillStyle = o.sunCol || '#fff3b8'; g.fill(); g.lineWidth = 3 * Math.max(0.6, sc); g.strokeStyle = INK; g.stroke();
  }
  if (o.volcano !== false) volcano(R, g, (o.volcano && o.volcano.az) ?? -0.17, t, sc);
  for (const isl of o.islands || FAR_ISLANDS) {
    const c = R.projDir(dirAz(isl.az, 0)); if (!c) continue;
    g.beginPath(); g.ellipse(c[0], c[1] + 1, isl.w * R.cam.FP, isl.h * R.cam.FP, 0, Math.PI, 2 * Math.PI); g.closePath();
    g.fillStyle = '#86ad93'; g.fill(); g.lineWidth = 2.4 * Math.max(0.6, sc); g.strokeStyle = INK; g.stroke();
  }
  for (const cl of o.clouds || CLOUDS) {
    const p = R.projDir(dirAz(cl.az + t * 0.003, cl.el)); if (!p) continue;
    const s = cl.s * sc;
    blobsAt(g, [[p[0] - 55 * s, p[1] + 6 * s, 40 * s], [p[0], p[1] - 12 * s, 50 * s], [p[0] + 53 * s, p[1] + 8 * s, 36 * s], [p[0], p[1] + 20 * s, 48 * s, 24 * s]], '#ffffff', 4.5 * Math.max(0.6, sc));
  }
  for (const b of o.birds || BIRDS) {
    const p = R.projDir(dirAz(b.az + t * 0.008 * b.v, b.el)); if (!p) continue;
    const s = 14 * sc * b.s, fl = 0.3 + 0.35 * Math.sin(t * 9 + b.az * 50);
    g.beginPath(); g.moveTo(p[0] - s, p[1] - s * fl); g.quadraticCurveTo(p[0] - s * 0.5, p[1] - s * (fl + 0.4), p[0], p[1]);
    g.quadraticCurveTo(p[0] + s * 0.5, p[1] - s * (fl + 0.4), p[0] + s, p[1] - s * fl);
    g.lineWidth = 3 * Math.max(0.6, sc); g.lineCap = 'round'; g.strokeStyle = INK; g.stroke();
  }
  return hl;
}
function volcano(R, g, az, t, sc) {
  const Q = (a, e) => R.projDir(dirAz(az + a, e));
  const body = [Q(-0.083, -0.001), Q(-0.01, 0.046), Q(0.01, 0.047), Q(0.083, -0.001)];
  if (body.some((p) => !p)) return;
  R.poly(g, body); g.fillStyle = '#93abc0'; g.fill(); g.lineWidth = 2.6 * Math.max(0.6, sc); g.strokeStyle = INK; g.stroke();
  const cap = [Q(-0.01, 0.046), Q(-0.017, 0.035), Q(-0.006, 0.038), Q(0.0005, 0.032), Q(0.007, 0.039), Q(0.016, 0.036), Q(0.01, 0.047)];
  R.poly(g, cap); g.fillStyle = '#eef3f6'; g.fill(); g.stroke();
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.22 + k / 3) % 1, p = Q(0.004 + ph * 0.02, 0.052 + ph * 0.04); if (!p) continue;
    g.save(); g.globalAlpha = 1 - ph * 0.75; blobsAt(g, [[p[0], p[1], (10 + ph * 14) * sc]], '#f4f6f8', 2.4 * Math.max(0.6, sc)); g.restore();
  }
}

// ---------- sea ----------
export function sea(R, t, hl, o = {}) {
  const g = R.ctx, W = R.W, H = R.H;
  let hy = 0;
  if (hl) {
    const [a, b] = hl, dx = b[0] - a[0] || 1e-6, dy = b[1] - a[1];
    const L = [-W, a[1] + (dy * (-W - a[0])) / dx], Rr = [2 * W, a[1] + (dy * (2 * W - a[0])) / dx];
    hy = (a[1] + b[1]) / 2;
    R.poly(g, [L, Rr, [2 * W, H * 4], [-W, H * 4]]);
  } else { g.beginPath(); g.rect(0, 0, W, H); }
  const gr = g.createLinearGradient(0, hy, 0, Math.max(hy + 10, H));
  gr.addColorStop(0, o.far || '#c4e7ea'); gr.addColorStop(0.18, o.mid || '#74c3d6'); gr.addColorStop(1, o.near || '#1f7ea6');
  g.fillStyle = gr; g.fill();
  if (hl) { const [a, b] = hl, dx = b[0] - a[0] || 1e-6, dy = b[1] - a[1]; R.seg(g, [-W, a[1] + (dy * (-W - a[0])) / dx], [2 * W, a[1] + (dy * (2 * W - a[0])) / dx], 2.4, INK); }
  const r = rng(o.seed || 77);
  for (let i = 0; i < (o.waves ?? 900); i++) {
    const x = -140 + r() * 280, z = -340 + r() * 420, ph = r() * 6.28;
    const p = R.proj([x + 0.3 * Math.sin(t * 0.7 + ph), 0, z]);
    if (!p || p[1] < hy + 5 || p[0] < -40 || p[0] > W + 40 || p[1] > H + 40) continue;
    const s = 0.5 * R.ppu(p[2]); if (s < 2.2) continue;
    g.beginPath(); g.moveTo(p[0] - s, p[1]); g.quadraticCurveTo(p[0] - s / 2, p[1] - s * 0.35, p[0], p[1]); g.quadraticCurveTo(p[0] + s / 2, p[1] - s * 0.35, p[0] + s, p[1]);
    g.lineWidth = Math.max(1, s * 0.12); g.lineCap = 'round'; g.strokeStyle = `rgba(255,255,255,${0.32 + 0.22 * Math.sin(t * 1.3 + ph)})`; g.stroke();
  }
}

// ---------- islands ----------
export function blob(cx, cz, R, ph, n = 56, sq = 0.9, amp = 1) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2 * Math.PI;
    const r = R * (1 + amp * (0.08 * Math.sin(3 * t + ph) + 0.05 * Math.sin(5 * t + ph * 2.3) + 0.025 * Math.sin(9 * t + ph * 1.7)));
    pts.push([cx + r * Math.cos(t), cz + r * Math.sin(t) * sq]);
  }
  return pts;
}
const blobOf = (s, k = 1) => blob(s.cx, s.cz, s.R * k, s.seed, s.n || 56, s.sq ?? 0.9, s.amp ?? 1);
/**
 * I: { sand: {cx, cz, R, seed, sq?, amp?, n?}, grass?: {...same}, path?: [[x,z],...], sandTop = 0.5, grassTop = 1.3, shallow = true }
 * Keep the grass blob inside the sand blob. Objects are drawn after the terrain, so never hide an object behind a higher tier.
 */
export function island(R, I, t = 0) {
  const s = I.sand, sandTop = I.sandTop ?? 0.5, grassTop = I.grassTop ?? 1.3, sand = blobOf(s);
  if (I.shallow !== false) { R.fillPoly(blobOf(s, 1.2), 0, '#5cc5c3', 'rgba(255,255,255,0.45)'); R.fillPoly(blobOf(s, 1.1), 0, '#7dd3cf'); }
  R.foam(blobOf(s, 1.026), 0.24 + 0.06 * Math.sin(t * 2.1));
  R.slab(sand, 0, sandTop, '#f0d8a0', '#d4ae6a', {
    cx: s.cx, cz: s.cz, strata: 'rgba(150,110,60,0.45)',
    texture: (xz, y) => R.scatter(xz, Math.round(1100 * (s.R / 13.5) ** 2), s.seed * 7 + 1, (x, z, i) => {
      const p = R.proj([x, y, z]); if (!p) return;
      const rr = Math.max(0.8, 0.045 * R.ppu(p[2]));
      R.ctx.fillStyle = i % 11 === 0 ? '#fff7e6' : '#d7b878'; R.ctx.beginPath(); R.ctx.ellipse(p[0], p[1], rr * 1.4, rr * 0.6, 0, 0, 7); R.ctx.fill();
    }),
  });
  if (!I.grass) return;
  const gs = I.grass, grass = blob(gs.cx, gs.cz, gs.R, gs.seed, gs.n || 52, gs.sq ?? 0.85, gs.amp ?? 0.6);
  R.slab(grass, sandTop, grassTop, '#7cb84f', '#8a5a3a', {
    cx: gs.cx, cz: gs.cz, lip: '#6aa845', strata: 'rgba(60,35,20,0.4)',
    texture: (xz, y) => {
      const g = R.ctx;
      R.scatter(xz, 40, gs.seed * 3 + 2, (x, z) => { const p = R.proj([x, y, z]); if (!p) return; const rx = 1.3 * R.ppu(p[2]); g.beginPath(); g.ellipse(p[0], p[1], rx, rx * 0.36, 0, 0, 7); g.fillStyle = 'rgba(96,160,62,0.55)'; g.fill(); });
      if (I.path) pathOn(R, I.path, y + 0.01, 0.62);
      R.scatter(xz, 900, gs.seed * 5 + 3, (x, z, i) => {
        const p = R.proj([x, y, z]); if (!p) return;
        const sz = 0.16 * R.ppu(p[2]);
        if (i % 15 === 0) { g.fillStyle = ['#f6d23c', '#ffffff', '#e86b9a'][i % 3]; g.beginPath(); g.arc(p[0], p[1], Math.max(1.2, sz * 0.35), 0, 7); g.fill(); return; }
        g.beginPath(); g.moveTo(p[0] - sz * 0.5, p[1] - sz * 0.6); g.lineTo(p[0], p[1]); g.lineTo(p[0] + sz * 0.5, p[1] - sz * 0.6);
        g.lineWidth = Math.max(1, sz * 0.16); g.strokeStyle = '#4f8f3a'; g.stroke();
      });
    },
  });
}
function pathOn(R, path, y, w) {
  const L = [], Rr = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, dx = (b[0] - a[0]) / l, dz = (b[1] - a[1]) / l;
    L.push([path[i][0] - dz * w, y, path[i][1] + dx * w]); Rr.push([path[i][0] + dz * w, y, path[i][1] - dx * w]);
  }
  const cp = R.clipProject(L.concat(Rr.reverse())); if (!cp) return;
  R.poly(R.ctx, cp.sp); R.ctx.fillStyle = '#e6cf96'; R.ctx.fill(); R.ctx.lineWidth = 1.6; R.ctx.strokeStyle = '#c9a865'; R.ctx.stroke();
}

// ---------- prop decals ----------
const boards = (c) => { for (let x = 9; x < 100; x += 9) line(c, [[x, 0], [x, 100]], 1.3, 'rgba(40,25,30,0.22)'); };
const win = (c, x, y, w, h, sh) => {
  c.fillStyle = '#3b2a2a'; c.fillRect(x, y, w, h); c.lineWidth = 2.2; c.strokeStyle = INK; c.strokeRect(x, y, w, h);
  line(c, [[x + w / 2, y], [x + w / 2, y + h]], 1.6, '#8a6a4a');
  c.fillStyle = sh;
  for (const sx of [x - w * 0.45, x + w * 1.03]) { c.fillRect(sx, y, w * 0.42, h); c.strokeRect(sx, y, w * 0.42, h); }
};
const wallFront = (sh, door) => (c) => {
  boards(c); win(c, 13, 24, 13, 30, sh); win(c, 74, 24, 13, 30, sh);
  if (door > 0) { c.fillStyle = '#1e1412'; c.fillRect(38, 16, 24, 86); }
  c.fillStyle = '#6e4a2a'; c.fillRect(38, 16, 24 * (1 - (door || 0) * 0.85), 86); c.lineWidth = 2.4; c.strokeStyle = INK; c.strokeRect(38, 16, 24, 86);
  if (!door) { line(c, [[50, 16], [50, 100]], 1.4, 'rgba(30,15,10,0.5)'); circ(c, 57, 62, 1.8, '#e8b93c'); }
};
const wallSide = (sh) => (c) => { boards(c); win(c, 42, 24, 16, 32, sh); };
export const PROP_DECALS = {
  planks: (c) => { for (let v = 9; v < 100; v += 9) line(c, [[0, v], [100, v]], 1.5, 'rgba(70,40,20,0.5)'); },
  tiles: (c) => { for (let v = 12, r = 0; v < 100; v += 12, r++) { line(c, [[0, v], [100, v]], 1.8, 'rgba(90,30,15,0.5)'); for (let u = (r % 2) * 5; u < 100; u += 10) line(c, [[u, v - 12], [u, v]], 1.2, 'rgba(90,30,15,0.35)'); } },
  trunk: (c) => { for (let v = 18; v < 100; v += 28) line(c, [[0, v], [100, v - 6]], 2, 'rgba(70,45,25,0.6)'); },
  frond: (c) => { for (let v = 6; v < 100; v += 9) { line(c, [[50, v], [2, v + 12]], 2.2, '#3a7d30'); line(c, [[50, v], [98, v + 12]], 2.2, '#3a7d30'); } line(c, [[50, 0], [50, 100]], 3, '#2f5f26'); },
  flowers: (c) => { const cols = ['#f6d23c', '#f4f2ee', '#e86b9a']; for (let i = 0; i < 7; i++) circ(c, 12 + ((i * 37) % 78), 14 + ((i * 53) % 72), 4.5, cols[i % 3], 1.2); },
  bamboo: (c) => { for (let u = 8; u < 100; u += 8) line(c, [[u, 0], [u, 100]], 1.4, 'rgba(90,60,25,0.5)'); },
  hull: (c) => { c.fillStyle = '#c8312f'; c.fillRect(-2, 16, 104, 18); c.fillStyle = '#2f6fa8'; c.fillRect(-2, 60, 104, 42); for (const v of [16, 34, 60]) line(c, [[-2, v], [102, v]], 1.6); },
};

// ---------- props (local origin on the ground; place with R.add(parts, pos, yaw, k)) ----------
const WOOD = '#7a4a2a', DARK = '#5a3420';
/** Stilt house ~7.6 tall. o: { wall, roof, shutter, door (0 shut .. 1 open) }. Door faces +z, stairs at z ≈ 3-4. */
export function stiltHouse(o = {}) {
  const wall = o.wall || '#5fa3a0', roof = o.roof || '#d46a3a', sh = o.shutter || '#f2b33d', p = [];
  for (const x of [-2.6, 0, 2.6]) for (const z of [-1.9, 1.9]) p.push(P(box(0.32, 1.3, 0.32), [x, 0.65, z], DARK));
  p.push(P(box(6.0, 0.3, 5.0), [0, 1.45, 0.3], WOOD, { decal: { top: PROP_DECALS.planks } }));
  p.push(P(box(5.4, 3.6, 3.8), [0, 3.4, -0.3], wall, { decal: { front: wallFront(sh, o.door || 0), right: wallSide(sh), left: wallSide(sh), back: wallSide(sh) } }));
  for (const x of [-1.85, 1.85]) p.push(P(box(2.3, 0.12, 0.12), [x, 2.4, 2.72], WOOD));
  for (const x of [-2.94, -0.7, 0.7, 2.94]) p.push(P(box(0.14, 0.82, 0.14), [x, 2.0, 2.72], WOOD));
  for (let i = 0; i < 3; i++) p.push(P(box(1.2, 0.2, 0.52), [0, 1.12 - i * 0.42, 3.08 + i * 0.5], WOOD));
  p.push(P(prismX([[-2.9, 0], [2.9, 0], [0, 2.4]], -3.4, 3.4), [0, 5.2, -0.3], roof, { decal: { side1: PROP_DECALS.tiles, side2: PROP_DECALS.tiles }, faceCol: { endL: '#e9dfcf', endR: '#e9dfcf' } }));
  return p;
}
/** Open hut with a raised bamboo bench and a thatched pyramid roof (~4.8 tall). */
export function saung() {
  const p = [];
  for (const x of [-1.4, 1.4]) for (const z of [-1.4, 1.4]) p.push(P(box(0.24, 2.9, 0.24), [x, 1.45, z], '#8a5d3b'));
  p.push(P(box(3.2, 0.25, 3.2), [0, 0.75, 0], '#c09a5e', { decal: { top: PROP_DECALS.bamboo } }));
  p.push(P(cone(2.75, 1.7, 4), [0, 2.9, 0], '#b08f50', { pivot: [0, 2.9, 0], ry: Math.PI / 4 }));
  p.push(P(box(0.32, 0.32, 0.32), [0, 4.62, 0], '#7a5a2a'));
  return p;
}
/** Coconut palm. o: { h height, lean (+x), ph phase }. Fronds sway with t (s). */
export function palm(o = {}, t = 0) {
  const h = o.h || 6.5, lean = o.lean || 0, ph = o.ph || 0, p = [], n = 8, sg = h / n;
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, w = 0.52 - 0.14 * u; p.push(P(box(w, sg + 0.05, w), [lean * u * u, sg * (i + 0.5), 0], '#9c7448', { decal: { front: PROP_DECALS.trunk, right: PROP_DECALS.trunk, left: PROP_DECALS.trunk } })); }
  for (let i = 0; i < 7; i++) {
    const rx = 0.45 + 0.2 * Math.sin(i * 1.9 + ph) + 0.05 * Math.sin(t * 1.8 + i + ph), spin = (i / 7) * 2 * Math.PI + ph + 0.03 * Math.sin(t * 0.9 + ph);
    p.push(P(box(0.6, 0.08, 2.9), [lean, h, 1.45], i % 2 ? '#4f9a3c' : '#5aa845', { pivot: [lean, h, 0], rx, spin, decal: { top: PROP_DECALS.frond } }));
  }
  for (const [dx, dz] of [[0.26, 0.22], [-0.24, 0.2], [0.02, -0.28]]) p.push(P(box(0.34, 0.34, 0.34), [lean + dx, h - 0.28, dz], '#6b4a2a'));
  p.push(P(box(0.55, 0.4, 0.55), [lean, h + 0.05, 0], '#4f9a3c'));
  return p;
}
export const bush = (s = 1) => [
  P(box(1.4 * s, 0.95 * s, 1.15 * s), [0, 0.47 * s, 0], '#4f8f3a', { decal: { top: PROP_DECALS.flowers, front: PROP_DECALS.flowers } }),
  P(box(0.95 * s, 0.7 * s, 0.9 * s), [0.75 * s, 0.35 * s, 0.35 * s], '#5ea445', { decal: { top: PROP_DECALS.flowers } }),
];
export const rock = (w = 1.4, h = 0.8, d = 1.1) => [P(box(w, h, d), [0, h / 2 - 0.1, 0], '#9a9a92'), P(box(w * 0.55, h * 0.6, d * 0.6), [w * 0.5, h * 0.3 - 0.1, d * 0.2], '#8a8a84')];
/** Wooden pier running along +z from the origin; deck top at y ≈ 1.06. */
export function pier(len = 9, segs = 3) {
  const p = [], L = len / segs;
  for (let i = 0; i < segs; i++) p.push(P(box(2.4, 0.22, L - 0.06), [0, 0.95, L * (i + 0.5)], '#a8743f', { decal: { top: PROP_DECALS.planks } }));
  for (let i = 0; i <= segs; i++) for (const x of [-1.05, 1.05]) p.push(P(box(0.26, 1.1, 0.26), [x, 0.55, Math.min(len - 0.2, L * i + 0.15)], '#6e4a2a'));
  return p;
}
export const HULL = [[0, -3.0], [0.85, -1.8], [0.85, 1.8], [0, 3.0], [-0.85, 1.8], [-0.85, -1.8]];
/** Outrigger boat (jukung style) ~6 long along z with a sail. Rock it with R.add(..., tilt). */
export function boat(o = {}) {
  const p = [P(extrudeY(HULL, 0, 0.7), [0, 0, 0], o.hull || '#f4f2ee', { decal: { side: PROP_DECALS.hull }, faceCol: { top: '#8a5d3b' } })];
  for (const z of [-1.2, 1.2]) p.push(P(box(4.4, 0.1, 0.1), [0, 0.78, z], '#6e4a2a'));
  for (const x of [-2.1, 2.1]) p.push(P(box(0.22, 0.18, 4.2), [x, 0.12, 0], '#6e4a2a'));
  for (const x of [-2.1, 2.1]) for (const z of [-1.2, 1.2]) p.push(P(box(0.1, 0.62, 0.1), [x, 0.48, z], '#6e4a2a'));
  if (o.sail !== false) { p.push(P(box(0.12, 3.4, 0.12), [0, 2.3, -0.5], '#6e4a2a')); p.push(P(prismX([[-0.45, 1.0], [1.9, 1.1], [-0.45, 3.9]], -0.04, 0.04), [0, 0, 0], o.sail || '#e8873a')); }
  return p;
}
/** Foam outlines for a boat placed at pos with yaw (hull + both floats). */
export function boatFoam(R, pos, yaw) {
  const tr = (x, z) => { const c = Math.cos(yaw), s = Math.sin(yaw); return [pos[0] + x * c + z * s, pos[2] - x * s + z * c]; };
  R.foam(HULL.map(([x, z]) => tr(x * 1.18, z * 1.12)), 0.2);
  for (const fx of [-2.1, 2.1]) R.foam([[fx - 0.2, -2.2], [fx + 0.2, -2.2], [fx + 0.2, 2.2], [fx - 0.2, 2.2]].map(([x, z]) => tr(x, z)), 0.12);
}
