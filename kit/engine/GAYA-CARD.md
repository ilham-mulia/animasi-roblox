# Gaya card (gaya lama): karakter 2D "bean-head" di dunia three.js

Dipakai hanya kalau pengguna meminta gaya ini. Buat project dengan `bash <skill>/kit/tools/setup.sh ~/shorts/<slug> card`
(butuh internet sekali untuk three.js r160 dan `toon.ts`). Tahap 1-3 dan 4.1, 4.2, 4.7, 4.8 di SKILL.md tetap berlaku; bagian di bawah ini
menggantikan 4.3-4.6 untuk gaya card. Contoh jadi: `kit/example/soldier/stills.jpg`.

## Subtitle dan tag ekspresi di gaya card
- Engine card (WebGL) tidak membakar subtitle ke frame. `timing.py` tetap menulis `out/subs.srt`; kirim file itu bersama MP4 untuk diupload sebagai caption di platform.
- `timing.py` tetap menulis `work/cues.json` dari tag naskah. Engine card tidak membacanya otomatis: salin frame dan ekspresinya ke `actorsAt` (mis. `kaget` → `expr: 'surprised'`, `ngotot` → `'stubborn'`, `tidur` → `'snore'`).

## Dunia (`web/main.js`)
Pertahankan bagian engine: materials, ink/normal-depth contract, helpers (`add`/`tbox`), sky, lights, cards, render targets & post, per-frame state (`applyLight`, `drawActors`, `swapForNd`), dan `renderFrame`. Ganti dunia contoh di antara `// ---------- world ----------` dan `// ---------- cards ----------` (termasuk `helmet prop (3D)` yang khusus cerita contoh), plus bagian cerita di `worldState()` dan `web/story.js`.
- Bangun dari bentuk primitif dengan tekstur canvas bergaya lukisan dari `paint.js` (planks, beam, rotten, stone, mossy, grass, dirt, plaster, roof, marble, banner, teks ukir). Painter baru: warna datar dengan sambungan gelap.
- `tbox` untuk kepadatan texel yang konstan, gradien toon 2 tingkat, warna fog = warna horizon.
- Latar belakang: bukit (bola setengah terkubur), gunung (kerucut + puncak salju), pohon cemara/pinus, rumah di kejauhan, billboard awan lukisan.
- Set piece (runtuhan, benda jatuh, pintu) = grup berporos yang digerakkan progres 0..1 dari `worldAt(f)`.
- Teks melengkung di dunia pakai UV planar. Pastikan tidak terbalik.

## Pemeran (`web/roman.js` → `web/toon.js`)
- `romanFront(p, outfitKey, opts)` menggambar di canvas desain 600x1000 dengan telapak kaki di y=975. Card setinggi 2,25 m, jadi 1 unit = 0,00225 m.
- Outfit bawaan di `OUTFITS`: `legion`, `old`, `toga`, `civA`, `civB`, `civC`, `workA`, `workB`. Properti: tunic, cape, skin, hair, helmet, armor, spear, shield, beard, brows, moustache, cap, apron, dress, toga, stout.
- Pose lengan (`L`/`R`): hang, spear, point, up, wave, hip, belly, temple, lift, reach, cheek, shield, cross, thumb.
- Ekspresi (`expr`): set FACE dari toon.ts plus snore, stubborn, squint.
- Opsi lain: blink, look, facing, seed, tilt, headTilt, bob, nohelmet, light, web, step. Card efek: `fxZ`, `fxLeaf`, `fxDust`, `fxDrip`, `fxWood`, `helmetCard`.
- Setelah edit: `cat web/toonbase.js web/roman.js > web/toon.js`. Render test sheet karakter sebelum memakai desain baru.
- Billboard hanya berputar di sumbu yaw, punya contact blob dan bayangan alpha-tested, dan tidak diberi tinta oleh pass dunia.
- Kunci card dari nilai `q()` yang dibulatkan. Bagian yang terlepas (helm diangkat) = card sendiri, sejajar `headCenter(seed)`: y = DECK + (partY − hc) × 0,00225.

## Gerak (`web/motion.js`)
- Kamera `camFromKeys(keys, f, {kicks})`; glide smootherstep 18-45 f; `M.easeOut` untuk reveal; via-point `path`. Setiap hold merayap. Roll 3-5° untuk drama, flip-shake 7 frame untuk benturan.
- Karakter: `idle(f, seed)` di setiap card, `blinkAt`, anggukan di kata yang ditekan. Aksi: `M.anticip` → `M.back` → `M.spring`.
- Lensa: DOF di close-up/medium (cInf 8-14 px), fokus di mata. Wide tajam. Rack ±14 f.

## Cek tampilan
- Pagar/tiang melintang di wajah, kamera menembus rumah/atap, foreground < 2 m, tokoh tertutup pilar, teks terbalik, card bagian terlepas bergeser salah.
- Grup material extrude: 0 = caps, 1 = sides+top. Tinta hilang: `HASH=#e node render.mjs ...` (edge saja) atau `HASH=#nd` (normal/depth). Radius tinta ±2,5 px di 1080.
- Render ±3-10 dtk/frame (WebGL CPU). Di PC dengan GPU boleh coba tanpa flag swiftshader di `render.mjs` salinan project; pakai hanya kalau hasilnya sama.

## Gotcha engine
- `#include <fog_vertex>` / `<fog_fragment>` di baris sendiri. Pass terakhir menulis `linearToOutputTexel(...)` (render target linear HalfFloat).
- Pass normal+depth menukar material per mesh: dunia → normal/depth, card → mask alpha-tested (rgb 0, a = depth), blob/awan/langit disembunyikan, air → normal datar. Fog dan bayangan mati selama pass ini.
- Tinta hanya di sisi dekat lompatan kedalaman; lipatan dari dot normal; tetangga card dilewati; memudar di ±140-520 m. DOF: 48 tap dengan tes CoC per sampel.
- Matahari dari az/el per preset cahaya; kamera bayangan dipusatkan di aksi tiap shot.

## Arsitektur
- `main.js`: renderer, material toon, dunia, card (plane CanvasTexture 1200x2000, origin di telapak kaki), pass warna (RT samples 4) → normal/depth → tinta+grade → DOF. Mengekspos `window.renderFrame(f)` dan `window.ready`.
- `story.js`: `SHOTS`, `TOTAL`, `shotAt`, `camAt`, `dofAt`, `LIGHTS`/`lightFor`, `worldAt`, `actorsAt(f, T)`, `fxAt(f, T)`.
- Karakter: Pen API dari `templates/bridge/toon.ts` di mromidev/claude-animated-shorts, diperluas oleh `roman.js`.
