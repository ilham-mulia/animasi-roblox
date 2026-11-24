// Example story for the blok style: "Pulau" — 8 s (240 frames) without a voiceover, to show every engine feature.
// Copy to web/story.js and rewrite SHOTS, cameras, scene and actor timing for the new script (timed from work/phrases.json).
// Exports used by main.js: TOTAL, camAt(f), dofAt(f), sceneAt(f), fxAt(f). All pure functions of the frame.
import { M, ramp, lerp, lerp3, camFromKeys, walk } from './motion.js';
import { CAST, human, alive, walkPose, wavePose, mergePose } from './blok.js';
import { stiltHouse, saung, palm, bush, rock, pier, boat } from './world.js';

export const FPS = 30, TOTAL = 240;
export const SHOTS = [
  { id: 'pulau', a: 0, b: 89 },     // establishing glide over the island
  { id: 'tani', a: 90, b: 149 },    // Pak Tani hears something, turns, surprised
  { id: 'dermaga', a: 150, b: 204 },// the kid runs down the pier and waves
  { id: 'kakek', a: 205, b: 239 },  // grandpa wakes up with a jolt
];
export const shotAt = (f) => SHOTS.find((s) => f >= s.a && f <= s.b) || SHOTS[SHOTS.length - 1];

// ---------- world layout ----------
const ISLAND = {
  sand: { cx: 0, cz: 0, R: 13.5, seed: 1.3, sq: 0.9 },
  grass: { cx: 0, cz: -1.5, R: 9, seed: 2.1, sq: 0.85, amp: 0.6 },
  path: [[-2.9, -0.2], [-2.2, 1.8], [-1.2, 3.8], [-0.4, 5.6], [0.2, 7.5]],
};
const ISLET = { sand: { cx: -15, cz: -70, R: 4.2, seed: 3.1, sq: 0.8, amp: 0.8, n: 30 }, sandTop: 0.45, shallow: false };
const ISLET2 = { sand: { cx: 25, cz: -160, R: 6, seed: 0.7, sq: 0.7, amp: 0.8, n: 30 }, sandTop: 0.6, shallow: false };
const HOUSE_A = [-4.0, 1.3, -4.5], HOUSE_B = [3.8, 1.3, -4.4], SAUNG = [5.5, 1.3, 1.0], BOAT = [-3.0, 0, 16.6];
const PALMS = [
  { o: { h: 7.2, lean: -0.9, ph: 0.3 }, pos: [-9.8, 0.5, 2.0] }, { o: { h: 6.6, lean: 0.8, ph: 1.4 }, pos: [10.2, 0.5, -0.5] },
  { o: { h: 5.0, lean: 0.8, ph: 2.2 }, pos: [-8.0, 0.5, 8.0] }, { o: { h: 6.2, lean: -0.7, ph: 0.9 }, pos: [-8.2, 1.3, -3.6] },
  { o: { h: 5.8, lean: 0.6, ph: 2.8 }, pos: [8.0, 1.3, -3.0] },
];
const ROCKS = [{ pos: [-3.5, 0, 12.6], yaw: 0.5, s: [1.5, 0.8, 1.2] }, { pos: [12.6, 0, 3.5], yaw: -0.4, s: [1.2, 0.9, 1.0] }, { pos: [-12.8, 0, -2.5], yaw: 0.2, s: [1.4, 0.7, 1.1] }];
const TANI = [-5.0, 0.5, 8.6], IBU = [-1.6, 1.3, 0.9], KAKEK = [3.4, 1.3, 3.0], DECK = 1.06;

// ---------- cameras: { f, pos, look, fov, roll } ----------
const CAMS = {
  pulau: [
    { f: 0, pos: [0, 23, 50], look: [0, 1.2, -4], fov: 50 },
    { f: 89, pos: [-5, 16.5, 38], look: [0, 2.4, 0], fov: 47, path: [[-2.5, 20, 45]] },
  ],
  tani: [
    { f: 90, pos: [-2.8, 3.2, 14.5], look: [-5, 2.75, 8.6], fov: 36 },
    { f: 149, pos: [-3.1, 3.1, 13.5], look: [-5, 2.8, 8.6], fov: 33 },
  ],
  dermaga: [
    { f: 150, pos: [5.6, 3.6, 24.5], look: [3.0, 1.9, 14.5], fov: 38 },
    { f: 204, pos: [5.0, 3.4, 22.6], look: [3.0, 2.2, 15.4], fov: 34 },
  ],
  kakek: [
    { f: 205, pos: [4.7, 3.95, 9.3], look: [3.4, 3.6, 3.0], fov: 34 },
    { f: 239, pos: [4.4, 3.9, 8.1], look: [3.4, 3.7, 3.0], fov: 30, roll: 2.5 },
  ],
};
export const camAt = (f) => camFromKeys(CAMS[shotAt(f).id], f, { kicks: [{ f: 222, a: 0.05 }] });

// ---------- lens: blur the far layer on close-ups (px), focus = distance along the view axis ----------
const along = (c, p) => { const d = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]], l = Math.hypot(...d); return ((p[0] - c.pos[0]) * d[0] + (p[1] - c.pos[1]) * d[1] + (p[2] - c.pos[2]) * d[2]) / l; };
export const dofAt = (f) => {
  const id = shotAt(f).id, c = camAt(f);
  if (id === 'tani') return { px: 6, focus: along(c, TANI) };
  if (id === 'dermaga') return { px: 3.5, focus: along(c, [3, DECK, 15]) };
  if (id === 'kakek') return { px: 6, focus: along(c, KAKEK) };
  return { px: 0 };
};

// ---------- actors ----------
const actor = (spec, pos, yaw, pose) => ({ parts: human(spec, pose), pos, yaw, k: spec.k || 1 });
function actorsAt(f) {
  const t = f / 30, out = [];
  // Pak Tani: happy; at f118 turns his head toward the pier (overshoot), surprised from f120 with a small hop
  const turn = M.back(ramp(f, 116, 126)), hop = f >= 120 ? 0.18 * Math.max(0, Math.sin(Math.min(1, (f - 120) / 8) * Math.PI)) : 0;
  out.push(actor(CAST.tani, TANI, 0.35, mergePose(alive(f, 2), { head: { ry: 0.7 * turn }, expr: f >= 120 ? 'surprised' : 'happy', bob: hop })));
  // Ibu: chats (talk with lip flap) during the wide, waves at the kid later
  const talk = f < 90 ? { expr: 'talk', open: 0.5 + 0.5 * Math.sin(f * 0.9) } : { expr: 'happy' };
  out.push(actor(CAST.ibu, IBU, 0.35, mergePose(alive(f, 4), talk, f > 170 ? wavePose(t, 'R') : null)));
  // Kakek: asleep until f222, then jolts awake (anticipation -> overshoot)
  const wake = f >= 222, jolt = wake ? M.back(ramp(f, 222, 230)) : 0;
  out.push(actor(CAST.kakek, KAKEK, 0.15, mergePose(alive(f, 6), wake ? { expr: 'surprised', head: { rx: -0.12 * jolt }, bob: 0.2 * Math.sin(Math.min(1, (f - 222) / 9) * Math.PI) } : { expr: 'sleep', head: { rx: 0.12 }, blink: 0 })));
  // Anak SD: waves on the pier in the wide; in 'dermaga' runs from z 12.8 to 16.4, then waves
  let z = 16.4, pose = mergePose(alive(f, 8), wavePose(t, 'R'));
  if (f >= 150 && f < 186) { const w = walk(f, 150, 3.0, 0.75); z = 12.8 + w.dist; pose = mergePose(alive(f, 8), walkPose(w.phase, 0.7), { expr: 'happy' }); }
  out.push(actor(CAST.anak, [3.0, DECK, Math.min(16.4, z)], f >= 150 && f < 186 ? 0 : -0.25, pose));
  return out;
}

// ---------- scene ----------
export function sceneAt(f) {
  const t = f / 30;
  const far = {
    islands: [ISLET2, ISLET],
    items: [
      { parts: palm({ h: 5.2, lean: 0.9, ph: 1.1 }, t), pos: [-15.5, 0.45, -70.5] },
      { parts: palm({ h: 6, lean: -0.8, ph: 0.4 }, t), pos: [23.5, 0.6, -160], k: 1.2 },
      { parts: palm({ h: 5, lean: 0.7, ph: 2.0 }, t), pos: [27, 0.6, -161], k: 1.2 },
      { parts: boat({ sail: '#f4f2ee' }), pos: [12 + t * 0.4, 0.04 * Math.sin(t * 2), -110], yaw: 1.35, k: 1.3 },
    ],
  };
  const actors = actorsAt(f);
  const bob = 0.06 * Math.sin(t * 2.2);
  const main = {
    islands: [ISLAND],
    boats: [{ pos: BOAT, yaw: 1.35 }],
    foam: [
      ...ROCKS.map((r) => ({ xz: circle(r.pos[0], r.pos[2], 1.1), w: 0.14 })),
      ...[12.5, 15.5, 18.4].flatMap((z) => [1.95, 4.05].map((x) => ({ xz: circle(x, z, 0.32), w: 0.08 }))),
    ],
    shadows: [
      [HOUSE_A[0], 1.3, HOUSE_A[2], 3.2, 0.22], [HOUSE_B[0], 1.3, HOUSE_B[2], 3.2, 0.22], [SAUNG[0], 1.3, SAUNG[2], 2.0, 0.2],
      ...PALMS.map((p) => [p.pos[0], p.pos[1], p.pos[2], 0.6, 0.25]),
      ...actors.map((a) => [a.pos[0], a.pos[1], a.pos[2], 0.95 * a.k, 0.28]),
    ],
    items: [
      { parts: stiltHouse({ wall: '#5fa3a0', roof: '#d46a3a', shutter: '#f2b33d' }), pos: HOUSE_A, yaw: 0.25 },
      { parts: stiltHouse({ wall: '#d9a35f', roof: '#b8432f', shutter: '#4f8a3c' }), pos: HOUSE_B, yaw: -0.3 },
      { parts: saung(), pos: SAUNG, yaw: 0.2 },
      ...PALMS.map((p) => ({ parts: palm(p.o, t), pos: p.pos })),
      { parts: bush(1), pos: [0.3, 1.3, -2.4], yaw: 0.3 }, { parts: bush(0.8), pos: [-6.9, 1.3, 1.0], yaw: -0.5 }, { parts: bush(0.9), pos: [7.4, 1.3, -0.8], yaw: 0.8 },
      ...ROCKS.map((r) => ({ parts: rock(...r.s), pos: r.pos, yaw: r.yaw })),
      { parts: pier(9, 3), pos: [3.0, 0, 10.5] },
      { parts: boat({ sail: '#e8873a' }), pos: [BOAT[0], bob, BOAT[2]], yaw: 1.35, tilt: { rz: 0.035 * Math.sin(t * 1.7) } },
      ...actors,
    ],
  };
  return { layers: [far, main], sky: {} };
}
const circle = (x, z, r, n = 14) => Array.from({ length: n }, (_, i) => [x + r * Math.cos((i / n) * 2 * Math.PI), z + r * Math.sin((i / n) * 2 * Math.PI) * 0.8]);

// ---------- effects ----------
export const fxAt = (f) => {
  const cut = (a, s) => (f >= a && f < a + 5 ? s * (1 - (f - a) / 5) : 0);
  const zz = f < 222 ? 1 : Math.max(0, 1 - (f - 222) / 4);
  return { flash: cut(90, 0.5) + cut(150, 0.35) + cut(205, 0.35), zzz: [{ p: [KAKEK[0] + 0.2, KAKEK[1] + 3.3, KAKEK[2]], a: zz }] };
};
