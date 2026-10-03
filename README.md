# Kanji UTS semester 5

Latihan berdasarkan 67 kelompok kanji pada PDF halaman 185–209 dan pembagian TM 2–7 pada daftar kelas. Data berisi 431 kemunculan kosakata, 416 pasangan tulisan/bacaan unik. Pengulangan lintas TM tetap mempertahankan keanggotaan setiap TM.

## Menjalankan

```sh
npm install
npm run dev
npm test
npm run build
```

Buka http://127.0.0.1:5199. Build produksi tersedia di `dist/`.

Dependency lokal sudah terpasang. Hasil pengujian dan batasnya tercatat di [VERIFICATION.md](./VERIFICATION.md).

## GitHub Pages

Alamat rilis: [Fzz90.github.io/kanjiuts-sms5](https://Fzz90.github.io/kanjiuts-sms5/).

Push ke branch `main` menjalankan `.github/workflows/pages.yml`: install dependency dengan `npm ci`, jalankan tes, build, lalu deploy ke Pages. Jalur dasar mengikuti metadata Pages; gambar buku, PDF, stroke, dan suara memakai prefix yang sama. Build lokal tetap menggunakan `/` secara default. Untuk build subfolder secara manual, tetapkan `PAGES_BASE_PATH=/kanjiuts-sms5/` sebelum menjalankan `npm run build`.

## Alur

1. Pilih **Yomikata**, **Kanji Renshuu**, atau **Baca Buku**.
2. Pilih TM 2–7 untuk langsung mulai seluruh soal TM tersebut. Pergantian TM di sidebar juga langsung membuka soal TM tujuan. Latihan **satu kanji** tersedia lewat tombol kanji di sidebar atau **Pilih kanji**; kartu kanji menampilkan jumlah soal dan progres sesuai kelompok sumber di buku.
3. Yomikata: baca jukugo, ketik hiragana, periksa jawaban. Arti Inggris berwarna `#E56399` tampil lebih besar (24px) di atas arti Indonesia italic berwarna `#06D6A0` (16px) dengan tanda kutip. Romaji dikonversi menjadi hiragana; variasi bacaan dari sumber diterima.
4. Kanji Renshuu: baca hiragana serta arti Inggris dan Indonesia dengan susunan/warna yang sama seperti Yomikata, tulis setiap kanji pada kotak kosong, kemudian periksa. Bentuk, posisi relatif, arah, jumlah, dan urutan stroke dinilai dari jejak pointer. Okurigana sudah ditampilkan.
5. **Show answer** menghapus seluruh coretan dan status salah, lalu menampilkan shadow serta animasi stroke berurutan untuk seluruh kata. Semua kotak dikunci sampai stroke terakhir seluruh kata selesai; setelah itu pengguna bisa menulis kembali. **Ulangi animasi** juga membersihkan coretan baru dan mengunci selama pemutaran. Kotak berukuran sekitar 260px pada desktop dan memenuhi lebar kartu sampai 320px pada ponsel; okurigana tetap mengikuti kotak kanjinya.
6. Jawaban salah menggoyangkan kotak. Setelah seluruh tulisan dinilai benar, jawaban kanji tercetak muncul di bawah setiap kotak agar bisa dibandingkan dengan coretan. Pada Renshuu, soal tetap tampil; Show answer/ulangi animasi, Periksa tulisan, dan Lewati diganti satu tombol **Selanjutnya**. Tekan tombol tersebut untuk melanjutkan soal atau membuka hasil pada soal terakhir. Yomikata tetap maju otomatis setelah feedback singkat. Soal yang memakai bantuan dicatat terpisah.
7. Efek suara benar, salah, show answer/ulangi animasi, lewati, dan sesi selesai memakai lima MP3 yang sama dengan proyek UAS, tersimpan lokal di `public/sfx/`. File dipramuat dan AudioContext diaktifkan pada tap latihan/TM agar suara selesai juga dapat diputar setelah auto-next. Aksi baru menghentikan suara sebelumnya; pergantian TM membatalkan pemutaran yang masih menunggu. Jika MP3 gagal dimuat, nada sintetis memakai frekuensi fallback referensi UAS; browser tanpa Web Audio memakai elemen Audio. Pembatasan suara browser tidak menghambat latihan.

Nilai menggunakan pencocokan geometri terhadap KanjiVG, bukan OCR umum atau model AI. Tulisan tangan harus mendekati susunan dan urutan contoh. Variasi tulisan alami tetap dapat menghasilkan salah terima/tolak; kalibrasi dengan pengguna nyata diperlukan sebelum menjadikannya penilaian formal. Tombol undo dan hapus memungkinkan koreksi input tanpa mengganti soal.

Progres tersimpan pada browser perangkat ini, terpisah antara baca dan tulis, per kosakata. Progres yang sama terlihat saat kosakata dilatih per kanji atau satu TM penuh. Mode ulangi salah dan ulangi sesi mempertahankan cakupan kanji/TM yang dipilih. Pengaturan sensitivitas memberi tiga toleransi bentuk; aturan urutan dan jumlah stroke tetap berlaku.

**Baca Buku** menampilkan seluruh 25 halaman PDF asli (185–209) sebagai slide. Gunakan Kembali/Berikutnya, pilihan halaman, atau tombol panah keyboard. Tombol **Layar penuh** membuka pembaca yang memenuhi viewport; tombol **+** dari tampilan biasa langsung membuka layar penuh pada 200%. Di layar penuh, zoom dengan +/− atau cubit dua jari, lalu seret/geser halaman. **Pas lebar** memakai lebar layar, **Pas halaman** menampilkan halaman utuh. Zoom tersedia sampai setidaknya 400%, menyesuaikan bila layar lebar membutuhkan pembesaran lebih besar untuk Pas lebar. **Tutup** atau Esc kembali ke tampilan biasa tanpa mengganti halaman. Halaman terakhir disimpan di browser. PDF asli bisa dibuka pada halaman yang sedang dibaca. Gambar slide dirender pada 180 dpi dan tersedia lokal di `public/book/pages/`.

## Desain

Seluruh situs memakai dark mode: latar slate, panel dan bidang tulis gelap, serta teks terang. **Yomikata** memakai indigo `#AFC5FF`, **Kanji Renshuu** jade `#8DDFC3`, dan **Baca Buku** apricot `#F0BB9E`. Ikon, tombol, fokus, progres, dan animasi stroke mengikuti mode. TM 2–7 juga memiliki enam warna penanda berbeda pada kartu, chip sesi, serta pilihan TM. Soal kedua mode latihan mendapat glow sesuai aksen dan bobot font naik satu tingkat; stroke teks tipis mempertebal Kosugi Maru yang hanya menyediakan bobot asli 400.

Susunan mengikuti referensi `latihankanjiUAS`: header tengah, navigasi mode, kartu membulat, dan panel TM di kanan pada desktop lebar. Sour Gummy untuk UI dan Kosugi Maru untuk aksara Jepang. Ponsel memakai susunan satu kolom. Teks aksen dan label tombol memenuhi kontras 4,5:1; alat tulis menyediakan target sentuh 44px. Detail ada di [DESIGN.md](./DESIGN.md).

Pada layar sampai 760px, soal Yomikata memakai ukuran responsif 60–76px, hiragana Kanji Renshuu 40–52px. Pada lebar 375px masing-masing 67,5px dan 45px. Jarak huruf dipadatkan menjadi 0,025em dan baris panjang diseimbangkan agar teks tetap besar tanpa overflow.

Tablet dan split screen pada lebar 501–1366px memakai area latihan satu kolom hingga 1024px, dengan panel TM/kanji ringkas di bawah soal. Kotak tulis sekitar 320px dapat berjajar dua per baris, lalu membungkus pada layar lebih sempit. Header latihan dipadatkan, tombol utama/alat tulis/buku diperbesar menjadi 48px, dan pilihan kanji tetap mengikuti kelompok sumber. Menu awal memakai kartu horizontal pada lebar di bawah 950px; layar lebih lebar menampilkan tiga kartu sejajar. Ukuran soal tablet di atas 760px adalah 68–84px untuk Yomikata dan 44–56px untuk Renshuu. Toolbar buku dapat membungkus; pembaca layar penuh pada tablet portrait memakai dua baris supaya pilihan halaman, zoom, dan tutup tetap terjangkau. Rotasi layar mempertahankan soal, coretan, progres sesi, serta halaman buku.

Latar memakai **Mesh drift** dari ekspor 21st.dev Shader Builder pengguna: perpaduan ungu, cyan, dan biru dengan lapisan gelap. Fragment shader dan uniform resep dipertahankan, dirender oleh WebGL1 tanpa library melalui satu fullscreen triangle. Background dibatasi 1 juta piksel, DPR maksimal 1,5, dan maksimal 30 fps. Jika frame terus lambat, anggaran diturunkan menjadi 500 ribu lalu 250 ribu piksel dengan maksimal 20 fps; perangkat yang tetap kewalahan mempertahankan frame statis. Batas ini hanya untuk background, bukan teks atau kotak tulis. Cursor effect nonaktif. Reduced motion, tab tersembunyi, pena aktif, serta mode Baca Buku menghentikan animasi; pergantian mode mempertahankan canvas dan clock. Tersedia fallback CSS untuk GPU yang tidak tersedia/menolak akses serta pemulihan konteks GPU. Slide buku juga memakai filter malam statis, tanpa mengubah berkas PDF atau gambar asli.

Preview coretan diperbarui melalui requestAnimationFrame, maksimal sekali per frame. Titik pointer tetap dikumpulkan lengkap untuk penilaian; pointerup mempertahankan titik akhir, sementara pointercancel, show answer, dan pergantian soal membatalkan preview yang masih menunggu.

## Kompatibilitas browser

Target build: Safari 15.4+, Firefox 102+, Chrome/Edge 109+, serta browser Chromium sekelas Opera versi modern. Ini batas target kompilasi/API, bukan daftar versi yang sudah diuji satu per satu. Ukuran viewport memakai fallback `vh` sebelum `dvh`; efek glow punya fallback tanpa `color-mix`. Media query lama dan ketiadaan ResizeObserver tetap ditangani. Pembaca menyediakan fallback dialog dengan Esc dan siklus fokus. AudioContext yang terinterupsi dicoba aktif kembali, dan konteks tertutup dibuat ulang; penolakan audio tidak menghentikan latihan.

Build produksi lulus pengujian otomatis melalui runner browser gstack dengan Chromium dan Firefox pada Windows. Percobaan WebKit sempat membuka halaman awal, tetapi suite terhenti lalu runtime Windows gagal diluncurkan karena `EBUSY`; Safari/WebKit belum lulus uji penuh. Safari asli/iOS, Opera asli, dan perangkat fisik belum diuji. Detail versi, hasil, serta batas pengukuran performa ada di [VERIFICATION.md](./VERIFICATION.md). Kecepatan akhir tetap dipengaruhi GPU, RAM, browser, mode hemat daya, dan koneksi untuk font; fallback font sistem tersedia bila Google Fonts gagal dimuat.

```text
Awal: [Yomikata] [Kanji Renshuu] [Baca Buku]
Latihan: pilih TM -> seluruh soal TM; sidebar / Pilih kanji -> soal satu kanji
Buku: halaman PDF -> kembali/berikutnya + zoom
```

## Sumber dan lisensi

Kosakata: file PDF pengguna *KANJI LOOK AND LEARN (Halaman PDF 185-209)*; transkripsi lengkap disimpan di `src/data/source-vocabulary.json`. Nama mahasiswa pada gambar daftar kelas tidak dimasukkan.

Terjemahan Inggris tambahan disimpan lokal di `src/data/english-meanings.json`, meliputi seluruh 416 pasangan tulisan/bacaan. Kunci menggabungkan tulisan dan bacaan agar homograf seperti 紅葉 memiliki arti yang sesuai. Rebuild bank tetap memakai transkripsi sumber; terjemahan Inggris digabungkan saat bank dimuat aplikasi.

Stroke: [KanjiVG](https://kanjivg.tagaini.net/), copyright Ulrich Apel, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). JSON lokal merupakan konversi SVG yang mempertahankan path dan urutan; atribusi ditampilkan pada aplikasi dan `public/KANJIVG-LICENSE.txt`. Revisi sumber dikunci di `public/strokes/manifest.json`. Seluruh 314 karakter pada kosakata memiliki asset lokal, termasuk 々.

Tidak memerlukan layanan pengenal tulisan eksternal. Data tulisan tidak dikirim ke server. `scripts/prepare_data.py` membangun ulang bank dari transkripsi dan mengunduh asset KanjiVG pada revisi yang dikunci.
