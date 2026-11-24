// Blocky cast + mesh toolkit for the cartoon-audio-short "blok" style. Original designs (not any game's avatars).
// Units: 1 = head width; an adult stands ~2.9 tall. y is up, +z points toward a default camera.
export const INK = '#1f1420';

// ---------- math ----------
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
export const rotX = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };
export const rotY = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; };
export const rotZ = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; };
export const rng = (seed) => { let s = Math.floor(seed * 1000) >>> 0 || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
export const LIGHT = norm([-0.55, 0.75, 0.5]); // sun from upper-left-front; faces with dot < 0.12 get the shadow tone

// ---------- meshes (lists of faces {name, n, pts}) ----------
export function box(w, h, d) {
  const x = w / 2, y = h / 2, z = d / 2;
  return [
    ['front', [0, 0, 1], [[-x, y, z], [x, y, z], [x, -y, z], [-x, -y, z]]],
    ['back', [0, 0, -1], [[x, y, -z], [-x, y, -z], [-x, -y, -z], [x, -y, -z]]],
    ['right', [1, 0, 0], [[x, y, z], [x, y, -z], [x, -y, -z], [x, -y, z]]],
    ['left', [-1, 0, 0], [[-x, y, -z], [-x, y, z], [-x, -y, z], [-x, -y, -z]]],
    ['top', [0, 1, 0], [[-x, y, -z], [x, y, -z], [x, y, z], [-x, y, z]]],
    ['bottom', [0, -1, 0], [[-x, -y, z], [x, -y, z], [x, -y, -z], [-x, -y, -z]]],
  ].map(([name, n, pts]) => ({ name, n, pts }));
}
export function cone(r, h, n = 10) { // n-sided pyramid, base at y=0
  const ring = [], faces = [], apex = [0, h, 0];
  for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI; ring.push([r * Math.cos(a), 0, r * Math.sin(a)]); }
  for (let i = 0; i < n; i++) {
    const p = ring[i], q = ring[(i + 1) % n];
    let nn = norm(cross(sub(q, apex), sub(p, apex)));
    if (dot(nn, [(p[0] + q[0]) / 3, 0, (p[2] + q[2]) / 3]) < 0) nn = nn.map((v) => -v);
    faces.push({ name: 'side', n: nn, pts: [apex, q, p] });
  }
  faces.push({ name: 'bottom', n: [0, -1, 0], pts: ring.slice() });
  return faces;
}
export function prismX(yz, x0, x1) { // cross-section [[z,y],...] extruded along x (gable roofs, sails)
  const n = yz.length, cz = yz.reduce((s, p) => s + p[0], 0) / n, cy = yz.reduce((s, p) => s + p[1], 0) / n, faces = [];
  for (let i = 0; i < n; i++) {
    const a = yz[i], b = yz[(i + 1) % n];
    let pts = [[x0, a[1], a[0]], [x1, a[1], a[0]], [x1, b[1], b[0]], [x0, b[1], b[0]]];
    let nn = norm(cross(sub(pts[1], pts[0]), sub(pts[3], pts[0])));
    if (dot(nn, [0, (a[1] + b[1]) / 2 - cy, (a[0] + b[0]) / 2 - cz]) < 0) nn = nn.map((v) => -v);
    if (b[1] > a[1]) pts = [pts[3], pts[2], pts[1], pts[0]]; // TL/TR on the higher edge (decals)
    faces.push({ name: 'side' + i, n: nn, pts });
  }
  faces.push({ name: 'endL', n: [-1, 0, 0], pts: yz.map((p) => [x0, p[1], p[0]]) });
  faces.push({ name: 'endR', n: [1, 0, 0], pts: yz.map((p) => [x1, p[1], p[0]]) });
  return faces;
}
export function extrudeY(xz, y0, y1) { // outline [[x,z],...] extruded up (hulls, slabs)
  const n = xz.length, cx = xz.reduce((s, p) => s + p[0], 0) / n, cz = xz.reduce((s, p) => s + p[1], 0) / n, faces = [];
  for (let i = 0; i < n; i++) {
    const a = xz[i], b = xz[(i + 1) % n];
    let nn = norm([b[1] - a[1], 0, -(b[0] - a[0])]);
    if (nn[0] * ((a[0] + b[0]) / 2 - cx) + nn[2] * ((a[1] + b[1]) / 2 - cz) < 0) nn = nn.map((v) => -v);
    faces.push({ name: 'side', n: nn, pts: [[a[0], y1, a[1]], [b[0], y1, b[1]], [b[0], y0, b[1]], [a[0], y0, a[1]]] });
  }
  faces.push({ name: 'top', n: [0, 1, 0], pts: xz.map((p) => [p[0], y1, p[1]]) });
  faces.push({ name: 'bottom', n: [0, -1, 0], pts: xz.map((p) => [p[0], y0, p[1]]) });
  return faces;
}
/** A part: mesh at centre c. With a pivot, it rotates ry -> rx -> rz around the pivot, then spins (y) around it. */
export const P = (mesh, c, col, o = {}) => ({ mesh, c, col, pivot: o.pivot || null, rx: o.rx || 0, ry: o.ry || 0, rz: o.rz || 0, spin: o.spin || 0, faceCol: o.faceCol || {}, decal: o.decal || {} });

// ---------- decal helpers (unit space 0..100 on a face, v grows downward) ----------
export function line(c, pts, w = 3, col = INK) { c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = col; c.stroke(); }
export function qline(c, a, m, b, w = 3, col = INK) { c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(m[0], m[1], b[0], b[1]); c.lineWidth = w; c.lineCap = 'round'; c.strokeStyle = col; c.stroke(); }
export function circ(c, x, y, r, fill, w = 0) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = fill; c.fill(); if (w) { c.lineWidth = w; c.strokeStyle = INK; c.stroke(); } }
function eye(c, x, y) { c.beginPath(); c.ellipse(x, y, 6.5, 9, 0, 0, 7); c.fillStyle = INK; c.fill(); circ(c, x - 2, y - 3.5, 2.4, '#fff'); }
function mouthOpen(c, x, y, w, h) {
  const path = () => { c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x, y + h * 2, x + w, y); c.closePath(); };
  path(); c.fillStyle = '#5a1e2e'; c.fill();
  c.save(); path(); c.clip(); c.beginPath(); c.ellipse(x, y + h * 1.05, w * 0.55, h * 0.5, 0, 0, 7); c.fillStyle = '#e86b7a'; c.fill(); c.restore();
  path(); c.lineWidth = 2.6; c.lineJoin = 'round'; c.strokeStyle = INK; c.stroke();
}
function brows(c, pts, bushy) { for (const [a, m, b] of pts) { if (bushy) { qline(c, a, m, b, 8.5, INK); qline(c, a, m, b, 5, '#f1eee6'); } else qline(c, a, m, b, 3.6); } }

// ---------- faces: eyes/brows, then beard, then mouth (so a beard never hides the mouth) ----------
const E = [[32, 50], [68, 50]];
const BROW = {
  calm: [[[24, 36], [32, 32], [40, 36]], [[60, 36], [68, 32], [76, 36]]],
  up: [[[24, 35], [32, 29], [40, 34]], [[60, 34], [68, 29], [76, 35]]],
  high: [[[22, 31], [32, 23], [42, 30]], [[58, 30], [68, 23], [78, 31]]],
  sad: [[[24, 38], [32, 34], [40, 30]], [[60, 30], [68, 34], [76, 38]]],
  sleepy: [[[24, 38], [32, 35], [40, 38]], [[60, 38], [68, 35], [76, 38]]],
};
function eyesOpen(c, o, y = 50) {
  if ((o.blink || 0) > 0.5) { E.forEach(([x]) => qline(c, [x - 8, y], [x, y + 5], [x + 8, y], 3.4)); return; }
  E.forEach(([x]) => eye(c, x + (o.look || 0) * 2.5, y));
}
const EYES = {
  neutral: (c, o) => { eyesOpen(c, o); brows(c, BROW.calm, o.beard); },
  happy: (c, o) => { eyesOpen(c, o); brows(c, BROW.up, o.beard); },
  talk: (c, o) => { eyesOpen(c, o); brows(c, BROW.calm, o.beard); },
  laugh: (c, o) => { E.forEach(([x, y]) => line(c, [[x - 8, y + 3], [x, y - 5], [x + 8, y + 3]], 3.6)); brows(c, BROW.up, o.beard); },
  surprised: (c, o) => {
    if ((o.blink || 0) > 0.5) eyesOpen(c, o);
    else E.forEach(([x, y]) => { circ(c, x, y, 10.5, '#fff', 2.6); circ(c, x + (o.look || 0) * 3, y + 1, 4.2, INK); });
    brows(c, BROW.high, o.beard);
  },
  stubborn: (c, o, skin) => {
    if ((o.blink || 0) > 0.5) eyesOpen(c, o, 51);
    else { E.forEach(([x, y]) => eye(c, x, y + 1)); c.fillStyle = skin; E.forEach(([x, y]) => c.fillRect(x - 9, y - 12, 18, 12)); E.forEach(([x, y]) => line(c, [[x - 8, y], [x + 8, y]], 3.2)); }
    line(c, [[22, 36], [42, 43]], 4.6); line(c, [[78, 36], [58, 43]], 4.6);
  },
  angry: (c, o) => { eyesOpen(c, o, 52); line(c, [[21, 34], [43, 44]], 5.2); line(c, [[79, 34], [57, 44]], 5.2); },
  sad: (c, o) => {
    eyesOpen(c, o, 52); brows(c, BROW.sad, o.beard);
    if (o.tear) { c.beginPath(); c.ellipse(26, 66, 3, 4.5, 0, 0, 7); c.fillStyle = '#8fd0f0'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke(); }
  },
  sleep: (c, o) => { E.forEach(([x, y]) => qline(c, [x - 8, y], [x, y + 6], [x + 8, y], 3.4)); brows(c, BROW.sleepy, o.beard); },
};
const MOUTH = {
  neutral: (c) => qline(c, [42, 73], [50, 77], [58, 73], 3.2),
  happy: (c) => mouthOpen(c, 50, 64, 14, 12),
  talk: (c, o) => mouthOpen(c, 50, 67, 9, 3 + 6 * (o.open ?? 1)),
  laugh: (c) => mouthOpen(c, 50, 62, 17, 16),
  surprised: (c) => { c.beginPath(); c.ellipse(50, 77, 6.5, 8.5, 0, 0, 7); c.fillStyle = '#5a1e2e'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke(); },
  stubborn: (c) => qline(c, [40, 77], [50, 69], [60, 77], 3.4),
  angry: (c) => {
    c.beginPath(); c.moveTo(38, 81); c.quadraticCurveTo(50, 67, 62, 81); c.closePath(); c.fillStyle = '#5a1e2e'; c.fill();
    c.lineWidth = 2.6; c.lineJoin = 'round'; c.strokeStyle = INK; c.stroke(); line(c, [[43, 78], [57, 78]], 2, '#ffffff');
  },
  sad: (c) => qline(c, [40, 79], [50, 71], [60, 79], 3.4),
  sleep: (c) => { c.beginPath(); c.ellipse(50, 74, 3.6, 4.4, 0, 0, 7); c.fillStyle = '#5a1e2e'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke(); },
};
export const EXPRESSIONS = Object.keys(MOUTH);
function beard(c) {
  c.beginPath(); c.moveTo(12, 60); c.quadraticCurveTo(16, 106, 50, 108); c.quadraticCurveTo(84, 106, 88, 60);
  c.quadraticCurveTo(68, 71, 50, 66); c.quadraticCurveTo(32, 71, 12, 60); c.closePath();
  c.fillStyle = '#f4f1ea'; c.fill(); c.lineWidth = 2.6; c.strokeStyle = INK; c.stroke();
  line(c, [[50, 86], [50, 100]], 1.6, '#cfc8ba'); line(c, [[38, 84], [36, 98]], 1.6, '#cfc8ba'); line(c, [[62, 84], [64, 98]], 1.6, '#cfc8ba');
}
/** Face decal. expr: one of EXPRESSIONS. o: { blink 0..1, look -1..1, open 0..1 (talk), blush, beard, tear } */
export function faceDecal(expr, skin, o = {}) {
  const ex = MOUTH[expr] ? expr : 'neutral';
  return (c) => {
    if (o.blush) { c.fillStyle = 'rgba(235,110,120,0.35)'; for (const x of [19, 81]) { c.beginPath(); c.ellipse(x, 66, 7, 4.5, 0, 0, 7); c.fill(); } }
    EYES[ex](c, o, skin);
    if (o.beard) beard(c);
    MOUTH[ex](c, o);
  };
}

// ---------- clothing decals (reusable; write new ones in the same flat style) ----------
export const DECALS = {
  armor: (c) => {
    for (let i = 0; i < 4; i++) { const y = 6 + i * 16; c.fillStyle = '#aeb6bf'; c.fillRect(-2, y, 104, 13); c.lineWidth = 2; c.strokeStyle = INK; c.strokeRect(-2, y, 104, 13); line(c, [[0, y + 3], [100, y + 3]], 1.4, '#e6ebef'); }
    c.fillStyle = '#7a4a2a'; c.fillRect(-2, 72, 104, 12); c.strokeRect(-2, 72, 104, 12);
    for (let x = 12; x < 100; x += 17) circ(c, x, 78, 2.6, '#d9a845');
  },
  helmBand: (c) => { c.fillStyle = '#d9a845'; c.fillRect(-2, 72, 104, 30); line(c, [[-2, 72], [102, 72]], 2); circ(c, 50, 86, 4, '#fff3c4'); },
  crestLines: (c) => { for (let x = 6; x < 100; x += 11) line(c, [[x, 100], [x + 2, 6]], 2.4, 'rgba(110,20,25,0.55)'); },
  shield: (c) => {
    const Y = '#e8b93c'; c.lineWidth = 5; c.strokeStyle = Y; c.strokeRect(10, 8, 80, 84);
    line(c, [[50, 8], [50, 92]], 5, Y); line(c, [[10, 50], [90, 50]], 5, Y);
    line(c, [[22, 20], [30, 32], [24, 34], [34, 44]], 3, Y); line(c, [[78, 56], [70, 68], [76, 70], [66, 80]], 3, Y);
    c.beginPath(); c.ellipse(50, 50, 13, 10, 0, 0, 7); c.fillStyle = Y; c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
  },
  shirt: (c) => { line(c, [[36, 0], [50, 22], [64, 0]], 2.6); for (const y of [34, 52, 70]) circ(c, 50, y, 2.8, '#f1ead8', 1.4); c.lineWidth = 2; c.strokeStyle = INK; c.strokeRect(64, 30, 17, 16); line(c, [[64, 35], [81, 35]], 1.6); },
  tee: (c) => { c.beginPath(); c.arc(50, -4, 16, 0, Math.PI); c.lineWidth = 2.6; c.strokeStyle = INK; c.stroke(); },
  scarf: (c) => { line(c, [[0, 30], [100, 30]], 9, '#c8312f'); line(c, [[0, 74], [100, 74]], 9, '#c8312f'); },
  kebayaFront: (c) => {
    c.beginPath(); c.moveTo(30, -2); c.lineTo(50, 42); c.lineTo(70, -2); c.closePath(); c.fillStyle = '#f7e2c8'; c.fill();
    line(c, [[30, -2], [50, 42], [70, -2]], 2.4);
    for (let t = 0; t <= 1.001; t += 0.125) { circ(c, 30 + 20 * t - 3.5, -2 + 44 * t, 2.6, '#fff', 1.2); circ(c, 70 - 20 * t + 3.5, -2 + 44 * t, 2.6, '#fff', 1.2); }
    for (const y of [52, 66, 80]) circ(c, 50, y, 4, '#e8b93c', 1.8);
    for (let x = 4; x < 100; x += 9) circ(c, x, 98, 4, '#fff', 1.2);
  },
  kebayaSide: (c) => { for (let x = 4; x < 100; x += 9) circ(c, x, 98, 4, '#fff', 1.2); },
  batik: (c) => {
    for (let k = -110; k < 110; k += 20) line(c, [[k, 100], [k + 100, 0]], 3.2, '#e7c98a');
    for (let k = -110; k < 110; k += 20) for (let t = 0.06; t < 1; t += 0.12) circ(c, k + 10 + t * 100, 100 - t * 100, 2.2, '#3d2416');
    c.fillStyle = '#5a3420'; c.fillRect(-2, -2, 104, 9); line(c, [[-2, 7], [102, 7]], 1.6);
  },
  plaid: (c) => {
    c.fillStyle = 'rgba(15,35,40,0.35)'; for (let x = 8; x < 100; x += 26) c.fillRect(x, -2, 10, 104); for (let y = 14; y < 100; y += 26) c.fillRect(-2, y, 104, 10);
    for (let x = 21; x < 100; x += 26) line(c, [[x, 0], [x, 100]], 1.4, 'rgba(240,230,210,0.7)');
    for (let y = 27; y < 100; y += 26) line(c, [[0, y], [100, y]], 1.4, 'rgba(240,230,210,0.7)');
    c.fillStyle = 'rgba(15,35,40,0.45)'; c.fillRect(-2, -2, 104, 11);
  },
  koko: (c) => {
    c.fillStyle = '#f1ead8'; c.fillRect(36, -2, 28, 9); c.lineWidth = 2; c.strokeStyle = INK; c.strokeRect(36, -2, 28, 9);
    line(c, [[50, 7], [50, 52]], 2); for (const y of [16, 28, 40]) circ(c, 53.5, y, 2.4, '#8a6a3a', 1.2);
    line(c, [[18, 62], [34, 62], [34, 78], [18, 78], [18, 62]], 1.8);
  },
  sdShirt: (c) => {
    c.fillStyle = '#3d6fb6'; c.fillRect(16, -2, 10, 104); c.fillRect(74, -2, 10, 104);
    for (const x of [16, 26, 74, 84]) line(c, [[x, -2], [x, 102]], 1.6);
    line(c, [[34, 0], [46, 11]], 2.2); line(c, [[66, 0], [54, 11]], 2.2);
    c.beginPath(); c.moveTo(46, 4); c.lineTo(54, 4); c.lineTo(57, 46); c.lineTo(50, 54); c.lineTo(43, 46); c.closePath();
    c.fillStyle = '#c8312f'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
    c.strokeRect(58, 24, 13, 13); circ(c, 64.5, 30.5, 3, '#e8b93c', 1.2);
  },
  capFront: (c) => { c.fillStyle = '#f4f2ee'; c.fillRect(-2, 58, 104, 44); line(c, [[-2, 58], [102, 58]], 2); },
};

// ---------- pose-able humanoid ----------
const NECK = [0, 1.95, 0];
/**
 * spec: { skin, shirt, pants, shoes, hair?, shorts?, socks?, skirt?, skirtDecal?, longSleeve?, torsoDecal?, faceOpts?,
 *         headExtra?: parts that ride on the head (no pivot), bodyExtra?: static parts, holdR?/holdL?: [{mesh, c, col, decal?}]
 *         (move with that arm), pose?: default pose, expr?: default expression, k?: scale, name? }
 * pose: { armL:{rx,rz}, armR:{rx,rz}, legL, legR (rx), head:{rx nod, ry turn, rz tilt}, bob, expr, blink, look, open, hold:false }
 */
export function human(s, pose = {}) {
  const base = s.pose || {}, parts = [], skin = s.skin;
  const armL = { ...(base.armL || {}), ...(pose.armL || {}) }, armR = { ...(base.armR || {}), ...(pose.armR || {}) };
  const head = { ...(base.head || {}), ...(pose.head || {}) };
  const legL = pose.legL ?? base.legL ?? 0, legR = pose.legR ?? base.legR ?? 0, expr = pose.expr || s.expr || 'neutral';
  if (s.skirt) {
    const sd = s.skirtDecal ? { front: s.skirtDecal, right: s.skirtDecal, left: s.skirtDecal } : {};
    parts.push(P(box(1.08, 0.83, 0.64), [0, 0.535, 0], s.skirt, { decal: sd }));
    for (const side of [-1, 1]) { const o = { pivot: [side * 0.26, 0.6, 0], rx: (side < 0 ? legL : legR) * 0.35 }; parts.push(P(box(0.42, 0.12, 0.58), [side * 0.26, 0.06, 0.07], s.shoes, o)); }
  } else {
    for (const side of [-1, 1]) {
      const o = { pivot: [side * 0.27, 0.95, 0], rx: side < 0 ? legL : legR };
      parts.push(P(box(0.52, 0.16, 0.66), [side * 0.27, 0.08, 0.05], s.shoes, o));
      if (s.shorts) {
        parts.push(P(box(0.5, 0.45, 0.55), [side * 0.27, 0.725, 0], s.pants, o));
        if (s.socks) { parts.push(P(box(0.46, 0.16, 0.5), [side * 0.27, 0.24, 0], s.socks, o)); parts.push(P(box(0.44, 0.18, 0.48), [side * 0.27, 0.41, 0], skin, o)); }
        else parts.push(P(box(0.44, 0.34, 0.48), [side * 0.27, 0.33, 0], skin, o));
      } else parts.push(P(box(0.5, 0.79, 0.55), [side * 0.27, 0.555, 0], s.pants, o));
    }
  }
  parts.push(P(box(1.1, 1.0, 0.6), [0, 1.45, 0], s.shirt, { decal: s.torsoDecal || {} }));
  const sl = s.longSleeve ? 0.72 : 0.5;
  for (const side of [-1, 1]) {
    const a = side > 0 ? armR : armL, opt = { pivot: [side * 0.79, 1.88, 0], rx: a.rx || 0, rz: a.rz || 0 };
    const top = 1.92 - sl + 0.02, bot = 0.97;
    parts.push(P(box(0.44, sl, 0.5), [side * 0.79, 1.92 - sl / 2, 0], s.shirt, opt));
    parts.push(P(box(0.4, top - bot, 0.46), [side * 0.79, (top + bot) / 2, 0], skin, opt));
    if (pose.hold !== false) for (const h of (side > 0 ? s.holdR : s.holdL) || []) parts.push(P(h.mesh, h.c, h.col, { ...opt, decal: h.decal || {} }));
  }
  const hp = { pivot: NECK, rx: head.rx || 0, ry: head.ry || 0, rz: head.rz || 0 };
  const face = faceDecal(expr, skin, { ...(s.faceOpts || {}), blink: pose.blink || 0, look: pose.look || 0, open: pose.open, tear: pose.tear });
  parts.push(P(box(1.0, 0.92, 0.9), [0, 2.41, 0], skin, { ...hp, decal: { front: face } }));
  if (s.hair) parts.push(P(box(1.06, 0.3, 0.96), [0, 2.77, 0], s.hair, hp));
  for (const e of s.headExtra || []) parts.push({ ...e, pivot: NECK, rx: hp.rx, ry: hp.ry, rz: hp.rz });
  for (const e of s.bodyExtra || []) parts.push(e);
  const bob = pose.bob || 0;
  return bob ? parts.map((p) => ({ ...p, c: [p.c[0], p.c[1] + bob, p.c[2]], pivot: p.pivot ? [p.pivot[0], p.pivot[1] + bob, p.pivot[2]] : null })) : parts;
}

// ---------- life & movement poses (combine with mergePose) ----------
export const blinkAt = (f, seed = 1) => { const per = 38 + (seed * 17) % 31, ph = (f + seed * 13) % per; return ph < 2 ? 0.5 : ph < 4 ? 1 : 0; };
/** Breathing bob, small head sway and blinks. Use on EVERY on-screen character. */
export const alive = (f, seed = 1) => ({
  bob: 0.025 * Math.sin((f + seed * 11) * 0.11),
  head: { rz: 0.035 * Math.sin((f + seed * 5) * 0.037 + 1), rx: 0.02 * Math.sin((f + seed * 3) * 0.05) },
  blink: blinkAt(f, seed),
});
/** Walk cycle from a 0..1 step phase (motion.js walk() gives the phase). */
export const walkPose = (phase, amp = 0.55) => {
  const s = Math.sin(phase * 2 * Math.PI);
  return { legL: s * amp, legR: -s * amp, armL: { rx: -s * amp * 0.8 }, armR: { rx: s * amp * 0.8 }, bob: Math.abs(s) * 0.07 };
};
/** Wave with the right hand; t in seconds. */
export const wavePose = (t, side = 'R') => ({ ['arm' + side]: { rz: (side === 'R' ? 1 : -1) * (2.6 + 0.35 * Math.sin(t * 9)) } });
/** Later poses override earlier ones; bob and head angles add up. */
export function mergePose(...ps) {
  const out = { armL: {}, armR: {}, head: {}, bob: 0 };
  for (const p of ps) {
    if (!p) continue;
    for (const [k, v] of Object.entries(p)) {
      if (k === 'bob') out.bob += v;
      else if (k === 'head') for (const [hk, hv] of Object.entries(v)) out.head[hk] = (out.head[hk] || 0) + hv;
      else if (k === 'armL' || k === 'armR') Object.assign(out[k], v);
      else out[k] = v;
    }
  }
  return out;
}

// ---------- cast presets (original, Indonesian-flavoured; copy one to make a new character) ----------
const STEEL = '#aeb6bf';
export const CAST = {
  prajurit: {
    name: 'Prajurit', skin: '#e9b48a', shirt: '#b8322f', pants: '#7a2a26', shoes: '#5a3a22', expr: 'stubborn',
    torsoDecal: { front: DECALS.armor, right: DECALS.armor, left: DECALS.armor },
    headExtra: [
      P(box(1.08, 0.36, 0.98), [0, 2.78, 0], STEEL, { decal: { front: DECALS.helmBand, right: DECALS.helmBand, left: DECALS.helmBand, back: DECALS.helmBand } }),
      P(box(1.14, 0.3, 0.2), [0, 3.1, 0], '#d2372f', { decal: { front: DECALS.crestLines, back: DECALS.crestLines } }),
      P(box(0.08, 0.46, 0.42), [0.54, 2.4, 0.16], STEEL), P(box(0.08, 0.46, 0.42), [-0.54, 2.4, 0.16], STEEL),
    ],
    bodyExtra: [P(box(0.52, 0.16, 0.58), [0.79, 1.96, 0], STEEL), P(box(0.52, 0.16, 0.58), [-0.79, 1.96, 0], STEEL)],
    holdR: [{ mesh: box(0.07, 3.3, 0.07), c: [0.79, 1.8, 0], col: '#7a4a2a' }, { mesh: cone(0.13, 0.42, 4), c: [0.79, 3.45, 0], col: '#c9d0d6' }],
    holdL: [{ mesh: box(0.95, 1.25, 0.1), c: [-0.76, 1.35, 0.42], col: '#c0302c', decal: { front: DECALS.shield } }],
    pose: { armR: { rx: -0.3 } },
  },
  tani: {
    name: 'Pak Tani', skin: '#c98b5a', shirt: '#4f8a3c', pants: '#5a4030', shoes: '#3a2a20', shorts: true, hair: '#2b211c', expr: 'happy',
    torsoDecal: { front: DECALS.shirt }, faceOpts: { blush: true },
    headExtra: [P(cone(0.98, 0.5, 12), [0, 2.8, 0], '#e3c27a')],
    bodyExtra: [P(box(0.94, 0.16, 0.68), [0, 1.93, 0], '#f1ead8', { decal: { front: DECALS.scarf, right: DECALS.scarf, left: DECALS.scarf } })],
    holdR: [{ mesh: box(0.08, 1.6, 0.08), c: [0.79, 0.85, 0], col: '#8a5d3b' }, { mesh: box(0.46, 0.36, 0.06), c: [0.79, 0.2, 0.08], col: '#8f8a7e' }],
    pose: { armR: { rx: -0.25 }, armL: { rz: -0.35 } },
  },
  ibu: {
    name: 'Ibu Berkebaya', skin: '#e0a77a', shirt: '#e47a95', longSleeve: true, skirt: '#7a4a2a', skirtDecal: DECALS.batik, shoes: '#3a2a20', hair: '#1e1714', expr: 'happy',
    torsoDecal: { front: DECALS.kebayaFront, right: DECALS.kebayaSide, left: DECALS.kebayaSide }, faceOpts: { blush: true },
    headExtra: [P(box(0.46, 0.34, 0.34), [0, 2.62, -0.6], '#1e1714'), P(box(0.14, 0.14, 0.14), [0.2, 2.8, -0.6], '#f2b33d')],
    pose: { armL: { rz: -0.12 }, armR: { rz: 0.12 } },
  },
  kakek: {
    name: 'Kakek', skin: '#d9a57a', shirt: '#f1ead8', longSleeve: true, skirt: '#3f6a6f', skirtDecal: DECALS.plaid, shoes: '#4a3020', expr: 'neutral',
    torsoDecal: { front: DECALS.koko }, faceOpts: { beard: true },
    headExtra: [P(box(1.02, 0.3, 0.94), [0, 2.97, 0], '#1d1a1f'), P(box(0.5, 0.26, 0.14), [0, 1.84, 0.36], '#f4f1ea')],
    holdL: [{ mesh: box(0.08, 1.08, 0.08), c: [-0.79, 0.56, 0], col: '#6e4a2a' }],
    pose: { armL: { rx: -0.15 } },
  },
  anak: {
    name: 'Anak SD', k: 0.82, skin: '#b97a4f', shirt: '#f4f2ee', pants: '#c8312f', shorts: true, socks: '#f4f2ee', shoes: '#1d1a1f', hair: '#1e1714', expr: 'laugh',
    torsoDecal: { front: DECALS.sdShirt }, faceOpts: { blush: true },
    headExtra: [P(box(1.06, 0.26, 0.98), [0, 2.95, 0], '#c8312f', { decal: { front: DECALS.capFront, right: DECALS.capFront, left: DECALS.capFront } }), P(box(0.8, 0.06, 0.42), [0, 2.85, 0.64], '#c8312f')],
    bodyExtra: [P(box(0.86, 0.86, 0.36), [0, 1.5, -0.5], '#3d6fb6')],
    pose: { armL: { rz: -0.1 }, armR: { rz: 0.1 } },
  },
  warga: {
    name: 'Warga', skin: '#c98b5a', shirt: '#3f7fb8', pants: '#3a3a48', shoes: '#2a2420', hair: '#2b211c', expr: 'neutral',
    torsoDecal: { front: DECALS.tee }, pose: { armL: { rz: -0.1 }, armR: { rz: 0.1 } },
  },
};
