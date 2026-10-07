# Verifikasi

## Mode Bebas, 7 Oktober 2026

- Toleransi bentuk pada Kanji Renshuu berurutan Bebas, Longgar, Normal, dan Ketat. Normal tetap pilihan awal. Bebas membandingkan seluruh bentuk tinta dengan contoh tanpa mencocokkan nomor stroke, arah, atau jumlahnya; tiga mode lama mempertahankan penilaian sebelumnya.
- Bentuk diselaraskan dengan satu transformasi ukuran/posisi per karakter. Jarak bentuk dibandingkan dua arah agar bagian yang hilang dan tinta yang tidak sesuai tetap terdeteksi. Luas jejak tinta unik juga dibatasi agar coretan rapat yang memenuhi kotak tidak diterima hanya karena dekat dengan garis contoh; menimpa garis yang sama tetap diperbolehkan.
- 38 tes Node dan build produksi lulus. Regresi Bebas mencakup urutan/arah terbalik, garis dipecah atau disambung, penimpaan garis, variasi kecil, bentuk mendatar/tegak, bagian utama hilang, tinta tambahan, input kosong/invalid/kecil, dan coretan rapat. Longgar, Normal, dan Ketat tetap menolak urutan/arah yang tidak sesuai.
- `tests/browser-free.js` lulus pada Chromium dengan viewport 1440×1000 dan 375×812. Uji pointer sintetis membuktikan tulisan terbalik ditolak oleh Normal lalu diterima oleh Bebas tanpa menggambar ulang, pilihan bertahan pada soal berikutnya, jawaban tercetak muncul setelah benar, Show answer mengunci kotak, Ulangi menulis membersihkan contoh, serta coretan acak ditolak. Tidak ada error aplikasi atau overflow horizontal.
- Pada masing-masing viewport, seluruh 314 karakter lokal menerima tiga variasi: bentuk sumber, stroke dipecah sekaligus dibalik arah/urutannya, serta bentuk sedikit digeser/diperkecil dengan jitter kecil (942 kasus positif). Pola zigzag acak yang sama ditolak untuk seluruh 314 contoh.
- Penilaian ini tetap pencocokan geometri, bukan OCR. Uji memakai jejak sintetis dari KanjiVG; belum merupakan pengukuran akurasi tulisan tangan pengguna nyata atau pengujian perangkat fisik.

## Default SFX On, 7 Oktober 2026

- Setiap pembukaan atau refresh halaman memulai SFX On. Nilai Off lama pada `kanji-uts-s5-sfx-v1` diabaikan; pengaturan kini hanya berlaku selama halaman terbuka dan tetap mengikuti pergantian mode. Audio tetap menunggu aksi pengguna untuk diaktifkan.
- 31 tes Node dan build produksi GitHub Pages lulus. Regresi mencakup startup dengan Off tersimpan, mematikan keenam SFX, menghentikan sumber aktif, pemulihan On, dan inisialisasi ulang setelah Off yang kembali memutar audio.
- gstack `/browse` pada 375×812 dengan audio asli: `tests/browser-sfx-settings.js` lulus meski storage lama berisi Off. Replay/retry/skip dan Show answer kedua mode tetap senyap saat Off; On memulihkan audio. Setelah memilih Off lalu refresh, kontrol kembali On sementara nilai lama di storage tetap Off.

## Pengaturan SFX On/Off, 6 Oktober 2026

- Kontrol On/Off dengan aria-pressed berada tepat di kanan Awal pada kedua mode, termasuk pilih TM, latihan, pilih kanji, dan hasil. Pilihan disimpan pada `kanji-uts-s5-sfx-v1`; Off menghentikan sumber aktif dan membatalkan permintaan pemutaran yang tertunda. Seluruh jalur suara (Web Audio, oscillator fallback, elemen Audio) mengikuti pengaturan, sedangkan animasi/penilaian tetap berjalan. Storage yang diblokir tidak menghalangi pengaturan saat halaman terbuka.
- 31 tes Node dan build produksi GitHub Pages lulus. Tes baru mencakup Off saat startup tanpa membuat konteks atau mengunduh audio, keenam SFX saat muted, pemulihan On, audio tertunda yang tidak boleh hidup kembali setelah Off→On, penghentian elemen Audio, dan storage diblokir.
- `tests/browser-sfx-settings.js` melalui gstack `/browse` lulus pada 375×812 dengan audio asli: suara aktif berhenti saat Off, replay/retry/skip dan Show answer kedua mode senyap, pergantian mode mempertahankan pilihan, serta On kembali memutar suara. Refresh setelah Off mempertahankan aria-pressed pada Off.
- `tests/browser-sfx-layout.js` lulus pada 280×720, 375×812, 768×1024, 820×1180, 950×800, 1180×820, dan 1440×900. Kedua mode pada empat jenis halaman memiliki SFX di kanan Awal, target minimal 44px, tanpa tabrakan judul/navigasi atau overflow horizontal. Screenshot header HP dan desktop diperiksa. Browser yang diuji adalah Chromium dengan viewport sintetis.

## SFX Ulangi Animasi +3 dB, 6 Oktober 2026

- SFX pengguna diproses dengan FFmpeg `volume=3dB` dan disimpan sebagai `public/sfx/replay.mp3` (MP3 256 kbps, stereo, 44,1 kHz). File sumber tidak diubah. Volumedetect pada audio hasil decode menunjukkan mean −30,3 menjadi −27,3 dB dan peak −16,5 menjadi −13,5 dB; jumlah sampel tetap 13.824. Gain Web Audio maupun elemen Audio adalah 1 untuk SFX ini.
- Tombol replay per kotak memakai suara baru; Show answer dan Ulangi menulis tetap memakai reveal.mp3. `tests/browser-sounds.js` melalui gstack `/browse` lulus pada 375×812: enam MP3 benar-benar terdecode, replay.mp3 diputar pada klik replay berulang, kotak tetap terkunci, dan suara benar/salah/show answer/retry/lewati/selesai serta switch TM tetap bekerja. Browser melaporkan durasi replay 0,15673 detik, dua kanal.
- 28 tes Node dan build produksi GitHub Pages lulus. Tes audio memeriksa gain Web Audio, fallback elemen Audio, penghentian sumber sebelumnya, dan penanganan audio yang diblokir. Verifikasi browser memakai Chromium.

## Ulangi menulis setelah Show answer, 6 Oktober 2026

- Tombol utama Ulangi animasi diganti Ulangi menulis setelah jawaban dibuka. Tombol ini membatalkan seluruh playback, menghapus shadow/jawaban dan coretan, serta membuka kembali semua kotak pada soal yang sama. Replay per kotak tetap tersedia saat jawaban ditampilkan. Help disimpan sepanjang soal agar membuka jawaban berulang tidak menggandakan jumlah bantuan dan hasil retry tidak dihitung sebagai benar tanpa bantuan.
- `tests/browser-writing-retry.js` lulus melalui gstack `/browse` pada 375×812 dan 820×1180: reset beberapa kotak saat animasi masih berjalan, soal/progres tidak berubah, reveal ulang dan replay lokal, tulisan referensi diterima setelah retry, Selanjutnya tetap manual, serta jumlah bantuan dan hasil sesi akurat.
- `tests/browser-animation-lock.js` lulus pada 375×812 untuk penguncian mouse/touch/pen, replay lokal bersamaan, retry yang membatalkan playback, input/penilaian aktif kembali, pergantian soal/TM, dan reduced motion. `tests/browser-writing-reset.js` lulus pada 1440×900 untuk pembersihan coretan aktif/tersimpan serta status salah. 28 tes Node dan build produksi GitHub Pages lulus; browser yang diuji adalah Chromium dengan viewport sintetis.

## Replay seluruh kata tanpa jeda awal, 6 Oktober 2026

- Ulangi animasi seluruh kata kini memulai stroke pertama dengan animation-delay 0 detik; urutan antar-stroke dan antar-kanji tetap sesuai. Show answer pertama dan replay per kotak mempertahankan jeda shadow 0,5 detik.
- `tests/browser-animation-lock.js` melalui gstack `/browse` lulus pada 375×812, termasuk delay awal nol, stroke pertama sudah bergerak setelah klik, urutan kanji berikutnya, replay per kotak, penguncian input, navigasi, dan reduced motion. 28 tes Node serta build produksi GitHub Pages lulus.

## Ulangi animasi per kotak, 5 Oktober 2026

- Setelah Show answer, setiap kotak mengganti alat undo/hapus dengan tombol Ulangi Animasi. Replay lokal hanya memulai ulang kanji yang dipilih, dengan jeda awal 0,5 detik; tombol replay seluruh kata mempertahankan urutan antar-kanji. Kotak tetap terkunci dan jawaban bantuan tidak dianggap benar. Status aria-busy melacak seluruh kanji yang masih beranimasi, termasuk replay lokal bersamaan.
- `tests/browser-animation-lock.js` lulus melalui gstack `/browse` pada 375×812 dan 1440×900: replay lokal berulang, kotak lain tidak diulang, replay bersamaan, seluruh replay, input mouse/touch/pen diblokir, navigasi soal/TM, dan reduced motion. `tests/browser-writing-reset.js` lulus pada 1440×900 untuk pembersihan coretan aktif/tersimpan serta error setelah reveal.
- Tombol replay muat dan memiliki target minimum 44px pada viewport 280×720, 375×812, dan 768×1024; screenshot desktop dan HP diperiksa. 28 tes Node dan build produksi dengan prefix GitHub Pages lulus. Verifikasi browser memakai Chromium dan viewport sintetis.

## Semua TM dan viewport foldable, 5 Oktober 2026

- Semua TM tersedia pada pemilihan sesi dan panel kedua mode. Gabungan mencakup 67 kelompok kanji: 415 soal Yomikata dan 416 soal Renshuu. Kosakata bersama antar-TM tidak digandakan; variasi bacaan yang diterima dan keanggotaan kelompok sumber tetap berlaku. Soal menampilkan asal TM, sedangkan daftar 67 kanji dalam panel memakai disclosure native.
- Semua 28 tes Node dan build produksi dengan prefix `/kanjiuts-sms5/` lulus. Dua tes data baru memeriksa gabungan semua pertemuan, kosakata lintas TM, scope per kanji, root di luar silabus, dan alternatif bacaan 紅葉.
- `tests/browser-all-tm.js` melalui gstack `/browse` lulus pada 1280×720: penyelesaian seluruh 415/416 soal tanpa soal berulang, sumber TM, hasil, review per kanji, ulangi sesi, pilihan 67 kanji, dan pergantian antara Semua TM/TM individual. Fixture memberi kesempatan React menyelesaikan pembaruan setiap klik dan memberi giliran event loop per 32 soal agar seluruh sesi dapat diperiksa dalam batas waktu browser CLI.
- `tests/browser-all-tm-layout.js` lulus untuk kedua mode pada 280×720, 375×812, 768×1024, 820×1180, 1180×820, dan 1440×900. Kartu, sesi, soal, panel, kotak tulis, dan pemilihan kanji muat tanpa scroll horizontal; tombol pilihan dan tindakan memiliki target sentuh minimum 44px. Screenshot menu HP dan latihan laptop diperiksa secara visual.
- Simulasi perubahan viewport 280→768px mempertahankan ID soal serta teks jawaban Yomikata. Coretan Renshuu tetap sama ketika viewport berubah 280→768px lalu berotasi ke 1180×820. Pengujian memakai viewport Chromium, bukan perangkat foldable fisik. Fixture tema juga lulus pada 1180×820, termasuk aksen baru Semua TM, warna tiap mode, glows, kontrol, dan pembaca buku.

## Kunci kotak setelah Show answer

- Show answer menghapus coretan lalu menjadikan seluruh kotak read-only untuk soal itu. Selesainya animasi hanya menghapus status busy; input tetap terkunci. Ulangi animasi tetap tersedia, Periksa tulisan/undo/hapus tidak dapat dipakai, dan Lewati membuka soal baru yang bisa ditulis. Jawaban yang sudah ditampilkan tidak dapat dinilai sebagai tulisan benar.
- `tests/browser-animation-lock.js` melalui gstack `/browse` lulus pada 375×812 dan 1440×900. Mouse/sentuhan/stylus ditolak selama dan setelah animasi, coretan aktif/tersimpan dibersihkan, replay mempertahankan lock, soal baru/TM membuka input, dan reduced motion tetap read-only. Fixture mempercepat playback lewat Web Animations API sambil menunggu event akhir CSS asli dan memeriksa delay/urutan sumber.
- Regresi Selanjutnya dan reset tulisan lulus pada 375×812; lima suara, jawaban benar/salah, reveal/replay, skip, hasil sesi, dan pergantian TM lulus pada 1440×900. Semua 26 pengujian Node dan build produksi dengan prefix Pages lulus.

## Tombol Selanjutnya pada Renshuu dan kanji putih pada pilihan TM

- Setelah jawaban Renshuu benar, soal/coretan/jawaban kanji tetap tampil. Show answer/ulangi animasi, Periksa tulisan, dan Lewati diganti satu tombol primer **Selanjutnya**; fokus keyboard berpindah ke tombol tersebut. Soal baru dan hasil pada soal terakhir dibuka hanya setelah tombol ditekan. Yomikata tetap menggunakan auto-advance sebelumnya.
- `tests/browser-writing-next.js` melalui gstack `/browse` memeriksa jawaban salah/benar, menunggu 1600ms tanpa perpindahan otomatis, coretan dan jawaban yang bertahan, satu tombol sukses, reset kontrol/soal saat lanjut, hasil pada soal terakhir, serta auto-advance Yomikata. Viewport 375×812, 820×1180, dan 1440×1000 lulus.
- Teks daftar kanji pada enam kartu pilihan TM memakai putih `#FFFFFF` melalui selector `.meeting-card .meeting-kanji`, berlaku untuk Yomikata dan Renshuu. Pemeriksaan computed style melalui gstack `/browse` lulus pada ketiga viewport tersebut, tanpa overflow horizontal.
- Vite mengabaikan direktori alat uji `.gstack` saat memantau perubahan agar runtime browser yang terkunci tidak menghentikan server pengembangan.

## Kompatibilitas browser dan beban animasi

- Build produksi menargetkan Safari 15.4+, Firefox 102+, Chrome/Edge 109+; batas kompilasi ini tidak berarti seluruh versi tersebut sudah diuji. `vh` mendahului `dvh`, glow memiliki fallback tanpa `color-mix`, observer/media query lama ditangani, dan pembaca memiliki fallback dialog/fokus/Esc. Navigasi memakai opsi scroll `auto` dengan default situs tanpa smooth scroll; skenario fallback juga menolak nilai scroll lain selain `auto`/`smooth`. Audio yang terinterupsi dicoba aktif kembali, sementara konteks tertutup dibuat ulang.
- Background tetap memakai shader dan resep Mesh drift pengguna. GPU budget maksimal 1 juta piksel, DPR 1,5, dan 30 fps. Dua tingkat adaptasi menurunkan budget menjadi 500 ribu lalu 250 ribu piksel dengan maksimal 20 fps; animasi menjadi statis bila frame tetap lambat. Animasi berhenti saat pointer menulis aktif, mode buku dibuka, reduced motion aktif, atau tab tersembunyi. Memperkecil drawing buffer merupakan salah satu pendekatan performa pada [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).
- Preview tulisan memakai RAF; titik yang lolos filter jitter tetap dikumpulkan, termasuk titik akhir pointerup. Fixture burst 200 pointermove menghasilkan satu pembaruan preview sebelum commit, mempertahankan 202 titik, dan membatalkan preview pada pointercancel/unmount/show answer. Geometri dan urutan stroke 国際連合 tetap diterima.
- **Chromium 148.0.7778.96 dan Firefox 150.0.2 lulus** pada build produksi, masing-masing pada viewport 375×812, 820×1180, dan 1440×1000 dengan DPR 2. Cakupan: jawaban baca salah/benar, terjemahan, preview/coretan, salah/shaking, reveal/replay, jawaban kanji di bawah kotak, lima MP3 decode/play, buku modal, zoom/pinch/drag, next/back, batas halaman, Esc/fokus, dan klik pertama Pas lebar dengan scrollbar klasik sintetis. Tidak ada error JavaScript atau overflow horizontal.
- Kedua engine juga lulus skenario API dibatasi: getContext melempar error, font eksternal gagal dimuat, storage diblokir, ResizeObserver tidak tersedia, matchMedia hanya memiliki addListener/removeListener, dan showModal tidak tersedia. Soal, coretan, fallback CSS, serta pembaca tetap bekerja; Esc menutup pembaca fallback.
- Probe WebGL melalui gstack `/browse` lulus untuk shader/uniform, animasi, reduced motion, tab hidden/resume tanpa lompatan fase, context loss/restoration, serta disposal GPU pada unmount. 26 pengujian Node dan build produksi lulus. Pengujian unit tambahan memeriksa buffer retina/4K, cap pada display 240 Hz, pause/resume, adaptasi beban berkelanjutan, GPU diblokir, dan pemulihan audio.

Sampel background pada 1440×1000/DPR 2 (headless Windows, bukan benchmark perangkat pengguna):

| Engine | Buffer sebelum | Buffer sesudah | Draw selama sampel sebelum | Draw selama sampel sesudah |
| --- | ---: | ---: | ---: | ---: |
| Chromium | 5.760.000 px | 499.472 px | 5 / 3,06 detik | 23 / 2,10 detik |
| Firefox | 5.760.000 px | 999.600 px | 242 / 2,01 detik | 50 / 2,04 detik |

Angka draw mengukur panggilan renderer, bukan jaminan FPS yang terlihat atau kecepatan setiap perangkat. Beban background maksimum berkurang sekitar 83% pada viewport ini, dan adaptasi Chromium menurunkannya sekitar 91%. Hasil mentah tersimpan di `.gstack/browser-engines-baseline.json` dan `.gstack/browser-engines-final-{chromium,firefox}.json`; screenshot tablet diperiksa. Runner memakai gstack browser skill dengan adaptor stream/PATH Windows, serta Playwright lokal untuk engine tambahan.

**Batas verifikasi:** WebKit 26.4 sempat membuka home build produksi, tetapi suite terhenti ketika runtime browser tertutup. Runtime awal kehilangan executable; pemasangan ulang dari CDN resmi dilakukan pada cache QA terpisah dengan validasi TLS memakai CA sistem. Percobaan berikutnya gagal dengan `spawn EBUSY` sebelum halaman bisa dibuka. Pengujian WebKit/Safari penuh belum lulus dan tidak diklaim sebagai hasil sukses. Tidak ada perubahan pengaturan keamanan Windows. Safari/iOS, Opera asli, dan perangkat fisik belum diuji; performa juga bergantung pada GPU/RAM, mode hemat daya, serta jaringan font. Bukti kegagalan runtime tersimpan di `.gstack/browser-engines-final-webkit.json`.

## Seluruh halaman responsif tablet

- Breakpoint 501–1366px memakai latihan satu kolom dengan header ringkas, soal lebih besar, kotak tulis sekitar 320px, serta panel TM/kanji yang lebih pendek. Menu portrait memakai kartu horizontal; layar lebih lebar tetap tiga kartu sejajar. Tombol utama, alat tulis, dan buku berukuran 48px; kontrol lain minimal 44px. Toolbar buku dapat membungkus dan layar penuh portrait memakai dua baris.
- `.gstack/audit-tablet.js` melalui gstack `/browse` lulus untuk 14 tampilan/alur pada masing-masing viewport 501×800, 600×960, 768×1024, 820×1180, 1024×768, 1024×1366, 1180×820, dan 1366×1024. Cakupan: home, pilihan TM/kanji, soal, show answer, hasil, repeat, switch TM, serta buku normal/layar penuh. Seluruh kontrol tablet minimal 44px, berada dalam lebar viewport, dan tidak ada overflow horizontal. Regresi 375×812 dan 1440×1000 juga lulus.
- Rotasi Renshuu dari 768×1024 ke 1024×768 mempertahankan ID soal, progres sesi, serta path coretan yang ternormalisasi. Rotasi pembaca layar penuh dari landscape ke portrait mempertahankan PDF 186 dan menyesuaikan Pas lebar secara otomatis; semua kontrol tetap dalam viewport. Fixture memakai pointer touch sintetis.
- `tests/browser-writing-reset.js` dan `tests/browser-draw.js` lulus pada 1024×768: area tulis sekitar 318px, pembersihan coretan/status salah serta animasi tetap sesuai, dan geometri 国際連合 diterima dengan jawaban tercetak di bawah masing-masing kotak.
- `tests/browser-book-fullscreen.js` lulus pada 768×1024 dan 1024×768 untuk modal, Pas lebar, zoom, pinch, drag, next/back, batas halaman, Esc/fokus, dan pembesaran otomatis. Pengujian Pas lebar dengan simulasi scrollbar klasik tetap stabil pada klik pertama (rentang perubahan lebar 0px). Seluruh 415 teks unik per mode muat pada tablet 768px dengan ukuran soal 68px/44px.
- Screenshot menu, latihan portrait/landscape, serta pembaca buku diperiksa. 20 pengujian Node dan build produksi lulus; tidak ada error console. Verifikasi ukuran/perilaku dilakukan pada Chromium dengan viewport tablet; perangkat tablet fisik/Safari belum diuji.

## Ukuran soal lebih besar di HP

- Soal pada viewport sampai 760px diperbesar: Yomikata 60–76px, hiragana Renshuu 40–52px. Kosugi Maru, bobot 500, glow, dan warna tetap sesuai; jarak huruf 0,025em serta text-wrap balance membantu soal panjang membungkus.
- Build produksi lulus. `.gstack/check-prompt-sizing.js` memeriksa 415 teks unik per mode tanpa overflow pada 320px (60/40px), 375px (67,5/45px), dan 1440px (72/39px; ukuran desktop sebelumnya). Screenshot soal kedua mode pada 375px diperiksa; tidak ada error console.

## Jawaban kanji di bawah kotak setelah benar

- Kanji Renshuu menampilkan karakter kanji tercetak di bawah setiap SVG kotak tulis setelah seluruh jawaban dinilai benar. Jawaban memakai Kosugi Maru 40px dan aksen jade pada panel gelap. Coretan pengguna tetap terlihat untuk perbandingan; navigasi serta waktu auto-next tetap mengikuti perilaku sebelumnya.
- Build produksi lulus. `tests/browser-draw.js` menerima fixture 国際連合 dan memeriksa empat jawaban 国・際・連・合 sesuai kotak, posisi di bawah area tulis, serta tidak ada overflow pada 1440×1000 dan 375×812. Screenshot kedua viewport diperiksa. Timer ditahan hanya melalui fixture QA saat mengambil screenshot.
- `tests/browser-writing-reset.js` lulus pada 375×812: tulisan salah tidak menampilkan jawaban benar; show answer tetap menghapus coretan/status salah dan tidak membuat jawaban dinilai benar. Tidak ada error console.

## TM langsung ke soal dan efek suara UAS

- Kartu TM dan perpindahan TM di sidebar langsung memulai seluruh soal TM tujuan pada kedua mode. Halaman pilihan kanji hanya dibuka melalui tombol Pilih kanji; akses per kanji di sidebar tetap tersedia. Klik TM aktif tidak mereset sesi. `tests/browser-sessions.js` lulus untuk sesi 窓, review/repeat, satu TM penuh, cakupan TM tujuan, dan klik TM aktif.
- Lima MP3 lokal pada `public/sfx/` identik berdasarkan SHA-256 dengan `latihankanjiUAS/public/sfx/`; semuanya tersedia dalam build produksi. Pemutaran memakai volume referensi (benar 0,65, lainnya 0,6), cache decode, aktivasi AudioContext pada tap awal, pembatalan suara lama, serta fallback nada/Audio.
- 20 pengujian Node dan build produksi lulus. Empat tes suara tambahan memeriksa preload/cache, volume, pembatalan pemutaran tertunda, berkas gagal dimuat, serta API/browser yang menolak audio tanpa mengganggu latihan.
- `tests/browser-sounds.js` melalui gstack `/browse` membuktikan kelima MP3 berhasil decode dan sumber audio diputar dalam konteks running. Salah/benar Yomikata, show answer, lewati, suara selesai setelah auto-next, serta pembatalan timer/suara saat ganti TM lulus pada 1440×1000 dan 375×812. Pemeriksaan ponsel juga menguji salah/benar melalui pointer Renshuu, replay, serta pembersihan coretan saat show answer. Pengujian viewport ponsel memakai Chromium; perangkat fisik/iOS dan kualitas suara lewat speaker belum diuji.
- `tests/browser-theme.js` lulus pada kedua viewport; tidak ada overflow horizontal atau error console. Dark mode, terjemahan, glow, ukuran teks, warna TM, stroke, dan portal buku tetap sesuai.

## Dua jalur sesi dan kotak tulis responsif

- Kedua mode menawarkan TM → satu kanji atau TM → semua kanji. Filter diuji terhadap seluruh 67 kelompok sumber, termasuk kosakata berulang, bacaan alternatif, dan penolakan kanji dari TM lain. Jumlah soal satu TM tetap utuh; keanggotaan kelompok tidak ditentukan dari kemunculan karakter dalam kata.
- Build produksi dan 16 pengujian Node lulus. `tests/browser-sessions.js` menyelesaikan sesi kanji 窓 (4 soal), ulangi soal, ulangi sesi, dan satu TM penuh pada kedua mode (TM 2: 77 Yomikata, 78 Renshuu). Pilihan kanji/TM tetap sesuai pada hasil dan sesi ulang.
- `tests/browser-theme.js` lolos pada 1440×1000 serta 375×812, termasuk navigasi tambahan, ukuran Inggris 24px, warna, tanda kutip, glow, pergantian TM, stroke, dan portal buku.
- `tests/browser-writing-reset.js` lolos pada 1440×1000, 768×1024, 375×812, dan 320×740. Area tulis persegi masing-masing sekitar 258, 258, 315, dan 260px tanpa overflow horizontal. Show answer menghapus stroke tersimpan dan stroke aktif pada empat kotak 国際連合, membersihkan status salah, menonaktifkan periksa saat kosong, lalu mempertahankan shadow serta animasi berurutan. Ulangi animasi juga menghapus coretan baru.
- Fixture geometri pada kotak ponsel menerima 国際連合 dengan urutan benar. Screenshot pilihan kanji desktop/ponsel dan Renshuu pada lebar 320/375px diperiksa. Pengujian pointer sintetis belum menggantikan pengujian stylus atau layar sentuh fisik.

## Arti bilingual pada kedua mode latihan

- Yomikata dan Kanji Renshuu menampilkan Inggris di atas dengan warna `#E56399` dan ukuran 20px. Indonesia tetap 16px italic berwarna `#06D6A0`, kini memakai tanda kutip “…” melalui elemen `q`.
- Build produksi berhasil. `tests/browser-theme.js` lolos pada 1440×1000 dan 375×812: isi Inggris tersedia pada kedua mode, warna/ukuran/italic/tanda kutip sesuai, urutan terjemahan benar, dan tidak ada overflow horizontal. Stroke, pergantian TM, glow soal, serta portal buku tetap lolos.
- Screenshot Kanji Renshuu ponsel diperiksa. Fixture tulisan memilih arti Indonesia secara spesifik agar tetap menemukan pasangan sumber setelah Inggris ditambahkan.

## Urutan dan tipografi terjemahan Yomikata

- Arti Inggris kini berada di atas (18px, `#EF476F`), arti Indonesia di bawah (16px italic, `#06D6A0`). Varian italic asli Sour Gummy dimuat untuk bobot 400; ukuran Inggris tetap lebih besar pada ponsel.
- Build produksi berhasil. `tests/browser-reading.js` lolos pada 1440×1000 dan 375×812 untuk urutan geometris, warna, ukuran, italic, kelengkapan terjemahan, serta pemeriksaan bacaan. Screenshot kedua viewport diperiksa.

## Terjemahan Yomikata Indonesia dan Inggris

- Seluruh 416 pasangan kosakata/bacaan memiliki arti Inggris lokal. Kunci tulisan+bacaan mempertahankan perbedaan homograf seperti 紅葉. Pemeriksaan kelengkapan ditambahkan pada tes bank yang sudah ada; 15 pengujian Node dan build produksi lulus.
- `tests/browser-reading.js` melalui gstack `/browse` lolos pada 1440×1000 dan 375×812. Arti Indonesia tampil dengan `rgb(6, 214, 160)` / `#06D6A0`; arti Inggris di bawahnya dengan `rgb(239, 71, 111)` / `#EF476F`. Isi terjemahan sesuai bank dan atribut bahasa `id`/`en` tersedia.
- Screenshot kedua viewport diperiksa. Bacaan benar tetap diterima dan maju; seluruh bacaan sumber lolos, sedangkan kesalahan dakuten/kana kecil tetap ditolak.
- Terjemahan tambahan hanya ditampilkan pada Yomikata. Kanji Renshuu tetap memakai paragraf arti Indonesia sebelumnya.

## Mesh drift WebGL dalam dark mode

- Pipo diganti shader Mesh drift yang diberikan pengguna. Fragment shader dipertahankan utuh; dark mode memakai lapisan CSS `rgba(9, 15, 26, 0.6)`. Uniform packed, seed 1453, clock ×0,73, serta cursor nonaktif mengikuti ekspor.
- `tests/browser-mesh.js` melalui gstack `/browse` lolos pada 1440×1000 DPR 1 dan 375×812 DPR 3. Buffer masing-masing 1440×1000 dan 750×1624 menunjukkan cap DPR 2. Shader berhasil dikompilasi/link, menggambar satu triangle tanpa GL error, dan menghasilkan frame berbeda saat waktu berjalan.
- Reduced motion, mount awal statis, pergantian mode tanpa reset canvas, tab tersembunyi, serta resume tanpa loncatan waktu lolos. Simulasi kehilangan/pemulihan konteks WebGL menunjukkan fallback lalu pembangunan ulang GPU. Unmount StrictMode melepaskan program/buffer; WebGL yang tidak tersedia menampilkan radial CSS.
- `tests/browser-theme.js` lolos di desktop dan ponsel: dark surfaces, glow dan bobot soal, enam warna TM, stroke, portal pembaca, serta target sentuh tetap sesuai. Tidak ada overflow horizontal; screenshot kedua viewport diperiksa.
- Build produksi dan 15 pengujian Node lulus. Empat tes renderer Pipo yang sudah dihapus digantikan pengujian integrasi WebGL di browser. Uji kontras mempertahankan ambang 4,5:1, termasuk teks terang di atas batas warna mesh.
- Pengujian GPU memakai Chromium lokal dan simulasi DPR, bukan pengukuran performa pada ponsel fisik.

Bagian berikut merupakan catatan historis sebelum Mesh drift.

## Dark mode dan glow soal

- Build produksi berhasil; 19 pengujian Node lulus. Pemeriksaan kontras mencakup aksen mode/TM pada bidang gelap, label gelap pada tombol aktif, teks utama/sekunder, serta feedback benar/salah dengan ambang 4,5:1.
- gstack `/browse`: `tests/browser-theme.js` lolos pada 1440×1000 dan 375×812. Panel, kontrol native, input, kotak tulis, portal pembaca, dan warna tiap mode sesuai dark mode; enam aksen TM dan target alat tulis 44px tetap tersedia. Tidak ada overflow horizontal.
- Soal kedua mode memiliki bobot terhitung 500, stroke teks tipis, dan text-shadow sesuai aksen. Screenshot desktop dan ponsel diperiksa untuk keterbacaan, glow, bidang tulis, dan pembaca malam.
- Renderer Pipo tetap memakai palet, geometri, clock, dan gerakan sebelumnya. Lapisan gelap diterapkan setelah canvas/grain. Filter slide buku statis memakai invert tanpa blur.
- Regresi Yomikata menerima `申し込む` dan seluruh bacaan sumber; kesalahan dakuten/kana kecil ditolak. Renshuu menerima jejak acuan `側面`; Show answer menampilkan 20 shadow/path berurutan dengan jeda awal 0,5 detik dan lapisan tulisan terpisah.
- Pembaca layar penuh, cubit, seret, navigasi, penutupan/fokus, dan perluasan otomatis lolos pada 375×812. Pas lebar stabil pada 1920×954 (365%) dan 375×812: rentang perubahan lebar 0px, klik kedua identik, termasuk simulasi ruang scrollbar klasik.
- Gesture dan tulisan diuji melalui pointer sintetis; batas kalibrasi tulisan tangan di bawah tetap berlaku.

Bagian berikut merupakan catatan historis sebelum dark mode.

## Pipo / Bloom Field

- Ribbon Field diganti Bloom Field dengan palet tetap Apricot `#E6B093`, Sky blue `#A3CEFF`, Paper `#FAF9EF`, dan backdrop `#FAF8EE`. Mode latihan mempertahankan aksen indigo/jade/terracotta serta enam penanda TM.
- Build produksi berhasil; 19 pengujian Node lulus. Empat pengujian Bloom menggantikan pengujian Ribbon: titik fase nol, rumus gerakan pada waktu pecahan, fase seed statis/kontinuitas, komposit radial dan lapisan blur, serta grain deterministik.
- gstack `/browse`: `tests/browser-bloom.js` lolos pada 1440×1000 dan 375×812. Animasi menghasilkan frame berbeda; reduced motion, mount awal dengan reduced motion, visibility, dan cleanup StrictMode lolos. Pergantian mode mempertahankan canvas, fase, dan palet Pipo tanpa menyalakan ulang animasi yang dihentikan.
- Grain overlay memakai opacity 0,305 dan tile 120×120. Buffer desktop 414×287 dengan lapisan blur 552×425; ponsel 172×374 dengan lapisan 394×596. Median pengiriman perintah gambar sekitar 3 ms pada browser lokal; pengukuran ini tidak mencakup seluruh biaya komposit layar atau perangkat ponsel fisik.
- `tests/browser-theme.js` lolos pada desktop dan ponsel: aksen mode, pergantian TM, stroke jade, warna portal buku, dan target alat tulis 44px tetap sesuai. Screenshot kedua ukuran diperiksa; tidak ada overflow horizontal. Teks di atas gradien memakai tinta gelap.
- Regresi klik pertama Pas lebar tetap lolos pada 1920×954 (365%) dan 375×812: rentang perubahan lebar 0px, klik kedua identik.

Bagian berikut mencatat pengujian sebelumnya; renderer Ribbon sudah diganti oleh Bloom.

## Rombak palet kertas dan tinta Jepang

- Build produksi berhasil; 19 pengujian Node lulus. Pengujian kontras baru memeriksa seluruh warna mode dan TM terhadap panel, kertas, bidang lembut, dan label tombol putih dengan ambang WCAG AA 4,5:1.
- gstack `/browse`: `tests/browser-theme.js` lolos pada 375×812, 768×1024, 1024×900, dan 1440×1000. Yomikata indigo, Renshuu jade, dan Baca Buku terracotta; enam penanda TM berbeda. Pergantian TM mempertahankan identitas mode. Kanji prompt, CTA, stroke animasi, dan portal buku memakai palet yang sesuai. Tombol undo/hapus menyediakan target 44×44px; dokumen tidak meluap horizontal.
- Tampilan diperiksa dari screenshot keempat ukuran. Kartu desktop memiliki preview dan tombol bawah yang sejajar, termasuk ketika teks membungkus pada 1024px. Font Kosugi Maru tetap dipakai pada aksara Jepang.
- `tests/browser-ribbon.js`: animasi, reduced motion, mount dengan reduced motion, visibility, dan cleanup StrictMode lolos. Pergantian mode saat animasi berhenti mewarnai ulang frame tanpa menyalakan kembali loop atau mengganti canvas. Buffer desktop 509×353; median render 4 ms dan p95 4,7 ms pada browser pengujian lokal.
- Regresi Yomikata menerima bacaan yang benar; Renshuu menerima contoh stroke `両手`. Urutan tertukar pada `割り込む` ditolak, kotak memakai border kesalahan `rgb(177, 63, 75)` dan animasi `shake-box`. Show answer tetap menampilkan shadow dahulu, dengan stroke berurutan dan tinta jade.
- Seluruh 25 slide, batas navigasi, keyboard, dan zoom buku lolos. Regresi modal, cubit, seret, penutupan/fokus, dan perluasan otomatis lolos pada desktop dan 375px. Regresi klik pertama Pas lebar lolos pada 1920×954 (365%) serta 375×812: rentang perubahan lebar 0px dan klik kedua identik, dengan simulasi ruang scrollbar klasik.
- Console browser tidak mencatat error aplikasi selama pengujian pergantian tema. Gesture dan jejak tulisan masih memakai fixture pointer sintetis; belum diuji ulang dengan perangkat sentuh fisik.

## Stabilitas klik pertama Pas lebar

- Reproduksi pada viewport 1920×954, sekitar 368%: simulasi scrollbar klasik 16px menyebabkan ukuran gambar bergantian antara 1856,95 dan 1896px pada implementasi sebelumnya. Chromium headless menyembunyikan scrollbar native, sehingga regresi memodelkan ruang scrollbar menggunakan border viewport yang berubah ketika isi meluap.
- Setelah perbaikan, rentang perubahan lebar setelah penyesuaian scrollbar adalah 0px; klik kedua menghasilkan ukuran identik. Gambar mengikuti lebar isi viewport langsung, tanpa loop perhitungan zoom dari tinggi yang dipengaruhi scrollbar.
- `tests/browser-book-fit-stability.js` lolos pada desktop 1920×954 dan ponsel 390×844. Regresi pembaca penuh, cubit, seret, tombol zoom, next/back, keyboard, seluruh 25 slide, dan penutupan dialog lolos. Build dan 18 pengujian Node lulus.

## Pembaca buku layar penuh

- Build produksi dan 18 pengujian Node lulus setelah perubahan pembaca.
- gstack `/browse`: dialog modal memenuhi viewport 1440×1000, 390×844, dan 844×390. Latar terkunci saat membaca; fokus masuk ke dialog dan kembali ke tombol Layar penuh setelah ditutup.
- Tombol + dari kartu membuka viewport pada 200%. Pas lebar mengisi lebar layar; Pas halaman mereset ke 100%. Uji cubit dua pointer memperbesar gambar, seret mouse menggeser gambar, serta pergantian halaman mempertahankan zoom dan mereset posisi geser. Gesture diuji dengan pointer sintetis; belum diuji pada perangkat sentuh fisik.
- Next/back, batas halaman terakhir, pilihan halaman, dan zoom tetap bekerja dalam dialog. Event cancel dan tombol Escape browser asli menutup pembaca, mengembalikan scroll latar, serta mempertahankan halaman.
- Uji regresi seluruh 25 slide, keyboard, next/back, batas halaman, dan zoom lolos. Tidak ditemukan overflow horizontal dokumen pada viewport yang diuji; area gambar dapat digeser setelah diperbesar.

## Gradien Ribbon Field

- 18 pengujian Node lulus: 14 pengujian sebelumnya, ditambah empat pengujian fase awal, interpolasi warna, kesesuaian renderer terhadap rumus gelombang, serta grain deterministik. Build produksi berhasil.
- gstack `/browse`: animasi menghasilkan gambar berbeda antarwaktu; reduced motion menghentikan render baik saat mount awal maupun saat preferensi berubah. Simulasi visibility menghentikan dan melanjutkan render. Unmount dalam React StrictMode membatalkan frame berikutnya.
- Desktop 1440×1000 dan viewport ponsel 390×844 diperiksa secara visual. Tidak ada overflow horizontal; canvas `aria-hidden` dan `pointer-events: none`.
- Buffer desktop 509×353: median waktu penghitungan piksel 4,4 ms; p95 9,3 ms. Viewport ponsel 288×624: median 4,1 ms; p95 6,1 ms. Ini pengukuran browser pengujian pada komputer lokal, bukan benchmark perangkat ponsel nyata; tidak termasuk biaya komposit layar.
- Uji regresi browser: Yomikata menerima bacaan; Renshuu menerima jejak acuan `風景` dan maju; Show answer menampilkan 18 shadow/path animasi untuk `団結する` secara berurutan. Seluruh 25 slide, batas next/back, keyboard, dan zoom buku tetap lolos.

## Pembaca buku dan tema baru

- Seluruh 25 slide 180 dpi berhasil dimuat pada browser desktop dan ponsel. PDF yang disertakan identik byte-per-byte dengan sumber yang dirender, diverifikasi SHA-256.
- Next/back, batas halaman 185/209, pilihan halaman, tombol panah, zoom, dan Pas halaman lolos uji browser. Tombol panah tidak mengganggu select. Halaman baru bergulir ke kartu pembaca agar halaman dan tombol navigasi tetap terlihat.
- Dua pengujian asset buku lulus, melengkapi 12 pengujian bank dan tulisan yang tetap lulus.
- Tema memakai lima warna pilihan pengguna, pola header/nav/kartu dari UAS, serta panel TM pada desktop. Mode tulisan tetap menerima input dan maju setelah benar pada tema baru.
- Browser diuji pada desktop 1365px dan ponsel 390px, tanpa overflow horizontal pada pembaca buku.

## Verifikasi awal bank dan penilaian

- Pada implementasi awal, `npm test`: 12 pengujian lulus. Mencakup kelengkapan bank dari 431 kemunculan sumber, pemetaan TM, ID unik, pengulangan lintas TM, 314 asset lokal, geometri, arah, urutan, stroke kurang/lebih, input kosong, coretan, dan getaran pointer kecil.
- `npm run build`: berhasil. Asset produksi berada di `dist/`.
- gstack `/browse`: seluruh 314 karakter menerima contoh asli serta contoh yang diperkecil/digeser dengan getaran kecil. Seluruh varian uji yang membalik stroke pertama atau menukar dua stroke pertama ditolak.
- Integrasi React dengan jejak pointer sintetis: tulisan `婚約者` dengan urutan tertukar ditolak dan kotak mendapat animasi `shake-box`; versi sesuai diterima dan maju otomatis ke soal 2.
- Show answer: layer shadow dan tinta terpisah, seluruh path tersedia, stroke pertama tertunda 0,5 detik, delay meningkat berurutan lintas kotak.
- Yomikata: seluruh bacaan yang diterima dari bank lolos. Kesalahan dakuten dan kana kecil ditolak. Jawaban salah menampilkan feedback dan shaking; jawaban benar maju otomatis.
- Progres yang dijawab benar tetap muncul setelah reload. Sesi 77 soal TM 2 selesai dan tombol ulangi memulai kembali daftar yang dilewati.
- Tampilan diperiksa pada desktop dan lebar ponsel 390 px; pemilihan TM juga diperiksa pada 320 px. Tidak ditemukan overflow horizontal atau error console aplikasi.

## Batas pengujian

Jejak pointer integrasi dibuat dari path acuan, dengan shim pointer capture untuk event sintetis. Uji ini memeriksa sambungan UI dan algoritme; belum menggantikan pengujian dengan tulisan tangan pengguna nyata, stylus, atau perangkat layar sentuh. Ambang geometri perlu dikalibrasi jika bentuk tulisan alami terlalu sering diterima atau ditolak. Tidak ada klaim akurasi OCR atau nilai ujian resmi.

Script `tests/browser-*.js` dijalankan melalui `browse eval` pada server pengembangan. Script geometri menggunakan import langsung dari modul Vite. Asset JSON produksi dan lisensinya sudah disertakan dalam build.
