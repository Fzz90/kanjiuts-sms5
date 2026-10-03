# Desain Kanji UTS: dark mode dan Mesh drift

UI memakai latar slate gelap, teks terang, kartu gelap dengan aksen lembut, dan ikon Lucide dalam bidang warna. Dark mode berlaku pada seluruh halaman, input, kotak tulis, serta pembaca buku. Susunan mengikuti referensi UAS: header tengah, navigasi mode, tiga kartu awal, serta panel TM di kanan saat desktop. Kartu tetap sejajar meskipun panjang teks berbeda; hover mengubah warna dan bayangan tanpa menggeser posisi.

Palet dipilih melalui workflow ui-ux-pro-max: pencarian design system, palet language learning, dan panduan aksesibilitas React. Rekomendasi indigo untuk belajar bahasa dan teal untuk latihan disesuaikan menjadi tema tinta Jepang. Seluruh aksen teks, bidang kontrol, ikon, tombol, fokus, progres, dan stroke mengikuti mode aktif, termasuk dialog buku yang dirender melalui portal ke body. Definisi mode berada di `src/lib/study-themes.js`.

| Peran | Warna |
|---|---|
| Latar / panel / bidang tulis | `#10151F` / `#1B2330` / `#121B26` |
| Teks utama / sekunder | `#EAF0F7` / `#A8B4C4` |
| Awal | Slate `#BAC9DD` |
| Yomikata | Indigo `#AFC5FF`, aksen kedua `#86A7ED` |
| Kanji Renshuu | Jade `#8DDFC3`, aksen kedua `#6AC9AE` |
| Baca Buku | Apricot `#F0BB9E`, aksen kedua `#E6A884` |
| Jawaban benar / salah | `#90DAB5` / `#FFA3AC` |

TM 2–7 memiliki enam warna penanda berbeda: indigo, teal, cokelat, plum, biru mineral, dan zaitun. Penanda diterapkan pada kartu pilihan, progres TM, chip sesi, dan tombol TM aktif. Identitas mode tetap konsisten selama berganti TM. Nomor dan label tetap tersedia sehingga informasi tidak bergantung pada warna saja.

Teks aksen memenuhi rasio kontras minimal 4,5:1 pada latar, panel, bidang tulis, serta bidang lembut masing-masing; label tombol gelap memenuhi 4,5:1 pada bidang aktif. Kontrol memiliki fokus terlihat, dan tombol alat tulis/zoom menyediakan target sentuh minimal 44px. Sour Gummy untuk UI mengikuti referensi; Kosugi Maru untuk kanji, hiragana, katakana, dan input bacaan sesuai pilihan pengguna.

Soal Yomikata dan Kanji Renshuu memakai glow statis sesuai warna mode, dengan bayangan teks berlapis dan radial halo lembut. Bobot soal naik dari 400 ke 500. Karena Kosugi Maru hanya menyediakan bobot asli 400, stroke teks tipis `0.006em` membuat penebalan tetap terlihat tanpa mengganti bentuk font atau mengaktifkan sintesis font secara global.

Terjemahan kedua mode latihan memakai dua paragraf terpusat: Inggris `#E56399` berukuran 24px dengan atribut `lang="en"`, lalu Indonesia italic `#06D6A0` berukuran 16px dengan `lang="id"`, berjarak 4px. Arti Indonesia dibungkus elemen `q` dengan tanda kutip “…”; data terjemahan tetap utuh. Font Sour Gummy memuat varian italic asli bobot 400. Ukuran Inggris tetap lebih besar pada ponsel dan kedua terjemahan dapat membungkus.

Memilih atau mengganti TM langsung membuka seluruh soal pertemuan tujuan. Klik TM yang sedang aktif mempertahankan soal berjalan. Tombol **Pilih kanji** membuka kartu **Semua kanji TM** di atas dan grid **Latihan per kanji** di bawah; tombol kanji di sidebar langsung memulai kelompok tersebut. Grid berisi 6 kolom pada desktop, 4–6 pada tablet sesuai lebar, dan 3 pada ponsel. Setiap kartu memuat kanji, jumlah soal, serta progres kosakata. Filter memakai kelompok sumber buku, bukan sekadar mencari karakter di dalam kata. Identitas pilihan tampil pada sesi dan hasil; ulangi sesi/soal mempertahankan pilihan tersebut.

Feedback suara memakai rekaman yang sama dengan proyek UAS: benar, salah, show answer/ulangi animasi, lewati, dan selesai. Volume benar 0,65; lainnya 0,6. Rekaman dipramuat pada tap latihan dan diputar melalui Web Audio agar selesai tetap berbunyi saat sesi berakhir lewat auto-next. Satu suara aktif pada satu waktu; perpindahan TM menghentikan suara lama dan membatalkan pemutaran yang masih menunggu. Suara selesai mengambil prioritas dari suara lewati pada soal terakhir. Nada fallback mempertahankan pitch referensi jika berkas gagal dimuat.

Kotak tulis diperbesar menjadi sekitar 260px pada desktop. Di ponsel, setiap kotak tampil satu per baris, mengikuti lebar kartu hingga 320px; kanji dan okurigana dikelompokkan agar urutannya tetap jelas. Header Renshuu dipadatkan pada ponsel, kontrol dapat membungkus, dan tombol latihan disusun selebar kartu. SVG tetap persegi dengan koordinat stroke ternormalisasi. Show answer dan Ulangi animasi menghapus coretan tersimpan maupun stroke yang sedang digambar, membersihkan feedback salah, lalu menampilkan shadow dan animasi.

Tablet memakai breakpoint 501–1366px. Area latihan satu kolom dengan lebar maksimum 1024px memberi ruang penuh untuk soal serta kotak tulis sekitar 320px, biasanya dua kotak per baris. Header latihan menempatkan merek dan Awal dalam satu baris di bawah navigasi mode. Panel TM/kanji berada sesudah latihan, dengan enam pilihan TM dalam satu baris dan grid kanji otomatis berukuran minimal 52×56px agar panel tidak terlalu tinggi. Kontrol utama, alat tulis, serta buku memiliki tinggi 48px; jarak alat tulis/zoom minimal 8px. Urutan DOM, data sesi, dan handler pointer dipertahankan; rotasi hanya mengubah tata letak.

Menu awal pada lebar 501–949px memakai tiga kartu horizontal satu kolom; mulai 950px kembali tiga kartu sejajar. Pilihan TM menyesuaikan menjadi dua atau tiga kolom, dan halaman pilihan kanji/hasil sesi dapat membungkus tanpa scroll horizontal. Soal tablet di atas 760px memakai 68–84px (Yomikata) dan 44–56px (Renshuu), dengan baris seimbang. Ukuran HP yang diminta sebelumnya tetap berlaku.

Toolbar buku pada tablet dapat membungkus, mempertahankan label Pas halaman/Pas lebar dan kontrol 48px. Layar penuh pada lebar sampai 949px menempatkan pilihan halaman serta Tutup pada baris pertama, zoom pada baris kedua. Viewport membaca menggunakan tinggi tersisa; scrollbar halaman tetap berada di dalam pembaca. ResizeObserver memperbarui ukuran Pas lebar saat rotasi tanpa mengganti halaman atau menutup dialog.

Latar **Mesh drift** menggantikan Pipo. Renderer memakai konteks WebGL1 tanpa library dan satu fullscreen triangle. Fragment shader disalin utuh dari ekspor 21st.dev Shader Builder yang diberikan pengguna, disimpan di `src/shaders/mesh-drift.frag`. Palet tetap pada seluruh mode: `#10002B`, `#7F00FF`, `#33AEB9`, dan `#0920F4`; nilai RGB uniform mengikuti angka desimal pada header ekspor.

Uniform packed mengikuti resep: waktu `elapsedSeconds * 0.73`, shape `(1.10, 0.34, 0.50, 0)`, surface `(2.40, 0.96, -0.10, 0.96)`, finish `(0, 0.36, 0.026, 0.07)`, dan seed 1453. Offset, rotation, drift, serta OKLab nonaktif. Cursor presence nol dan tidak ada listener pointer. Gerakan blob, blur lima sampel, vignette, dan grain dihitung langsung oleh shader.

Lapisan `rgba(9, 15, 26, 0.6)` menggelapkan hasil shader tanpa mengubah resepnya. Teks di luar panel memakai warna terang; panel latihan tetap opak. Identitas warna tombol, ikon, progres, stroke, dan glow soal tetap mengikuti mode.

Canvas diposisikan absolut dalam lapisan fixed sebesar viewport, di belakang konten. Buffer dibatasi 1 juta piksel, DPR maksimal 1,5, dan batas GPU perangkat. Background menggambar maksimal 30 fps; jika frame terus lambat, resolusi turun menjadi 500 ribu lalu 250 ribu piksel dengan maksimal 20 fps, kemudian menjadi frame statis bila masih berat. Teks dan bidang tulis tetap mengikuti resolusi layar. requestAnimationFrame berhenti saat reduced motion aktif, tab tersembunyi, pointer menulis aktif, atau mode buku dibuka, lalu melanjutkan fase terakhir yang terlihat tanpa melompati waktu jeda. Pergantian mode mempertahankan canvas dan clock. Canvas tidak menerima pointer dan disembunyikan dari accessibility tree. Preview tulisan memakai RAF terpisah, menyimpan seluruh sampel dan titik akhir tanpa memperbarui React pada setiap pointermove.

Fallback CSS radial gelap tersedia jika WebGL tidak dapat dibuat atau konteks hilang. Ketika browser memulihkan konteks, program, uniform, serta buffer dibangun ulang dan animasi dilanjutkan. Unmount membatalkan RAF, melepas listener/observer, dan membebaskan resource GPU.

```text
        [Yomikata] [Kanji Renshuu] [Baca Buku]
                   Kanji UTS
                 Semester 5

Awal:     [Yomikata] [Kanji Renshuu] [Baca Buku]
Pilih TM: langsung seluruh soal TM; Pilih kanji membuka [semua kanji TM] / [kartu per kanji]
Latihan:  [soal, input, feedback      ] [pilihan TM/kanji]
Buku:     [halaman | zoom | layar penuh]
          [satu halaman PDF, zoom bisa digeser]
          [back | nomor halaman | next]
```

Halaman sumber ditampilkan utuh, termasuk halaman rangkuman. Navigasi dibatasi pada 25 slide; tampilan menyebut nomor asli PDF 185–209. Gambar 180 dpi disimpan lokal dan file PDF asli tersedia dari pembaca. Zoom dan navigasi keyboard hanya berlaku selama pembaca aktif.

Slide buku memakai filter statis `invert(0.9) hue-rotate(180deg)` untuk tampilan malam: teks terang pada halaman gelap. Filter tidak memakai blur atau animasi, dan berkas gambar serta PDF asli tetap utuh.

Zoom dari kartu membuka dialog modal yang memenuhi viewport, tanpa batas lebar aplikasi. Kontrol zoom dan next/back tetap terlihat di atas dan bawah; area halaman memakai sisa tinggi layar. Tombol Layar penuh membuka ukuran pas halaman, sedangkan tombol + membuka langsung pada 200%. Cubit dua jari memperbesar di sekitar titik sentuh; seret mouse atau geser sentuhan memindahkan halaman. Pas lebar membantu layar desktop dan orientasi landscape. Dialog mengunci scroll latar dan membatasi fokus; Tutup/Esc mengembalikan fokus ke tombol Layar penuh, mempertahankan halaman, dan mereset zoom kartu.

Pas lebar memakai mode ukuran tersendiri: gambar mengikuti 100% lebar isi viewport melalui CSS. Persentase zoom hanya menjadi indikator ukuran tersebut. Acuan zoom manual memakai ukuran luar viewport agar perubahan ruang scrollbar tidak mengubah ukuran acuan dan memicu pembesaran/pengecilan berulang. Tombol +/− dan cubit meninggalkan mode Pas lebar dengan ukuran saat ini sebagai titik awal.
