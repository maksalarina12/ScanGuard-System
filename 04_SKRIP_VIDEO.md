# 04 — SKRIP VIDEO DEMO

**ScanGuard System · HackNusa 2026 · Track 1: Secure Digital Payments & Fintech**

> Draft kerja dalam **Bahasa Indonesia** — untuk latihan/rekaman awal dan
> penyusunan urutan demo. Video submisi resmi wajib **Bahasa Inggris**
> (lihat `03_BUSINESS_BIBLE.md` bagian 9–10). Terjemahkan naskah ini
> setelah urutan dan timing-nya fix.

Durasi target: **2:00–2:50** (batas keras 2–3 menit).

> **Update:** durasi final disepakati **1:00–2:00**, dibawakan **3 orang**
> bergantian. Skrip yang dipakai untuk rekaman ada di bagian 0 di bawah.
> Bagian 1–4 di bawahnya adalah draft panjang (versi solo, 1 orang) —
> disimpan sebagai cadangan referensi bila durasi/format berubah lagi.

---

## 0. Skrip final — 1:00–2:00, 3 pembicara

Target ±1:45 supaya ada jarak aman dari batas 2 menit saat pengucapan
sesungguhnya (biasanya sedikit lebih lambat dari perkiraan naskah).

Tiga peran bisa dipetakan ke siapa saja di tim — sebutan di bawah
("Pembicara 1/2/3") bukan berarti harus urut sesuai peran kerja kalian
di tim (misal siapa yang koding vs siapa yang desain). Yang penting:
**Pembicara 2 memegang laptop/layar** karena dialah yang klik demo.

| Peran | Bagian | Durasi | Isi |
|---|---|---|---|
| **Pembicara 1** | Pembuka & masalah | ~20 detik | Satu kalimat masalah + kenapa ScanGuard dibuat |
| **Pembicara 2** | Demo Tipe A & B | ~35 detik | Pegang layar, klik contoh, jelaskan dua cara deteksi |
| **Pembicara 3** | Demo Tipe C, kejujuran, penutup | ~45 detik | Puncak cerita + batasan produk + closing |

### Pembicara 1 — Pembuka & Masalah *(0:00–0:20)*
*(Visual: tangan menempel stiker QR baru di atas QR lama)*

> "Setiap kali kita bayar QRIS di warung, kita nggak punya cara buat
> mastiin uangnya masuk ke warung yang bener. Penipuan QRIS nggak
> nyerang sistemnya — transfernya sah, banknya benar. Yang diserang itu
> stiker kertas, dan kebiasaan kita yang nggak pernah baca sebelum
> tekan bayar. Kami bikin **ScanGuard System** buat ngisi tiga detik
> kosong itu — antara scan dan bayar."

### Pembicara 2 — Demo Tipe A & B *(0:20–0:55)*
*(Visual: layar app, klik "Coba contoh")*

*(klik `BAD-01`, buka layar Bukti)*
> "Ini ScanGuard System. Contoh pertama — QR yang diedit sembarangan.
> Merah. Di layar Bukti kelihatan dua kode berdampingan: yang diklaim
> di dalam QR, dan yang dihitung ulang sistem. Beda. Ini terdeteksi
> pasti, lewat matematika."

*(klik `BAD-03`, jeda sebentar)*
> "Contoh kedua ini lolos kode pengamannya — penipu yang serius emang
> bikin kayak gini. Tapi tetap merah, bukan dari kode pengaman, tapi
> dari identitas merchant yang mencurigakan."

### Pembicara 3 — Demo Tipe C, Kejujuran, Penutup *(0:55–1:45)*
*(Visual: klik `OVERLAY-01`)*

> "Dan ini yang paling berbahaya. QR ini asli — sah, terdaftar resmi.
> Masalahnya cuma satu: ini punya warung sebelah."

*(app sembunyikan nama penerima, muncul kolom pertanyaan; ketik "ayam
geprek anam")*

> "Sistem sembunyiin nama penerima, tanya dulu ke pembeli: warung mana
> yang lagi kita datangi. Merah — niat kita dan kenyataan penerima,
> ternyata beda.
>
> Kode pengaman cuma nangkep penipu yang malas. Untuk kasus kayak gini,
> cuma pembeli yang bisa mutusin — makanya kami tanya duluan, sebelum
> nunjukin jawabannya.
>
> Kami [nama tim], dari [nama institusi]. **ScanGuard System** —
> periksa dulu, baru bayar."

**Estimasi total: ±1:45**, aman di bawah batas 2 menit.

### Catatan pembagian peran
- Pembicara 2 wajib yang paling hafal urutan klik di app — dia yang
  pegang kendali layar sepanjang demo.
- Pembicara 1 dan 3 bisa tampil di kamera (wajah) sementara layar app
  di-screen-record terpisah lalu digabung saat edit, atau ketiganya
  duduk berdampingan menghadap satu layar — pilih mana yang paling
  gampang direkam ulang kalau ada yang salah ucap.
- Latih transisi antar pembicara supaya tidak ada jeda canggung —
  pembicara berikutnya mulai bicara tepat saat pembicara sebelumnya
  selesai, bukan menunggu aba-aba.
- Ganti `[nama tim]` dan `[nama institusi]` sebelum rekam.
- Kalau ternyata masih lebih dari 2 menit saat direkam sungguhan,
  bagian pertama yang boleh dipangkas: kalimat "penipu yang serius
  emang bikin kayak gini" di Tipe B (opsional, bukan inti argumen).

---

## 1. Tujuan tiap bagian demo (versi panjang, cadangan)

Demo (0:35–1:40) adalah bagian terpenting — jangan dipotong saat syuting.
Urutan contoh disusun agar tiap klik punya satu tujuan penjelasan yang jelas,
bukan sekadar menunjukkan fitur:

| Urutan | Contoh | Tujuan demo | Hasil di layar |
|---|---|---|---|
| **1** | `BAD-01` | Jelaskan **Tipe A** — QR diedit asal, kode pengaman tidak dihitung ulang | Merah, lewat layar Bukti: dua kode berbeda berdampingan |
| **2** | `BAD-03` | Jelaskan **Tipe B** — QR palsu dibuat ulang dari nol, kode pengaman valid sempurna | Merah, tapi bukan dari kode pengaman — dari lapisan identitas merchant |
| **3** | `OK-01` | **Kontrol** — buktikan sistem tidak asal tandai merah, dan tunjukkan rasa aman yang selama ini keliru dipercaya pengguna | Hijau, merchant dikenal |
| **4** | `OVERLAY-01` | Puncak — jelaskan **Tipe C**, kasus paling berbahaya: QR asli, sah, tapi di tempat yang salah | Merah, lewat pertanyaan nama toko ke pembeli sebelum nama penerima ditampilkan |

Kenapa `OK-01` diletakkan di posisi ketiga, bukan pertama seperti draft awal:
menaruh contoh "aman" di tengah — setelah dua contoh merah — justru
menegaskan bahwa sistem ini bisa membedakan, bukan sekadar mencurigai semua
QR. Ini juga jadi jeda napas sebelum puncak Tipe C di posisi keempat.

---

## 2. Naskah kata-per-kata

### [0:00–0:20] — Masalah
*(Visual: tangan menempelkan stiker QR baru di atas QR yang lama, di meja warung)*

> "Tiga detik. Tanpa keahlian teknis. Cukup selembar stiker.
> Korbannya baru sadar tiga hari kemudian — kalau pun sadar.
>
> Setiap kali kita membayar QRIS di warung, kita tidak punya cara apa pun
> untuk memastikan uang kita masuk ke warung yang sedang kita datangi."

### [0:20–0:35] — Kerangka masalah
*(Visual: tabel tiga tipe serangan muncul di layar)*

> "Kami memetakan ini jadi tiga jenis serangan. Tipe A, QR yang diedit
> asal — kode pengamannya gagal, ini pasti terdeteksi. Tipe B, QR palsu
> yang dibuat ulang dari nol — kode pengamannya valid, jadi kami harus
> mengenali identitas penerimanya. Dan Tipe C — QR yang seratus persen
> asli, tapi ditempel di tempat yang salah. Ini yang paling berbahaya,
> karena tidak ada matematika yang bisa mendeteksinya."

### [0:35–1:40] — Demo
*(Visual: layar app ScanGuard System, klik "Coba contoh" satu per satu)*

> "Ini ScanGuard System."

**① Tipe A** *(klik `BAD-01`, tunggu hasil merah, buka layar Bukti)*
> "Contoh pertama. Merah. Kita buka layar Bukti — di sini kelihatan dua
> kode berdampingan. Yang diklaim di dalam QR, dan yang dihitung ulang
> oleh sistem. Kodenya beda. Isi QR-nya diutak-atik, dan kode
> pengamannya tidak ikut diperbaiki."

**② Tipe B** *(klik `BAD-03`, jeda sejenak sebelum hasil muncul)*
> "Contoh kedua ini... lolos kode pengamannya. Penipu yang serius memang
> membuatnya seperti ini — valid secara matematika."

*(hasil muncul: tetap merah)*
> "Tapi tetap terdeteksi merah — bukan lewat kode pengaman, lewat
> lapisan identitas merchant."

**③ Kontrol** *(klik `OK-01`)*
> "Supaya jelas — sistem ini tidak asal menandai semua QR sebagai
> bahaya. Kode bersih, merchant sudah kami kenal. Hijau, aman."

**④ Tipe C — puncak** *(klik `OVERLAY-01`)*
> "Dan ini contoh puncaknya. QR ini seratus persen asli. Benar-benar
> terdaftar sah. Masalahnya — ini milik warung sebelah."

*(app menyembunyikan nama penerima, muncul kolom pertanyaan)*
> "Sistem menyembunyikan nama penerima sebenarnya, dan bertanya dulu ke
> pembeli: warung mana yang sedang Anda datangi?"

*(ketik "ayam geprek anam")*
> "Saya ketik 'ayam geprek anam' — warung yang saya lihat di depan saya."

*(hasil: layar merah)*
> "Merah. Niat pembeli dan kenyataan penerima, ditampilkan berdampingan.
> Inilah yang selama ini kosong di antara scan dan bayar."

### [1:40–2:05] — Kejujuran soal batasan

> "Kami jujur soal batasan ini: kode pengaman hanya menangkap penipu
> yang malas. GPS tidak bisa membedakan dua warung yang jaraknya empat
> meter. Untuk kasus QR asli yang salah tempat, satu-satunya yang bisa
> memutuskan adalah pembeli sendiri. Karena itu kami bertanya — tapi
> kami bertanya sebelum menampilkan jawabannya, supaya jawaban pembeli
> tidak terpengaruh oleh apa yang dia lihat."

### [2:05–2:35] — Produk & skala

> "Aplikasi yang Anda lihat ini bukan produk akhirnya. Ini implementasi
> acuan yang membuktikan mesin deteksinya bekerja. Produk sebenarnya
> adalah lapisan verifikasi — SDK — yang dipasang penyedia dompet
> digital langsung di layar konfirmasi mereka sendiri. Orang tidak akan
> mau membuka dua aplikasi hanya untuk beli es teh. Dengan data yang
> terkumpul lintas dompet digital, pola penipuan yang sama bisa
> terlihat sebelum menyebar ke merchant lain."

### [2:35–2:50] — Penutup

> "Kami [nama tim], dari [nama institusi]. ScanGuard System — periksa
> dulu, baru bayar. Track 1, Secure Digital Payments and Fintech,
> HackNusa 2026."

---

## 3. Catatan produksi

- Total ±2:50, masih dalam batas 2–3 menit.
- Ganti `[nama tim]` dan `[nama institusi]` sebelum rekam.
- Demo pakai tombol "Coba contoh" langsung dari app (`npm run dev`,
  `http://localhost:5173/`) — tidak perlu scan kamera asli, lebih
  stabil untuk rekaman layar.
- Kalau kamera HP tidak stabil untuk bagian pembuka (0:00–0:20), tetap
  bisa direkam sebagai reka ulang singkat; tidak wajib kamera asli.
- Tiga kalimat kunci yang harus dijaga persis maknanya saat alih bahasa
  ke Inggris, karena jadi "punchline" juri:
  - *"the code claims this, the math says that"* (Tipe A)
  - *"this QR is completely genuine — it belongs to the stall next
    door"* (Tipe C)
  - *"we ask before we show the answer"* (mitigasi Tipe C)

---

## 4. Checklist sebelum kirim

- [ ] Video 2–3 menit, **Bahasa Inggris**, di YouTube/Vimeo
- [ ] Visibilitas **unlisted atau public**, bukan private
- [ ] Video menyentuh keenam kriteria penilaian
- [ ] Demo mengikuti urutan: Tipe A → Tipe B → kontrol (aman) → Tipe C
- [ ] Kirim **19 atau 20 Agustus**
