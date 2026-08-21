# 03 — BUSINESS BIBLE (v2)

**QRIS Guard · HackNusa 2026 · Track 1: Secure Digital Payments & Fintech**
Submisi awal: **21 Agustus 2026** · Hackathon onsite: 3 Oktober 2026

> Baca `01_DEFINISI_MASALAH.md` dulu. Dokumen ini menurunkan dari sana.
> **Berubah dari v1:** posisi produk digeser dari aplikasi ke SDK, narasi
> disusun ulang mengikuti tiga tipe serangan, naskah video dirombak.

---

## 1. Pitch tiga tingkat

**Satu kalimat:**
Bayar QRIS itu buta — QRIS Guard mengisi tiga detik antara scan dan bayar.

**Tiga kalimat:**
Saat membayar di warung, pembeli tidak punya cara memastikan uangnya masuk ke
warung yang sedang dia datangi. QRIS Guard memeriksa isi QR, membandingkannya
dengan riwayat tempat, dan untuk transaksi berisiko menanyakan nama toko ke
pembeli sebelum menampilkan jawabannya. Bentuk akhirnya bukan aplikasi terpisah,
tapi lapisan verifikasi yang dipasang di dalam dompet digital yang sudah ada.

**Satu menit:** ikuti alur bagian 3 di bawah.

---

## 2. Kenapa masalah ini layak dilombakan

QRIS ada di mana-mana, dan justru itu kelemahannya: kebanyakan titik pembayaran
cuma **stiker kertas**. Menempel stiker baru di atasnya butuh tiga detik dan nol
keahlian teknis. Korban baru sadar berhari-hari kemudian, kalau sadar sama sekali.

Yang perlu ditekankan ke juri: **sistem QRIS-nya tidak diserang.** Transfernya
sah, banknya benar, protokolnya aman. Yang diserang adalah kertas dan kebiasaan
manusia. Itulah kenapa solusi kriptografis saja tidak menyelesaikan — dan kenapa
track ini disebut *Secure Digital Payments*, bukan *Cryptography*.

Kalimat panitia di guideline: *"stop suspicious transactions before completion."*
Kata kuncinya **before**. Semua solusi yang ada hari ini bekerja *after*.

---

## 3. Tiga tipe serangan — kerangka seluruh presentasi

Pakai kerangka ini di video, di pitching, dan saat tanya jawab. Ini yang
membedakan tim yang paham masalahnya dari tim yang cuma bikin aplikasi.

| | Tipe A: diedit asal | Tipe B: dipalsukan | Tipe C: QR asli, tempat salah |
|---|---|---|---|
| Contoh | stiker diutak-atik | QR baru ke rekening penampung | tetangga menempel QR miliknya |
| Kode pengaman | gagal | lolos | lolos |
| Pertahanan kami | baca isi QR | kenali identitas & riwayat | tanya pembeli |
| Kepastian | pasti | kemungkinan besar | butuh pembeli ikut serta |

**Tipe C adalah kartu as kalian.** Hampir tidak ada tim yang memikirkannya, dan
ini kasus yang paling tidak terpecahkan secara teknis. Ceritakan dengan nama:

> Anam dan Zikri jualan ayam geprek bersebelahan. Warung Anam ramai, Zikri sepi.
> Zikri menempel QRIS miliknya sendiri di atas QR Anam. Tidak ada yang dipalsukan
> — itu QRIS resmi Zikri. Setiap pembeli Anam membayar Zikri, dan tidak ada satu
> sistem pun di Indonesia hari ini yang bisa melihatnya.

Lalu jawabannya:

> Yang tahu tujuan sebenarnya cuma pembeli. Jadi kami tanya dia. Tapi kami tanya
> **sebelum** menampilkan jawabannya — kalau namanya ditampilkan duluan, pembeli
> cuma menyalin layar.

---

## 4. USP — empat hal yang tidak dimiliki siapa pun

1. **Verifikasi niat, bukan cuma verifikasi data.** Semua pemain lain memeriksa
   apakah QR-nya sah. Kami memeriksa apakah QR-nya sah **dan** apakah itu QR yang
   dimaksud pembeli. Sejauh yang kami tahu, tidak ada produk lain yang melakukan ini.
2. **Bukti yang bisa dilihat pengguna.** Layar Bukti menampilkan isi QR apa
   adanya. Produk keamanan yang menyuruh percaya begitu saja tidak membangun
   kepercayaan; yang menunjukkan cara kerjanya iya.
3. **Jeda sebagai fitur.** Tujuh detik sebelum tombol bayar aktif. Ini intervensi
   perilaku yang disengaja, bukan aplikasi lambat.
4. **Inti berjalan offline.** Pemeriksaan tidak butuh internet — penting di pasar
   dan daerah bersinyal buruk, yang justru paling sering jadi sasaran.

Dibanding yang ada:

| Yang ada | Keterbatasan |
|---|---|
| Deteksi fraud sisi bank | Bereaksi setelah uang keluar |
| Database rekening penipu | Manual, berbasis nomor rekening, bukan QR |
| Nama penerima di dompet digital | Tampil sekilas, tidak dibandingkan dengan apa pun |
| Edukasi anti-penipuan | Tidak hadir di detik keputusan |

---

## 5. Bentuk produk: SDK, bukan aplikasi

**Keputusan paling penting di dokumen ini.** Konsisten di semua materi.

Sebagai aplikasi terpisah, ini gagal — tidak ada yang mau buka dua aplikasi untuk
beli es teh, dan momen verifikasinya ada di layar konfirmasi dompet digital yang
bukan milik kami.

Maka:

- **Produk** = lapisan verifikasi yang dipasang penyedia dompet digital
- **Yang kami bangun untuk lomba** = implementasi acuan yang membuktikan lapisan
  itu bekerja
- **Aset jangka panjang** = data laporan lintas-dompet

Poin ketiga yang paling kuat dan paling jarang dipikirkan orang: **GoPay tidak
akan berbagi daftar merchant penipu dengan OVO.** Keduanya kompetitor. Tapi
keduanya bisa berbagi dengan pihak netral. Posisi ini mirip lembaga pemeringkat
kredit — semakin banyak yang ikut, semakin berharga, dan semakin sulit disaingi.

Kalimatnya: *"Yang kami bangun bukan aplikasi. Yang kami bangun standar.
Aplikasi ini cara kami membuktikan standarnya jalan."*

Risiko yang harus diakui kalau ditanya: siklus penjualan ke bank itu panjang, dan
mereka bisa membangun sendiri. Jawabannya adalah data lintas-dompet tadi — itu
yang tidak bisa dibangun sendiri oleh satu dompet mana pun.

---

## 6. Model bisnis

**Pengguna: gratis selamanya.** Ini bukan produk konsumen berbayar.

1. **Lisensi SDK** ke dompet digital, bank, acquirer. Biaya per transaksi
   diperiksa, tarif turun sesuai volume. Nilai jualnya sederhana: satu kasus fraud
   yang dicegah lebih murah dari satu kasus yang harus direstitusi plus kerusakan
   reputasi.
2. **Data laporan lintas-dompet.** Langganan tahunan untuk acquirer dan regulator:
   NMID yang dilaporkan, sebaran wilayah, tren modus.
3. **Paket edukasi korporat.** Jalur alami untuk kolaborasi dengan Kaspersky.

Yang tidak akan kami lakukan: menjual data pengguna, atau memasang iklan. Produk
keamanan yang memonetisasi perhatian penggunanya kehilangan alasan keberadaannya.

---

## 7. Peta ke enam kriteria penilaian

| Kriteria | Bukti kami |
|---|---|
| **1. Kesesuaian track** | Fintech + QRIS + pencegahan fraud, persis kalimat tantangan panitia |
| **2. USP** | Verifikasi niat pembeli — pendekatan yang tidak dimiliki produk lain. Plus layar bukti yang bisa diaudit. |
| **3. Kelayakan teknis** | Sudah jalan. Parser dan validator deterministik, bukan mock. Bisa didemokan tanpa internet. |
| **4. Proof of Concept** | 8 fixture uji mencakup ketiga tipe serangan, semua reproducible lewat satu perintah |
| **5. Keamanan & patentabilitas** | Tidak ada data transaksi dikirim ke server. Kandidat klaim: *metode verifikasi transaksi pembayaran berbasis kode QR dengan konfirmasi identitas penerima secara buta oleh pembayar sebelum penampilan data penerima* |
| **6. Skalabilitas** | SDK ringan, tidak perlu mengubah infrastruktur QRIS sama sekali |

Kriteria 5 itu yang paling sering dilupakan tim lain. Mekanisme "tanya sebelum
tampilkan" di bagian 3 adalah klaim paten yang paling masuk akal dari proyek ini
— catat tanggal dan simpan riwayat commit-nya sebagai bukti waktu.

---

## 8. Peta jalan

| Fase | Isi |
|---|---|
| Sekarang → 21 Agu | PoC tiga tipe serangan + video submisi |
| Sep (kalau lolos) | Uji ke 20 orang sungguhan, ukur berapa kali tantangan nama muncul, rapikan layar Bukti |
| 3 Okt (onsite) | Prototipe fungsional penuh + contoh integrasi ke satu alur pembayaran tiruan |
| Pasca-lomba | Pilot di satu pasar tradisional atau koperasi; ajukan ke sandbox regulator |
| Jangka panjang | Sidik lokasi Wi-Fi (ketelitian jauh di atas GPS, butuh aplikasi Android asli); dorong jadi bagian standar QRIS |

---

## 9. Naskah video 2–3 menit

Wajib **bahasa Inggris** (FAQ nomor 7). Rekam layar aslinya, jangan slide berisi
screenshot — juri bisa membedakan.

**0:00–0:20 — Masalah, lewat cerita.** Tangan menempel stiker QR di atas QR lain.
*"Three seconds. No technical skill. The victim finds out three days later —
if ever."*

**0:20–0:35 — Kerangka.** Tampilkan tabel tiga tipe serangan. Ini yang membuat
juri paham kalian benar-benar memetakan masalahnya.

**0:35–1:40 — Demo, bagian terpenting. Jangan dipotong.**
- OK-01 → hijau. *"Clean code, known merchant."*
- BAD-01 → merah → buka layar Bukti, tunjuk dua kode berbeda berdampingan.
  *"The code claims this. The math says that."*
- BAD-03 → **jeda** → *"This one passes the checksum. A real attacker builds it
  this way."* → tetap merah lewat lapisan identitas.
- **OVERLAY-01 → puncaknya.** *"This QR is completely genuine. It belongs to the
  stall next door."* Tunjukkan aplikasi menyembunyikan nama penerima dan bertanya.
  Ketik "ayam geprek anam". Layar merah: niat vs kenyataan, berdampingan.

**1:40–2:05 — Kejujuran.** *"The checksum only catches lazy attackers. GPS cannot
tell apart two stalls four meters apart. For genuine-QR misplacement, we need the
buyer. So we ask — but we ask before we show the answer."*

**2:05–2:35 — Produk & skala.** SDK di dalam dompet digital, bukan aplikasi
terpisah. Data laporan lintas-dompet. Satu kalimat peta jalan.

**2:35–2:50 — Tutup.** Nama tim, institusi, track.

Catatan: kalau kamera HP tidak stabil, pakai tombol "Coba contoh" dan rekam layar
langsung. Jauh lebih meyakinkan daripada demo yang gagal scan.

---

## 10. Daftar periksa sebelum kirim

- [ ] Video 2–3 menit, **bahasa Inggris**, di YouTube/Vimeo
- [ ] Visibilitas **unlisted atau public**, bukan private — kesalahan paling sering
- [ ] Video menyentuh keenam kriteria penilaian
- [ ] Satu tim = satu track = satu proyek. Submisi ganda = diskualifikasi
- [ ] Semua anggota 16–25 tahun, terdaftar di institusi di Indonesia
- [ ] Tim 2–3 orang, satu formulir saja
- [ ] Susunan anggota final sebelum 21 Agustus
- [ ] Track dan proyek dikunci setelah 21 Agustus
- [ ] Kirim **19 atau 20 Agustus**

---

## 11. Bank pertanyaan juri

| Pertanyaan | Jawaban |
|---|---|
| "Bagaimana kalau penipunya bikin QR yang valid?" | "Itu skenario BAD-03 kami, dan kode pengaman memang lolos di situ. Yang menangkapnya lapisan identitas." |
| "GPS bisa bedain dua warung sebelahan?" | "Tidak. Jaraknya 4 meter, ketelitian GPS 10 meter. Yang kami deteksi bukan koordinatnya, tapi perubahan pola di titik itu — dan untuk kasus itu kami mengandalkan pertanyaan ke pembeli." |
| "Orang bakal males kalau disuruh ngetik terus" | "Setuju, makanya cuma muncul di bawah 1 dari 10 transaksi. Kami mengukurnya, itu salah satu metrik utama kami." |
| "Kenapa nggak pakai AI aja buat deteksi?" | "Keputusan keamanan harus bisa diulang dan dijelaskan. AI kami pakai untuk menerjemahkan hasil ke bahasa manusia, bukan mengambil keputusan." |
| "Kenapa orang mau install aplikasi ini?" | "Tidak akan. Makanya ini SDK di dalam dompet yang sudah mereka pakai." |
| "Bedanya apa dengan cek rekening penipu?" | "Itu manual dan berbasis nomor rekening. Kami otomatis, berbasis QR, dan terjadi tepat sebelum tombol bayar." |
| "Kalau pembelinya salah baca papan nama?" | "Ada tombol 'lanjut, saya yakin' yang harus ditahan 3 detik. Sistem yang tidak bisa di-override akan ditinggalkan." |
