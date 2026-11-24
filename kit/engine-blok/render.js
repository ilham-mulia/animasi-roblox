// Canvas renderer for the blok style: perspective camera, near-plane clipping, painter's sort per face,
// 2-step toon shading, black ink edges, face decals, terrain slabs, 2-layer lens blur (DOF), flash and vignette.
import { add, sub, dot, cross, norm, rotX, rotY, rotZ, INK, LIGHT, rng } from './blok.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const centroid = (pts) => { const s = [0, 0, 0]; for (const p of pts) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; } return [s[0] / pts.length, s[1] / pts.length, s[2] / pts.length]; };
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function createRenderer(canvas) {
  const W = canvas.width, H = canvas.height, main = canvas.getContext('2d');
  const layerCv = document.createElement('canvas'); layerCv.width = W; layerCv.height = H;
  const layer = layerCv.getContext('2d');
  const NEAR = 0.3;
  const R = { W, H, main, ctx: main, faces: [], dof: 0, focus: 1e9, cam: null };

  // ---------- camera ----------
  /** cam: { pos, look, fov (deg, vertical), roll (deg) } — same keys as motion.js camFromKeys */
  R.setCamera = (c) => {
    const pos = c.pos, look = c.look || c.target;
    const fw = norm(sub(look, pos));
    let rt = norm(cross(fw, [0, 1, 0])), up = cross(rt, fw);
    const rl = ((c.roll || 0) * Math.PI) / 180;
    if (rl) { const cs = Math.cos(rl), sn = Math.sin(rl); const r2 = add(rt.map((v) => v * cs), up.map((v) => v * sn)); up = add(up.map((v) => v * cs), rt.map((v) => -v * sn)); rt = r2; }
    R.cam = { pos, look, fw, rt, up, FP: H / 2 / Math.tan(((c.fov || 50) * Math.PI) / 360) };
  };
  R.view = (p) => { const v = sub(p, R.cam.pos); return [dot(v, R.cam.rt), dot(v, R.cam.up), dot(v, R.cam.fw)]; };
  R.screen = (v) => [W / 2 + (v[0] / v[2]) * R.cam.FP, H / 2 - (v[1] / v[2]) * R.cam.FP, v[2]];
  R.proj = (p) => { const v = R.view(p); return v[2] < NEAR ? null : R.screen(v); };
  R.projDir = (d) => { const v = [dot(d, R.cam.rt), dot(d, R.cam.up), dot(d, R.cam.fw)]; return v[2] < 0.02 ? null : R.screen(v); };
  R.depth = (p) => dot(sub(p, R.cam.pos), R.cam.fw);
  R.ppu = (z) => R.cam.FP / z;                       // pixels per world unit at depth z
  R.ink = (z) => clamp((0.06 * R.cam.FP) / z, 1.1, 7); // ink width grows on close-ups, capped
  /** world polygon -> screen polygon, clipped at the near plane. null when fully behind the camera. */
  R.clipProject = (pts) => {
    const vs = pts.map(R.view);
    if (vs.every((v) => v[2] >= NEAR)) return { sp: vs.map(R.screen), whole: true };
    const out = [];
    for (let i = 0; i < vs.length; i++) {
      const a = vs[i], b = vs[(i + 1) % vs.length], ina = a[2] >= NEAR, inb = b[2] >= NEAR;
      if (ina) out.push(a);
      if (ina !== inb) { const t = (NEAR - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]); }
    }
    return out.length >= 3 ? { sp: out.map(R.screen), whole: false } : null;
  };
  R.poly = (g, pts) => { g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); };
  R.seg = (g, a, b, w, col) => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineWidth = w; g.lineCap = 'round'; g.strokeStyle = col; g.stroke(); };

  // ---------- frame ----------
  /** Start a frame. dof: { px blur for the background layer, focus distance along the view axis } */
  R.begin = (cam, dof = {}) => {
    R.setCamera(cam); R.faces = [];
    R.dof = dof.px || 0; R.focus = dof.focus || 1e9;
    for (const g of [main, layer]) { g.setTransform(1, 0, 0, 1, 0, 0); g.filter = 'none'; g.globalAlpha = 1; }
    if (R.dof > 0.3) { layer.clearRect(0, 0, W, H); R.ctx = layer; } else R.ctx = main;
  };
  /** Queue parts at pos with yaw (rad), uniform scale k and optional tilt {rx, rz} (boats rocking, falls). */
  R.add = (parts, pos = [0, 0, 0], yaw = 0, k = 1, tilt = null) => {
    const tw = (v) => { let q = v; if (tilt) { if (tilt.rz) q = rotZ(q, tilt.rz); if (tilt.rx) q = rotX(q, tilt.rx); } return rotY(q, yaw); };
    for (const p of parts) {
      const rot = (v) => { const r = rotZ(rotX(rotY(v, p.ry), p.rx), p.rz); return p.spin ? rotY(r, p.spin) : r; };
      const place = (v) => { let q = add(v, p.c); if (p.pivot) q = add(p.pivot, rot(sub(q, p.pivot))); return q; };
      for (const f of p.mesh) {
        R.faces.push({
          pts: f.pts.map((v) => add(tw(place(v).map((x) => x * k)), pos)),
          n: tw(p.pivot ? rot(f.n) : f.n), col: p.faceCol[f.name] || p.col, decal: p.decal[f.name], top: f.n[1] > 0.9 && !p.pivot,
        });
      }
    }
  };
  function drawFace(g, f) {
    R.poly(g, f.sp); g.fillStyle = f.col; g.fill();
    if (f.decal && f.whole && f.sp.length === 4) {
      const [a, b, , d] = f.sp;
      g.save(); R.poly(g, f.sp); g.clip();
      g.transform((b[0] - a[0]) / 100, (b[1] - a[1]) / 100, (d[0] - a[0]) / 100, (d[1] - a[1]) / 100, a[0], a[1]);
      f.decal(g); g.restore();
    }
    if (f.top) { R.poly(g, f.sp); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fill(); }
    if (f.light < 0.12) { R.poly(g, f.sp); g.fillStyle = 'rgba(58,33,64,0.34)'; g.fill(); }
    R.poly(g, f.sp); g.lineWidth = R.ink(f.z); g.lineJoin = 'round'; g.strokeStyle = INK; g.stroke();
  }
  /** Sort and draw queued faces. final=true on the last flush of the frame: splits at the focus for the lens blur. */
  R.flush = (final = true) => {
    const items = [];
    for (const f of R.faces) {
      const cen = centroid(f.pts);
      if (dot(f.n, sub(R.cam.pos, cen)) <= 0) continue;
      const cp = R.clipProject(f.pts);
      if (!cp) continue;
      items.push({ ...f, sp: cp.sp, whole: cp.whole, z: R.depth(cen), light: dot(f.n, LIGHT) });
    }
    items.sort((a, b) => b.z - a.z);
    R.faces = [];
    let i = 0;
    if (final && R.ctx === layer) {
      for (; i < items.length && items[i].z > R.focus * 1.35; i++) drawFace(layer, items[i]);
      main.drawImage(layerCv, 0, 0);                                   // sharp base keeps the frame edges solid
      main.save(); main.filter = `blur(${R.dof}px)`; main.drawImage(layerCv, 0, 0); main.restore();
      R.ctx = main;
    }
    for (; i < items.length; i++) drawFace(R.ctx, items[i]);
  };

  // ---------- ground helpers (draw into R.ctx, before the faces that stand on them) ----------
  R.fillPoly = (xz, y, col, stroke) => {
    const cp = R.clipProject(xz.map((p) => [p[0], y, p[1]])); if (!cp) return;
    const g = R.ctx; R.poly(g, cp.sp); g.fillStyle = col; g.fill();
    if (stroke) { g.lineWidth = 3; g.strokeStyle = stroke; g.stroke(); }
  };
  /** Foam ring / outline on the water. w in world units. */
  R.foam = (xz, w = 0.25, y = 0, alpha = 0.88) => {
    const pts = xz.map((p) => [p[0], y, p[1]]), cp = R.clipProject(pts); if (!cp) return;
    const z = Math.max(1, R.depth(centroid(pts))), g = R.ctx;
    R.poly(g, cp.sp); g.lineWidth = Math.max(1.5, w * R.ppu(z)); g.lineJoin = 'round'; g.strokeStyle = `rgba(255,255,255,${alpha})`; g.stroke();
  };
  /** Soft contact shadow on the ground. */
  R.shadow = (x, y, z, r, a = 0.26) => {
    const pts = []; for (let i = 0; i < 24; i++) { const t = (i / 24) * 2 * Math.PI; pts.push([x + r * Math.cos(t), y + 0.02, z + r * Math.sin(t)]); }
    const cp = R.clipProject(pts); if (!cp) return;
    R.poly(R.ctx, cp.sp); R.ctx.fillStyle = `rgba(40,30,25,${a})`; R.ctx.fill();
  };
  /** Extruded blob of land with lip/strata on the sides and a painted top. o: { cx, cz, lip, strata, texture(xz, y) } */
  R.slab = (xz, y0, y1, topCol, sideCol, o) => {
    const g = R.ctx, n = xz.length, sides = [];
    for (let i = 0; i < n; i++) {
      const a = xz[i], b = xz[(i + 1) % n], pts = [[a[0], y1, a[1]], [b[0], y1, b[1]], [b[0], y0, b[1]], [a[0], y0, a[1]]];
      let nn = norm([b[1] - a[1], 0, -(b[0] - a[0])]);
      if (nn[0] * ((a[0] + b[0]) / 2 - o.cx) + nn[2] * ((a[1] + b[1]) / 2 - o.cz) < 0) nn = nn.map((v) => -v);
      const cen = centroid(pts);
      sides.push({ pts, n: nn, vis: dot(nn, sub(R.cam.pos, cen)) > 0, z: R.depth(cen) });
    }
    const order = sides.map((s, i) => i).filter((i) => sides[i].vis).sort((i, j) => sides[j].z - sides[i].z);
    const cps = {};
    for (const i of order) {
      const s = sides[i], cp = R.clipProject(s.pts); if (!cp) continue; cps[i] = cp;
      const sp = cp.sp; R.poly(g, sp); g.fillStyle = sideCol; g.fill(); g.lineWidth = 1.2; g.strokeStyle = sideCol; g.stroke();
      if (cp.whole && o.lip) { R.poly(g, [sp[0], sp[1], lerp2(sp[1], sp[2], 0.36), lerp2(sp[0], sp[3], 0.3)]); g.fillStyle = o.lip; g.fill(); g.strokeStyle = o.lip; g.stroke(); }
      if (cp.whole && o.strata) R.seg(g, lerp2(sp[0], sp[3], 0.66), lerp2(sp[1], sp[2], 0.66), 1.6, o.strata);
      if (dot(s.n, LIGHT) < 0.12) { R.poly(g, sp); g.fillStyle = 'rgba(58,33,64,0.30)'; g.fill(); }
    }
    for (const i of order) {
      const cp = cps[i]; if (!cp || !cp.whole) continue;
      const sp = cp.sp, w = R.ink(sides[i].z);
      R.seg(g, sp[3], sp[2], w, INK);
      if (!sides[(i - 1 + n) % n].vis) R.seg(g, sp[0], sp[3], w, INK);
      if (!sides[(i + 1) % n].vis) R.seg(g, sp[1], sp[2], w, INK);
    }
    const tp = R.clipProject(xz.map((p) => [p[0], y1, p[1]])); if (!tp) return;
    R.poly(g, tp.sp); g.fillStyle = topCol; g.fill();
    if (o.texture) { g.save(); R.poly(g, tp.sp); g.clip(); o.texture(xz, y1); g.restore(); }
    R.poly(g, tp.sp); g.lineWidth = R.ink(Math.max(1, R.depth([o.cx, y1, o.cz]))); g.lineJoin = 'round'; g.strokeStyle = INK; g.stroke();
  };
  /** Deterministic scatter inside a polygon (same marks every frame, so nothing flickers). */
  R.scatter = (xz, count, seed, fn) => {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const [x, z] of xz) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const r = rng(seed);
    for (let i = 0; i < count; i++) { const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0); if (inside(xz, x, z)) fn(x, z, i, r); }
  };

  // ---------- overlays ----------
  /** Rising Zzz above a sleeper (world point p = top of the head). */
  R.zzz = (p, f, a = 1) => {
    const s = R.proj(p); if (!s || a <= 0) return;
    const g = main, sc = clamp(R.ppu(s[2]) / 42, 0.7, 4);
    g.save(); g.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const ph = ((f / 30) * 0.55 + i / 3) % 1, sz = (14 + ph * 16) * sc;
      g.globalAlpha = a * (1 - ph * ph);
      g.font = `800 ${sz}px "Segoe UI", Arial, sans-serif`; g.lineWidth = 4 * Math.sqrt(sc); g.strokeStyle = INK; g.fillStyle = '#ffffff';
      const x = s[0] + (12 + ph * 34) * sc, y = s[1] - (8 + ph * 62) * sc;
      g.strokeText('Z', x, y); g.fillText('Z', x, y);
    }
    g.restore();
  };
  R.grade = ({ flash = 0, vignette = 0.22 } = {}) => {
    const g = main;
    if (vignette > 0) {
      const vg = g.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, H * 0.75);
      vg.addColorStop(0, 'rgba(40,20,40,0)'); vg.addColorStop(1, `rgba(40,20,40,${vignette})`);
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
    }
    if (flash > 0) { g.fillStyle = `rgba(255,255,255,${clamp(flash, 0, 1)})`; g.fillRect(0, 0, W, H); }
  };
  return R;
}

export function inside(xz, x, z) {
  let c = false;
  for (let i = 0, j = xz.length - 1; i < xz.length; j = i++) {
    const [xi, zi] = xz[i], [xj, zj] = xz[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
