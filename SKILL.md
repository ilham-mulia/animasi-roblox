---
name: cartoon-audio-short
description: Membuat video pendek kartun vertikal (Shorts/Reels/TikTok, 1080x1920) bergaya blok, yaitu karakter berbadan kotak 3D (desain orisinal) di dunia pulau/kampung bertinta hitam. Menawarkan 10 ide cerita, menulis naskah narasi (Indonesia atau Inggris), lalu mengubah voiceover pengguna menjadi MP4 jadi dengan musik dan SFX di 50 % level suara. Pakai saat pengguna minta video kartun pendek, animasi cerita pendek, cartoon short, atau "bikinin video dari voiceover ini".
---

# Video kartun pendek: ide → naskah → voiceover → MP4 jadi

**Gaya visual (default: blok):** karakter berbadan kotak 3D (kepala, badan, lengan, dan kaki dari balok) dengan wajah kartun, shading toon 2 tingkat, dan garis tinta hitam, di dunia 3D warna-warni: pulau bertingkat, rumah panggung, saung, pohon kelapa, dermaga, perahu bercadik, serta laut dan langit bergaya lukisan. Semua desain orisinal, jadi jangan meniru avatar, logo, atau tampilan game tertentu (mis. Roblox atau Minecraft). Gaya lama (karakter 2D "bean-head" di dunia three.js) masih tersedia lewat `setup.sh <dir> card`, dengan panduan di `kit/engine/GAYA-CARD.md`.

**Output:** 1080x1920, 30 fps, durasinya persis sama dengan voiceover. Suara pengguna tidak diubah. Musik dan SFX dibuat dengan kode (synth) dan berada di **50 % level suara**.

## Isi folder skill
```
cartoon-audio-short/
  SKILL.md
  kit/                        ← kit kode, baca-saja (kecuali cache kit/vendor/ untuk gaya card)
    engine-blok/              blok.js (karakter, mesh, decal), world.js (langit, laut, pulau, properti),
                              render.js (renderer canvas), main.js, index.html
    engine/                   motion.js (dipakai kedua gaya), engine card lama, GAYA-CARD.md
    example/pulau/story.js    contoh gaya blok: 8 detik, 4 shot, semua fitur engine
    example/soldier/          audio.py (template synth musik/SFX), story.js + stills.jpg (contoh gaya card)
    tools/                    setup.sh, timing.py, render.mjs, sheet.py, mix.py, finish.sh
```
`<skill>` di bawah = folder skill ini. Ambil dari baris "Base directory for this skill" yang muncul saat skill dimuat. Kalau tidak ada, cek `~/.claude/skills/cartoon-audio-short/`. Jangan pakai `find /` (lambat, dan tidak jalan di Windows).

## Aturan
- Cerita, karakter, dan shot selalu orisinal. Jangan meniru video kreator lain shot demi shot, dan jangan meniru karakter, peta, atau tampilan game yang sudah ada. Tawarkan versi orisinal dari ide yang sama.
- Tidak ada tokoh nyata yang masih hidup sebagai karakter, dan tidak ada maskot, logo merek, atau lambang resmi (seragam sekolah tanpa lambang).
- Tidak ada caption/subtitle kecuali diminta. Teks di dalam dunia cerita (papan nama, ukiran) boleh, dan harus terbaca benar (tidak terbalik).
- Jangan pernah mengedit atau menggeser timing suara. Gambarnya yang mengikuti suara: setiap reaksi visual jatuh 0-3 frame sebelum katanya.
- **Level audio:** musik = 50 % level suara (−6 dB, gated RMS). SFX 50 % atau sedikit di bawahnya, dengan puncak dibatasi supaya tidak ada hentakan yang menutupi narasi. Selalu mix dengan `mix.py`, jangan manual. Tanpa ducking, tanpa kompresi. Satu-satunya pengolahan di mix akhir: satu gain linear + peak limiter (`finish.sh`).
- Tampilkan progres lewat task list. Kirim contact sheet stills sebelum render panjang.
- **Bahasa:** balas pengguna dalam bahasa mereka. Narasi boleh bahasa Indonesia atau Inggris. Kalau belum jelas, tanyakan sekali di Tahap 1.

## Tahap 1: Intake (selalu pertama)
- **Audio sudah dilampirkan** → lompat ke Tahap 4. Kalau naskah juga ada, pakai untuk timing. Kalau naskah tidak ada, minta teksnya sekarang juga (Claude tidak bisa mendengar audio; whisper biasanya tidak terpasang).
- **Belum ada audio** → tanya satu pertanyaan (AskUserQuestion, atau teks biasa kalau tool itu tidak ada): **"Mulai dari mana?"**
  - **Voiceover sudah siap** → minta di-upload, plus teks naskahnya kalau ada. Lanjut ke Tahap 4 saat file masuk.
  - **Sudah punya naskah, belum ada voiceover** → rapikan naskah sesuai Tahap 3 kalau perlu, kembalikan dengan tips rekaman, minta upload, lalu Tahap 4.
  - **Butuh ide dan naskah** → Tahap 2.
- Tanyakan juga target durasi (default 20-30 detik; 45-60 detik boleh) dan bahasa narasi kalau belum disebut. Gaya blok dipakai kecuali pengguna minta gaya card.

## Tahap 2: 10 ide video
Berikan tepat 10 ide dalam satu balasan, bernomor, lalu minta pengguna membalas dengan nomor (atau "lagi"). Tiap ide berisi:
- **Judul** (5-8 kata, memancing penasaran, mis. "Prajurit yang Tak Pernah Pergi").
- **Kalimat hook**: kalimat pertama yang diucapkan, berupa paradoks yang dinyatakan sebagai fakta ("Seorang pria menjual Menara Eiffel. Dua kali.").
- **Twist** dalam satu baris (akhir ironis yang menutup video).
- **Kenapa enak dianimasikan**: 2-3 momen visual besar (runtuh, terungkap, kejar-kejaran).
- **Fakta atau legenda**: sebut jelas apakah ini sejarah terdokumentasi, kisah yang masih diperdebatkan, atau cerita rakyat.

Ide yang pas untuk format ini:
- Satu kisah mengejutkan dengan sebab-akibat fisik yang bisa ditunjukkan.
- Tokoh orang biasa yang jelas, taruhan yang terus naik, dan twist di kalimat terakhir.
- Latar yang bisa dibangun dari balok + kit dunia: pulau, desa, pantai, kapal, pasar, sawah, jembatan, istana, lab (lihat 4.3).
- Campur ke-10 ide lintas era dan tema: kuno, abad pertengahan, 1800-an, modern, sains, hewan, penemuan, bencana, hukum aneh, kebetulan beruntung. Untuk penonton Indonesia, boleh sertakan beberapa kisah Nusantara.
- Untuk apa pun yang disajikan sebagai fakta, cek fakta kuncinya dengan web search sebelum ditawarkan. Jangan sajikan legenda viral sebagai fakta. Kalau pengguna tetap mau, bingkai sebagai "konon katanya".
- Tidak ada orang nyata yang masih hidup sebagai bahan lelucon, tidak ada yang sadis, tidak ada politik.

## Tahap 3: Naskah (setelah pengguna memilih)
Tulis narasinya saja (tanpa arahan panggung di teks yang diucapkan). Patokan panjang:

| Bahasa | Kecepatan | 20 dtk | 30 dtk | 60 dtk |
|---|---|---|---|---|
| Inggris | ±3,7 kata/dtk | ±75 kata | ±110 kata | ±220 kata |
| Indonesia | ±2,4 kata/dtk | ±50 kata | ±70 kata | ±145 kata |

Patokan untuk keduanya: ±5 suku kata per detik. Ini hanya perkiraan; durasi video selalu mengikuti rekaman aslinya.

Rumus:
1. **Hook** (kalimat 1, tanpa basa-basi): fakta absurdnya.
2. **Latar** dalam 1-2 baris: kapan, di mana, siapa, satu detail konkret.
3. **Eskalasi** 2-4 ketukan, makin lama makin besar. Orang lain ragu atau mengejek. Satu lelucon hiperbola.
4. **Misteri atau belokan**: "Tapi ketika..." / "Ternyata..." memperkenalkan penyebab sebenarnya, sering dengan analogi sehari-hari.
5. **Twist / payoff**: pendek, ironis, dan menjadi kata-kata terakhir video.

Pakai bahasa lisan yang natural, kalimat ±8-15 kata, angka ditulis sebagai kata ("tiga puluh", bukan "30"). Jangan mendeskripsikan hal yang sudah terlihat oleh penonton.

Lalu balas dengan:
- Naskah dalam blok yang bisa disalin, plus jumlah kata dan perkiraan durasi.
- Satu paragraf rencana visual (shot-shot yang akan dianimasikan).
- Tips rekaman: satu suara narator yang stabil dan hangat. ElevenLabs cocok (suara narator berat, speed ±1,05-1,1, stability ±45-55 %; untuk bahasa Indonesia pilih model multilingual). MP3 atau WAV. Beri jeda alami di akhir kalimat. Ekspor tanpa musik.
- Permintaan: **"Upload voiceover-nya kalau sudah siap, nanti saya buatkan videonya."**

Simpan teks naskah final; teks inilah yang menentukan timing di Tahap 4. Kalau pengguna merekam versi yang berbeda, minta teks finalnya.

## Tahap 4: Bangun video (setelah voiceover di-upload)
Kerjakan semuanya tanpa berhenti. Bertanya hanya kalau timing tidak bisa dipastikan, atau ada software yang perlu dipasang.

### 4.0 Persiapan
1. **Cek kebutuhan:** Node 22.6+, Python 3 + numpy + Pillow, ffmpeg + ffprobe, dan Edge atau Chrome. Playwright opsional: tanpa Playwright, `render.mjs` menjalankan Edge/Chrome yang terpasang lewat DevTools protocol (set `BROWSER=<path>` kalau tidak ketemu). Kalau ada yang kurang, sebutkan ke pengguna dan minta izin sebelum memasang software sistem (contoh Windows: `winget install Gyan.FFmpeg`).
2. **Buat project:** `bash <skill>/kit/tools/setup.sh ~/shorts/<slug>`. Gaya blok tidak butuh internet. Script ini menyalin `engine-blok/` + `motion.js` ke `web/`, `example/pulau/story.js` sebagai titik awal `web/story.js`, `audio.py` template, dan semua tools. (Gaya card: tambahkan argumen `card`; butuh internet sekali.)
3. Salin voiceover ke project sebagai `voice.mp3` (atau sesuaikan nama file di perintah berikut), dan naskah sebagai `script.txt` (UTF-8).
4. `<skill>/kit/` tetap baca-saja. Semua edit dilakukan di salinan project.

**Windows (Git Bash):** pakai `python`, bukan `python3` (setup.sh mencetak perintah Python yang benar). Jalankan file `.sh` dengan `bash`.

### 4.1 Timing
`python timing.py voice.mp3 script.txt --out work --lang id` (pakai `--lang en` untuk narasi Inggris).
- Kalau faster-whisper/whisper terpasang, dipakai word timestamp (model `base.en` untuk Inggris, `small` untuk bahasa lain). `--no-asr` memaksa pakai naskah walaupun whisper ada.
- Tanpa whisper: frasa naskah (dipotong di tanda baca) dicocokkan ke segmen ucapan hasil deteksi hening, dengan DP yang mencocokkan jumlah suku kata ke durasi.
- Tanpa whisper dan tanpa naskah, script keluar dengan `NO_ASR`: minta naskahnya.
- Cek `work/phrases.json`: jeda harus jatuh di akhir kalimat. Total frame = `frames30` = round(durasi × 30) → jadi `TOTAL` di `story.js`.

### 4.2 Shot plan (`work/PLAN.md`, sebelum menulis kode)
Satu baris per shot: frame, kata, latar, gerak kamera, karakter/pose/ekspresi, efek, dan cue SFX.
- Frame 0 sudah harus gambar hook.
- Biasanya satu shot per frasa. Gabungkan frasa yang sangat pendek ke shot berikutnya.
- Ilustrasikan setiap kalimat secara harfiah. Leluconnya dibawa oleh properti dan ekspresi.
- Variasikan ukuran shot: hook MCU → wide reveal → two-shot → insert close-up benda kunci → close-up reaksi → gerak lingkungan untuk payoff.
- Pakai suasana untuk ketukan cerita: siang untuk normal, sore keemasan untuk kemunduran atau drama, biru malam untuk penjelasan (lihat 4.3). Lompatan waktu dapat flash putih 6 frame.
- Kalimat twist dapat sting (musik berhenti, hentakan rendah, push-in dengan roll). Payoff fisik di shot terakhir jatuh tepat di kata terakhir.

### 4.3 Dunia (`web/story.js`, memakai `web/world.js`)
`main.js` generik; cerita hanya ditulis di `story.js`. `story.js` mengekspor fungsi murni dari nomor frame: `TOTAL`, `SHOTS`, `camAt(f)`, `dofAt(f)`, `sceneAt(f)`, `fxAt(f)`. Mulai dari `example/pulau/story.js` dan tulis ulang.
- `sceneAt(f)` → `{ sky, sea, layers: [jauh, utama] }`. Tiap layer = `{ islands, boats, foam, shadows, items: [{parts, pos, yaw, k, tilt}] }`. Layer digambar berurutan (yang jauh dulu). Di dalam layer: terrain → buih → bayangan → semua `items` diurutkan per sisi.
- **Kit dunia (`world.js`):** `island(I)` (blob pasir + blob rumput + jalan setapak + air dangkal + buih), `stiltHouse({wall, roof, shutter, door})`, `saung()`, `palm({h, lean, ph}, t)`, `bush(s)`, `rock(w, h, d)`, `pier(len, segs)`, `boat({sail, hull})` + buih lewat `boats`. Langit: matahari, awan, burung, gunung berapi berasap, dan pulau jauh, semuanya mengikuti arah kamera (`sky: {sunAz, sunEl, clouds, volcano:false, top, horizon}`). Laut: `sea: {far, mid, near}`.
- **Properti baru:** susun dari `box`, `cone`, `prismX` (atap pelana, layar), `extrudeY` (lambung, lantai) + `P(mesh, c, col, {pivot, rx, ry, rz, spin, decal, faceCol})`. Decal = fungsi canvas di ruang 0..100 per sisi (`front/back/left/right/top`; sisi `prismX` = `side0..`, `endL/endR`). Gaya decal: warna datar + garis gelap tipis, seperti `PROP_DECALS`.
- **Skala:** kepala = 1 unit, orang dewasa ±2,9, anak ±2,4, pintu ±3, rumah panggung ±7,6. Permukaan: laut 0, pasir 0,5, rumput 1,3, dek dermaga 1,06.
- **Suasana:** sore = `sky: {top:'#f0a36a', horizon:'#ffd9a0', sunCol:'#ffe2a8'}` + `sea: {far:'#f3c9a0', mid:'#d99a6e', near:'#5a5a8a'}` + overlay hangat lewat `fx.draw` (mis. `rgba(255,150,80,0.15)`); malam = langit biru tua + overlay `rgba(30,40,110,0.35)`.
- **Batas painter's algorithm** (engine mengurutkan per sisi, tanpa z-buffer):
  - Objek selalu digambar di atas terrain layer-nya, jadi jangan taruh objek di belakang tingkat terrain yang lebih tinggi (dari sudut kamera).
  - Hindari kotak besar yang saling menembus. Pecah lantai/dermaga panjang jadi beberapa segmen.
  - Jangan taruh kamera di dalam objek. Sisi di belakang kamera dipotong (near plane 0,3).

### 4.4 Pemeran (`web/blok.js`)
- **Preset `CAST`:** `prajurit`, `tani`, `ibu`, `kakek`, `anak` (k 0,82), `warga`. Karakter baru = salin preset lalu ubah field-nya: `skin, shirt, pants, shoes, hair, shorts, socks, skirt, skirtDecal, longSleeve, torsoDecal, faceOpts {blush, beard}, headExtra (ikut kepala, tanpa pivot), bodyExtra (diam), holdR/holdL [{mesh, c, col, decal}] (ikut lengan), pose (pose default), expr, k, name`. Contoh tema lokal: peci, blangkon, caping, kebaya, sarung, seragam merah-putih.
- **`human(spec, pose)`** → parts. Pose: `armL/armR {rx maju-mundur, rz ke samping}`, `legL/legR` (rx), `head {rx angguk, ry menoleh, rz miring}`, `bob`, `expr`, `blink`, `look` (−1..1), `open` (mulut untuk `talk`), `tear`, `hold:false`.
- **Ekspresi:** `neutral, happy, talk, laugh, surprised, stubborn, angry, sad, sleep`. Wajah digambar mata+alis → jenggot → mulut, jadi jenggot tidak menutupi mulut.
- **Helper:** `alive(f, seed)` (napas, kepala bergoyang, kedip; wajib untuk setiap karakter yang terlihat), `walkPose(phase)`, `wavePose(t, 'R'|'L')`, `mergePose(...)` (pose belakangan menimpa; `bob` dan sudut kepala dijumlah).
- **Test sheet:** `HASH=#sheet node render.mjs stills/sheet "0"` menampilkan semua preset. Render ulang setiap kali membuat karakter baru, lalu lihat hasilnya sebelum dipakai di shot.

### 4.5 Gerak: halus dan hidup (`web/motion.js`)
- **Kamera:** `camFromKeys(keys, f, {kicks})` dengan key `{f, pos, look, fov, roll (derajat)}`. Glide `M.smooth` (18-45 f), `ease: 'easeOut'` untuk reveal dan whip, `path` via-point untuk gerak melengkung. Setiap hold tetap merayap pelan; tidak ada yang diam 4 frame atau lebih. Roll 2-5° untuk drama, `kicks` untuk benturan.
- **Kontinuitas:** utamakan gerak bersambung (tarik mundur dari close-up ke wide, push ke objek, orbit pelan mengelilingi pulau). Hard cut hanya untuk lompatan tempat atau waktu, dengan flash (`fxAt(f).flash`).
- **Karakter tidak pernah beku:** `alive(f, seed)` di setiap karakter, seed berbeda per karakter.
- **Aksi:** antisipasi (`M.anticip`) → overshoot `M.back` → `M.spring` settle. Reaksi kaget = ganti `expr` + kepala `M.back` + lompatan kecil (`bob`). Tertawa = `laugh` + kepala miring bergantian.
- **Jalan:** `walk(f, f0, speed, stride)` → `walkPose(phase)`, lalu geser posisi sesuai `dist`. Hadapkan `yaw` ke arah jalan (yaw 0 = menghadap +z).
- **Gerak sekunder:** daun kelapa bergoyang (`palm(..., t)`), perahu naik-turun dan miring (`tilt`), awan dan asap bergerak, ombak berkilau, Zzz naik (`fxAt(f).zzz`). Selalu ada yang bergerak.
- **Lensa:** `dofAt(f)` → `{px, focus}`. Close-up/medium: `px` 3-7 (lapisan di belakang subjek diburamkan), wide: `px` 0. `focus` = jarak sepanjang sumbu kamera ke subjek (lihat `along()` di contoh).

### 4.6 Cek tampilan (sebelum render penuh)
Render stills di tengah setiap shot plus transisi dan aksi kunci: `node render.mjs stills/a "5,40,..."` lalu `python sheet.py stills/a stills/sheet_a.jpg`. Lihat sheet-nya dan perbaiki jebakan berikut:
- **Frame vertikal itu sempit:** setengah lebar horizontal = d·tan(hfov/2), dengan hfov = 2·atan(tan(vfov/2)·0,5625). Di jarak 4 dan fov 40, itu cuma ±0,8, jadi susun karakter ke arah kedalaman.
- Kepala/topi terpotong di close-up: arahkan `look` ±0,3 di atas mata dan beri ruang untuk lompatan kaget.
- Karakter melayang atau tenggelam: `pos[1]` harus sama dengan tinggi permukaan (lihat skala di 4.3).
- Sisi yang salah urutan (kotak saling tembus, objek di balik terrain lebih tinggi), atau aksesori menutupi wajah di close-up (mis. jenggot): geser atau pecah bagiannya.
- Subjek ikut buram: `focus` salah. Background tajam di close-up: `px` terlalu kecil.
- Teks/decal terbalik. Properti foreground terlalu dekat kamera (terpotong near plane).

Kirim sheet ke pengguna dengan ringkasan shot satu baris dan perkiraan waktu render (gaya blok ±1-4 detik/frame di PC biasa, ditambah ±40 detik untuk start browser; 20 detik video ≈ 10-40 menit), lalu langsung mulai render penuh. Kalau pengguna minta perubahan, hentikan render, perbaiki, dan render ulang frame yang terpengaruh.

### 4.7 Suara (`audio.py` → stem → `mix.py`)
Tulis ulang tabel cue (`place(...)`) untuk cerita baru; synth-nya tetap. `audio.py` hanya menulis stem (`music.wav`, `sfx.wav`) dan membaca durasi dari `work/phrases.json`.
- Musik: loop pendek ala mars (kick/snare, bass petik, pad brass). Berhenti di kalimat twist (`MUSIC_END`), lalu drone rendah berlanjut.
- SFX di event (waktu = frame/30): whoosh di gerak besar, thunk di hentakan, rumble+crash di runtuhan, scrape di logam, ting di reveal, sting di twist, creak, snap, splash, snore, daun, ambience air/ombak.
- Mix: `python mix.py voice.mp3 music.wav sfx.wav` → `mix_raw.wav`. Script ini menyetel musik tepat 50 % dari gated RMS suara (−6 dB) dan SFX maksimal 50 % dengan puncak dibatasi 0,7× puncak suara, lalu mencetak level terukur. Pastikan musik −6,0 dB terhadap suara dan SFX −6 dB atau lebih rendah.
- Kunci timing gambar sebelum membuat suara. Setiap perubahan timing = jalankan ulang `audio.py` dan `mix.py`.

### 4.8 Render + finishing
- `node render.mjs frames "0-<N-1>"` dengan Bash `run_in_background`, dipantau Monitor yang melaporkan progres (dicetak tiap 30 frame) dan menangkap error atau proses yang berhenti. Baris pertama menyebut renderer yang dipakai (`playwright` atau `devtools (msedge.exe)`). `RESUME=1` melanjutkan setelah terputus (frame yang sudah ada dilewati; aman karena setiap frame deterministik). Jangan jalankan Python berat bersamaan di mesin kecil.
- `bash finish.sh "Judul"`: mengukur loudness `mix_raw.wav`, memberi satu gain linear ke −14 LUFS + limiter −1 dBFS, encode H.264 CRF 17 + AAC 192k, cek freeze/black dan loudness, lalu menulis `out/qa_sheet.jpg`. Lihat sheet-nya. Bagian beku ≥0,4 detik atau frame hitam harus diperbaiki.
- Kirim MP4 dengan SendUserFile (atau sebutkan path-nya kalau tool itu tidak ada) plus beberapa baris tentang isi tiap shot. Tawarkan caption, revisi, atau ide berikutnya dari daftar.

## Arsitektur gaya blok (referensi saat mengedit kit)
- `web/index.html` memuat `main.js` (ES module) lewat server HTTP lokal yang dijalankan `render.mjs`. `index.html#f=120` menggambar satu frame saat dibuka; `#sheet` menggambar test sheet karakter.
- `main.js`: `renderFrame(f)` = `R.begin(camAt, dofAt)` → `sky` → `sea` → tiap layer (terrain, buih, bayangan, items, flush) → Zzz → `fx.draw` → grade (vignette, flash).
- `render.js`: kamera perspektif (pos/look/fov/roll), near clip, painter's sort per sisi, toon 2 tingkat terhadap `LIGHT`, tinta hitam (lebar mengikuti jarak, maks 7 px), decal affine per sisi, DOF 2 lapis (canvas `filter: blur`), slab terrain, scatter berseed.
- `blok.js`: math, mesh (`box, cone, prismX, extrudeY`), `P`, decal, `faceDecal`, `DECALS`, `human`, `alive/walkPose/wavePose/mergePose`, `CAST`.
- `world.js`: `sky, sea, island, blob, stiltHouse, saung, palm, bush, rock, pier, boat, boatFoam, PROP_DECALS`.
- `render.mjs`: Playwright kalau ada, kalau tidak Edge/Chrome via DevTools protocol → `renderFrame(f)` → `toDataURL('image/jpeg', 0.96)` → `frames/f0000.jpg`. Env: `RESUME=1`, `HASH=#sheet`, `WEB=<folder>`, `BROWSER=<path>`.
- `audio.py`: synth + tabel cue → stem. `mix.py`: kunci level gated RMS. `finish.sh`: gain loudness linear, limiter, encode, QA.
