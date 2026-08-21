# ScanGuard System

**HackNusa 2026 · Track 1: Secure Digital Payments & Fintech**
Submisi awal: 21 Agustus 2026 · Hackathon onsite: 3 Oktober 2026

Saat membayar QRIS di warung, pembeli tidak punya cara apa pun untuk
memastikan uangnya masuk ke warung yang sedang dia datangi. **ScanGuard System**
mengisi tiga detik yang selama ini kosong antara scan dan bayar: memeriksa
isi kode QR, mencocokkannya dengan riwayat tempat, dan untuk transaksi
berisiko, menanyakan nama toko ke pembeli **sebelum** menampilkan siapa
penerima sebenarnya.

Repo ini berisi dua hal: dokumen desain yang menurunkan seluruh keputusan
produk, dan implementasi acuannya yang benar-benar jalan.

---

## Isi repo ini

```
.
├── 01_DEFINISI_MASALAH.md   <- BACA INI DULUAN. Masalah, target pengguna,
│                               tiga tipe serangan, batasan yang disengaja.
├── 02_MEGA_PROMPT.md        <- Spesifikasi teknis lengkap yang dipakai
│                               untuk membangun aplikasinya (arsitektur,
│                               format QRIS, rumus CRC, semua aturan
│                               deteksi, urutan pengerjaan).
├── 03_BUSINESS_BIBLE.md     <- Pitch, model bisnis, peta ke kriteria
│                               penilaian juri, naskah video, bank
│                               pertanyaan juri.
├── qris_fixtures.py         <- Generator data uji asli (Python) — dipakai
│                               sebagai acuan; salinannya ada di
│                               scanguard-system/tools/.
└── scanguard-system/              <- APLIKASINYA. React + TypeScript + Vite.
                                Lihat scanguard-system/README.md untuk cara
                                menjalankan dan menguji.
```

**Urutan baca yang disarankan:** `01_DEFINISI_MASALAH.md` →
`02_MEGA_PROMPT.md` → `03_BUSINESS_BIBLE.md` → `scanguard-system/README.md`.
Dokumen kedua dan ketiga menurunkan keputusannya dari dokumen pertama,
bukan sebaliknya.

---

## Satu kalimat masalah

Penipuan QRIS tidak menyerang sistemnya — transfernya sah, banknya benar,
protokolnya aman. Yang diserang adalah **stiker kertas** dan **kebiasaan
orang menekan tombol tanpa membaca**. Solusi kriptografis saja tidak
menutup celah ini.

## Tiga tipe serangan (kerangka seluruh proyek)

| | Tipe A: diedit asal | Tipe B: dipalsukan total | Tipe C: asli, tempat salah |
|---|---|---|---|
| Contoh | stiker diutak-atik, kode pengaman tidak dihitung ulang | QR baru dibuat, kode pengaman valid, ke rekening penampung | QR sah milik toko sebelah ditempel di atas QR asli |
| Kode pengaman | gagal | lolos | lolos |
| Terdeteksi lewat | matematika (pasti) | identitas & riwayat (kemungkinan besar) | **hanya lewat pembeli** |

Tipe C — kasus Anam & Zikri, dua warung sebelahan yang tertukar pembayaran
lewat QR yang sama-sama sah — adalah kartu as proyek ini. Detailnya ada di
`01_DEFINISI_MASALAH.md` bagian 4.

## Bentuk produk: SDK, bukan aplikasi

Aplikasi di `scanguard-system/` bukan produk akhirnya. Produk sebenarnya adalah
lapisan verifikasi (SDK) yang seharusnya dipasang penyedia dompet digital
di layar konfirmasi mereka sendiri — orang tidak akan mau buka dua
aplikasi untuk beli es teh. Yang ada di repo ini adalah **implementasi
acuan** yang membuktikan lapisan itu bekerja, dengan mesin deteksi
(`scanguard-system/src/engine/`) yang ditulis agar bisa diekstrak jadi package
mandiri.

---

## Mulai cepat

```bash
cd scanguard-system
npm install
npm run test   # 31 test, termasuk 2 test yang membuktikan engine-nya benar
npm run dev    # buka browser, klik tombol "Coba contoh"
```

Penjelasan lengkap fitur, arsitektur, dan cara pengujian ada di
[`scanguard-system/README.md`](scanguard-system/README.md).
