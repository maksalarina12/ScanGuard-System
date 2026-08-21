# 01 — DEFINISI MASALAH

**ScanGuard System · HackNusa 2026 · Track 1: Secure Digital Payments & Fintech**

> Dokumen ini dibaca duluan. Kalau ada yang bingung "sebenarnya kita bikin apa
> dan buat siapa", jawabannya di sini. Mega Prompt dan Business Bible menurunkan
> dari dokumen ini, bukan sebaliknya.

---

## 1. Satu kalimat masalah

**Saat membayar QRIS di warung, pembeli tidak punya cara apa pun untuk memastikan
uangnya masuk ke warung yang sedang dia datangi.**

Itu saja. Kalau kalimat ini tidak muncul di menit pertama video, videonya salah.

---

## 2. Momen yang kami sasar

Bukan seluruh proses pembayaran. Cuma **tiga detik**:

```
[scan QR] → ??? → [tekan bayar] → uang keluar
             ↑
        di sini kosong
```

Sebelum "scan": urusan merchant.
Sesudah "bayar": urusan bank, dan sudah terlambat.
Di antaranya: tidak ada siapa-siapa. Itu wilayah kami.

Kenapa penting: penipuan QRIS **tidak menyerang sistemnya**. Sistem QRIS-nya
baik-baik saja, transfernya sah, banknya benar. Yang diserang adalah **stiker
kertas** dan **kebiasaan orang menekan tombol tanpa membaca**.

---

## 3. Siapa yang kami layani

Bedakan tiga peran ini. Sering tertukar saat pitching.

| Peran | Siapa | Perannya |
|---|---|---|
| **Pengguna** | Pembeli QRIS harian, 18–40 tahun, transaksi Rp5.000–Rp500.000 di warung/kaki lima/parkir | Orang yang dilindungi. Tidak bayar apa pun. |
| **Pembeli produk** | Penyedia dompet digital, bank, acquirer QRIS | Yang menandatangani kontrak dan membayar |
| **Korban tersembunyi** | Merchant jujur seperti "Anam" | Kehilangan omzet tanpa pernah sadar. Sekutu terkuat kami. |

**Yang bukan target kami:** e-commerce, transfer antarbank, pembayaran tagihan,
QRIS korporat besar. Semua itu punya lapisan pengaman sendiri. Kami khusus
**merchant kecil dengan QR stiker statis** — justru segmen paling rapuh dan
paling banyak.

Persona utama, sebut namanya saat pitching:

> **Ko**, 24 tahun, mahasiswa. Bayar QRIS 5–8 kali sehari. Tidak pernah membaca
> nama penerima. Kalau ditanya kenapa, jawabannya jujur: *"ya karena antre,
> dan selama ini nggak pernah kenapa-kenapa."*

---

## 4. Tiga jenis serangan — pisahkan, jangan digabung

Ini bagian terpenting dokumen ini. Selama ini kami menyebut semuanya
"QR palsu", padahal tiga hal yang sangat berbeda dan butuh pertahanan berbeda.

### Tipe A — QR diedit sembarangan
Penipu mengubah isi QR (nama/tujuan) tapi tidak memperbaiki kode pengaman di
dalamnya. Juga mencakup QR yang rusak, sobek, atau hasil cetak jelek.
→ **Terdeteksi pasti.** Matematika, bukan tebakan.

### Tipe B — QR palsu dibuat ulang dari nol
Penipu membuat QR baru yang sah secara teknis, kode pengaman valid sempurna,
mengarah ke rekening penampung. Ditempel di atas QR asli.
→ **Terdeteksi kemungkinan besar**, lewat identitas merchant yang asing,
nama yang mirip-mirip, atau riwayat lokasi. Bukan lewat kode pengaman.

### Tipe C — QR asli, tapi di tempat yang salah
Kasus Zikri. QRIS resmi milik Zikri, terdaftar sah, ditempel di atas QR Anam.
Tidak ada satu pun yang dipalsukan.
→ **Tidak bisa dideteksi dari isi QR sama sekali.** Isinya jujur.
Satu-satunya jalan: sistem harus tahu **niat pembeli** dan **riwayat tempat**.

### Tabel kejujuran — hafalkan ini untuk sesi tanya jawab

| | Tipe A | Tipe B | Tipe C |
|---|---|---|---|
| Kode pengaman | gagal | lolos | lolos |
| Identitas merchant | tidak dikenal | tidak dikenal | **terdaftar sah** |
| Deteksi otomatis | pasti | kemungkinan besar | tidak bisa sendirian |
| Butuh pembeli ikut serta | tidak | tidak | **ya** |
| Bisa dilacak pelakunya | sulit | sulit | **mudah** |

Baris terakhir itu senjata. Pelaku Tipe C memakai identitas resminya sendiri.
Sekali dilaporkan, dia habis.

---

## 5. Kenapa solusi yang ada tidak menutup celah ini

| Yang ada | Kenapa tidak cukup |
|---|---|
| Deteksi fraud di sisi bank | Bekerja setelah uang keluar. Bagus untuk pengembalian dana, bukan pencegahan. |
| Database rekening penipu | Harus dicari manual, dan berbasis nomor rekening — bukan QR. Tidak ada yang membuka situs itu saat antre. |
| Nama penerima di aplikasi dompet | Sudah ada, tapi tampil sekilas di layar konfirmasi, dan tidak dibandingkan dengan apa pun. Ko membacanya nol kali. |
| Edukasi anti-penipuan | Terjadi di ruang kelas, bukan di detik keputusan. |

**Kesimpulannya:** semua solusi hadir *sebelum* atau *sesudah*, tidak ada yang
hadir *pada saat*.

---

## 6. Solusi kami dalam tiga lapis

**Lapis 1 — Baca isi QR.** Otomatis, instan, offline. Menangkap Tipe A.

**Lapis 2 — Kenali merchant dan tempat.** Identitas merchant dicocokkan dengan
riwayat: pernahkah dibayar sebelumnya, pernahkah dilaporkan, cocokkah dengan
titik lokasi ini. Menangkap Tipe B dan sebagian Tipe C.

**Lapis 3 — Tanya pembeli.** Untuk transaksi berisiko, aplikasi
**menyembunyikan** nama penerima dan meminta pembeli mengetik nama toko yang
dia lihat di spanduk. Baru dicocokkan. Menangkap Tipe C.

Urutan Lapis 3 tidak boleh dibalik. Kalau nama ditampilkan dulu lalu disuruh
ketik ulang, pembeli cuma menyalin layar — itu bukan verifikasi. Sumber
kebenaran harus datang dari mata pembeli, bukan dari layar.

Aturan pemicu Lapis 3 (jangan setiap transaksi, orang akan berhenti pakai):
- pertama kali di titik lokasi ini, **atau**
- identitas merchant tidak dikenal, **atau**
- nominal jauh di atas kebiasaan pengguna

---

## 7. Bentuk produknya: sistem, bukan aplikasi

Keputusan penting, dan harus konsisten di semua dokumen.

Sebagai aplikasi terpisah, ini tidak akan dipakai siapa pun. Tidak ada yang mau
buka dua aplikasi untuk satu kali bayar es teh. Dan momen verifikasinya ada di
layar konfirmasi dompet digital — layar yang bukan milik kami.

Jadi:

- **Produk sebenarnya** = SDK / lapisan verifikasi yang dipasang penyedia dompet
- **Aplikasi yang kami bangun** = bukti bahwa lapisan itu bekerja
- **Aset jangka panjang** = data laporan lintas-dompet, karena GoPay tidak akan
  berbagi daftar merchant penipu dengan OVO, tapi keduanya bisa berbagi dengan
  pihak netral

Kalimat pitching-nya: *"Yang kami bangun bukan aplikasi. Yang kami bangun
standar. Aplikasi ini cara kami membuktikan standarnya jalan."*

---

## 8. Ukuran keberhasilan

Kalau juri tanya "sukses itu seperti apa", jangan jawab "banyak pengguna".

| Ukuran | Target |
|---|---|
| Tipe A tertangkap | 100% (deterministik) |
| Tipe C tertangkap saat Lapis 3 aktif | > 80% dalam uji pengguna |
| Salah tuduh pada merchant sah | < 2% |
| Tambahan waktu untuk transaksi normal | < 1 detik |
| Frekuensi Lapis 3 muncul | < 1 dari 10 transaksi |

Angka terakhir yang paling menentukan. Sistem keamanan yang mengganggu terus
akan dimatikan penggunanya, dan sistem yang dimatikan melindungi nol orang.

---

## 9. Yang sengaja TIDAK kami bangun

Siapkan jawaban ini, pasti ditanya.

| Tidak dibangun | Alasan |
|---|---|
| Deteksi stiker lewat foto (computer vision) | Butuh dataset yang tidak kami punya. Akurasi rendah, risiko demo gagal tinggi. |
| Akun pengguna dan backend penuh | Tidak menambah nilai di tahap PoC. |
| Integrasi API bank sungguhan | Mustahil dalam kerangka lomba. Mengklaimnya akan langsung terbaca bohong. |
| AI sebagai pengambil keputusan | Keputusan keamanan harus bisa dijelaskan dan diulang. AI hanya menerjemahkan hasil ke bahasa manusia. |
| Sidik lokasi lewat Wi-Fi | Ketelitiannya bagus, tapi butuh aplikasi Android asli. Masuk roadmap, bukan PoC. |

---

## 10. Kalimat-kalimat siap pakai

Hafalkan. Ini yang keluar saat gugup.

**Masalah:** *"Bayar QRIS itu buta. Kamu scan stiker, tekan bayar, dan tidak
pernah tahu uangnya ke mana."*

**Solusi:** *"Kami mengisi tiga detik yang selama ini kosong antara scan dan
bayar."*

**Kalau ditanya soal kode pengaman:** *"Kode pengaman cuma menangkap penipu
yang malas. Yang niat bikin QR valid. Makanya kami berlapis."*

**Kalau ditanya kasus Zikri:** *"QR-nya asli, jadi tidak ada yang bisa dideteksi
dari isinya. Yang tahu tujuan sebenarnya cuma pembeli. Jadi kami tanya dia —
tapi kami tanya sebelum menampilkan jawabannya."*

**Kalau ditanya kenapa bukan aplikasi:** *"Karena tidak ada yang mau buka dua
aplikasi buat beli es teh. Ini harus ada di dalam dompet digitalnya."*
