# QRIS Guard

**HackNusa 2026 · Track 1: Secure Digital Payments & Fintech**

Bayar QRIS itu buta. Kamu scan stiker, tekan bayar, dan tidak pernah tahu
uangnya masuk ke mana. QRIS Guard mengisi tiga detik yang selama ini kosong
antara **scan** dan **bayar** — memeriksa isi kode, mencocokkan dengan riwayat
tempat, dan untuk transaksi berisiko, menanyakan nama toko ke pembeli
**sebelum** menampilkan siapa penerima sebenarnya.

Ini bukan aplikasi pembayaran. Ini implementasi acuan dari sebuah SDK
verifikasi yang seharusnya dipasang di dalam dompet digital yang sudah
dipakai orang — lihat [`01_DEFINISI_MASALAH.md`](../01_DEFINISI_MASALAH.md)
untuk kerangka lengkapnya.

---

## 60 detik untuk reviewer

```bash
npm install
npm run test    # 31 test, termasuk 2 test yang membuktikan engine ini benar
npm run dev     # buka http://localhost:5173, klik tombol di bawah "Coba contoh"
```

Klik berurutan di layar Scan:

1. **OK-01** → langsung hijau (SAFE). Merchant dikenal, kode utuh.
2. **BAD-01** → merah instan. Buka "Lihat Bukti teknis": dua kode CRC
   berdampingan, jelas beda — nama merchant diubah tapi kode pengamannya
   tidak dihitung ulang.
3. **BAD-03** → kode pengamannya **lolos** (CRC valid), tapi tetap tidak
   pernah SAFE — lapisan identitas menangkapnya karena NMID-nya asing.
   Ini test yang membuktikan "CRC valid" ≠ "aman".
4. **OVERLAY-01** — yang paling penting. Kode ini **sah 100%**, terdaftar
   resmi, CRC valid, tidak ada satupun yang dipalsukan. Aplikasi
   **menyembunyikan nama penerima** dan bertanya "Nama toko yang kamu
   datangi apa?". Ketik `ayam geprek anam` → layar merah menunjukkan
   niat vs kenyataan berdampingan: *"Kamu mau bayar ke **Ayam Geprek
   Anam**, tapi QR ini menuju **Ayam Geprek Zikri**."*

Poin 4 itu intinya. Tidak ada satupun cek matematis di dunia yang bisa
menangkap kasus itu dari isi kodenya saja — kode itu jujur. Satu-satunya
yang tahu tujuan sebenarnya adalah pembeli, jadi sistem bertanya kepadanya.

---

## Tiga jenis serangan yang ditangani

QRIS Guard sengaja memisahkan tiga masalah yang selama ini digabung jadi
satu label "QR palsu":

| | Tipe A — diedit asal | Tipe B — dipalsukan total | Tipe C — asli, tempat salah |
|---|---|---|---|
| Contoh | stiker diutak-atik, CRC tidak dihitung ulang | QR baru dibuat, CRC valid, ke rekening penampung | QR sah milik toko sebelah ditempel di atas QR asli |
| Kode pengaman (CRC) | **gagal** | lolos | lolos |
| Identitas merchant | tidak dikenal | tidak dikenal | **terdaftar sah** |
| Ditangkap oleh | Layer 1 (matematika) | Layer 2 (identitas) | **Layer 3 + tantangan nama** |
| Butuh pembeli ikut serta | tidak | tidak | **ya** |

Baris terakhir yang membedakan Tipe C dari dua lainnya: sistem ini tidak
bisa mendeteksinya sendirian, dan itu bukan kekurangan yang disembunyikan —
itu keterbatasan yang secara sadar didesain sekelilingnya (lihat bagian
"Yang sengaja kami akui" di bawah).

---

## Arsitektur

```
src/
  engine/          <- MESIN DETEKSI. Nol import UI. Bisa diekstrak jadi
                      package terpisah — inilah "produk sebenarnya".
    crc.ts           CRC-16/CCITT-FALSE
    parser.ts        Parser TLV EMVCo (walk tag-length-value)
    rules.ts         Layer 1-4: struktural, identitas, tempat, perilaku
    places.ts        Place memory (klaster koordinat + Haversine)
    names.ts         Pencocokan nama toko yang toleran typo
    scoring.ts        Skor -> level (SAFE / WARNING / DANGER)
    index.ts         evaluate(raw, ctx) -> Verdict — satu-satunya API publik

  data/            Fixture statis: merchant dikenal, NMID dilaporkan,
                   titik kota, tabel MCC. SEMUA DATA FIKTIF.

  copy/reasons.id.ts  String Bahasa Indonesia untuk tiap alasan (fallback
                      kalau LLM tidak tersedia — hasilnya identik)

  llm/explain.ts   Lapisan kosmetik: menerjemahkan verdict final ke
                   kalimat manusia. Tidak pernah mengubah keputusan.

  screens/         Scan, NameChallenge, Result, Bukti, Riwayat
  store.ts         Zustand — state di memori saja, tidak ada localStorage

tests/             31 test: crc, parser, rules (8 fixture akseptansi),
                   names, places (termasuk simulasi fire-rate)
fixtures/          fixtures.json — dihasilkan dari tools/qris_fixtures.py
tools/             Generator fixture asli (Python)
```

**Kenapa dipisah begini:** produk sebenarnya bukan aplikasi ini, tapi SDK
verifikasi yang dipasang penyedia dompet digital di layar konfirmasi
mereka. `src/engine/evaluate()` adalah kontrak publik yang harus bisa
dipanggil dari mana saja tanpa tahu apa-apa soal React atau kamera.

---

## Cara kerja pemeriksaan (empat lapis)

`evaluate(raw: string, ctx: Context): Verdict`

1. **Layer 1 — Struktural.** Parse TLV, hitung ulang CRC, cek format/negara/
   mata uang. Satu saja gagal → **DANGER instan**, tidak lanjut ke layer
   lain. Ini yang menangkap Tipe A: pasti, bukan tebakan.
2. **Layer 2 — Identitas.** NMID pernah dilaporkan? Formatnya wajar?
   Namanya mirip-mirip merchant terkenal (typo sengaja)? Menangkap
   sebagian besar Tipe B.
3. **Layer 3 — Tempat & konteks.** Titik koordinat ini biasanya dibayar ke
   NMID lain? Kota di kode jauh dari lokasi pembeli? Nominal aneh untuk
   jenis usahanya? Kalau kondisi tertentu terpenuhi, **`needsNameChallenge`
   jadi true** dan UI wajib bertanya sebelum menampilkan apa pun.
4. **Layer 3 (lanjutan) — Tantangan nama.** Setelah pembeli menjawab,
   jawabannya dicocokkan secara toleran (buang kata umum seperti "warung",
   "ayam", "geprek" — sisakan kata pembeda) terhadap nama di kode. Cocok →
   lanjut. Tidak cocok → **DANGER**, tampilkan niat vs kenyataan
   berdampingan.

Skor = jumlah bobot semua rule yang aktif (maks 100).
Level = **DANGER** kalau ada hit layer-1 atau severity danger apa pun,
**WARNING** kalau skor ≥ 30, selain itu **SAFE**.

Urutan pertanyaan **tidak boleh dibalik**: nama disembunyikan dulu, baru
ditanya, baru dicocokkan. Kalau nama ditampilkan duluan, pembeli cuma
menyalin layar — itu bukan verifikasi.

---

## Fitur per layar

| Layar | Isi |
|---|---|
| **Scan** | Kamera (html5-qrcode) dengan bingkai framing, tempel-dari-clipboard, dan 8 tombol "Coba contoh" — demo tidak pernah bergantung pada kamera yang berfungsi |
| **Tantangan Nama** | Muncul di antara scan dan hasil kalau dipicu. Satu pertanyaan, nama penerima **tidak dirender di mana pun** di layar ini. Ada jalan keluar "Saya tidak tahu" yang tetap lanjut dengan peringatan |
| **Hasil** | SAFE hijau langsung bisa bayar. WARNING kuning dengan **hitung mundur 7 detik** sebelum tombol bayar aktif — ini klaim produk yang sengaja, bukan aplikasi lambat. DANGER merah: tombol bayar diganti "Batalkan" / "Laporkan QR ini", plus tombol override yang **wajib ditahan 3 detik** (sistem yang tidak bisa di-override akan ditinggalkan penggunanya). Expander "Kenapa?" merinci tiap rule yang aktif dalam Bahasa Indonesia awam |
| **Bukti** | Tabel TLV tag demi tag, CRC tertulis vs CRC hitung ulang berdampingan, daftar pass/fail semua 19 rule, dan riwayat titik lokasi ini (kalau ada) — layar yang membuktikan sistem benar-benar membaca kodenya, bukan menyuruh percaya |
| **Riwayat** | Transaksi yang sudah diperiksa sesi ini. Di memori saja, hilang saat refresh |

---

## Yang sengaja kami akui (bukan bug, keterbatasan yang didesain)

- **CRC-16 adalah kode deteksi-galat, bukan tanda tangan digital.** Ia
  cuma menangkap penipu yang malas (Tipe A). Penipu yang niat bikin QR
  baru dengan CRC valid sempurna (Tipe B/C) tidak tersentuh cek ini sama
  sekali — itu sebabnya ada tiga layer lain.
- **GPS konsumen akurat ±10 meter; dua lapak sebelahan bisa berjarak
  3–5 meter.** Satu pembacaan koordinat **tidak bisa** membedakan Anam
  dari Zikri. Yang bisa dideteksi bukan "koordinat ini milik siapa",
  tapi "pola historis di titik ini berubah" — makanya rule tempat baru
  aktif setelah ≥5 kunjungan tercatat, dan tidak pernah sendirian
  menghasilkan DANGER (maksimal WARNING).
- **Deteksi Tipe C bergantung penuh pada kerja sama pembeli.** Kalau
  pembeli asal jawab atau pilih "Saya tidak tahu", sistem tidak bisa
  memaksa. Ini pilihan desain, bukan celah yang terlewat — sistem
  keamanan yang tidak bisa dilewati akan dimatikan penggunanya, dan
  sistem yang dimatikan melindungi nol orang.

---

## Cara menguji di lokal

### Prasyarat

- Node.js 20+ (dites dengan Node v24)
- npm

### Instal & jalankan

```bash
cd qris-guard
npm install
npm run dev
```

Buka URL yang ditampilkan (`http://localhost:5173` secara default).
Kamera browser butuh HTTPS atau `localhost` — kalau kamera tidak bisa
diaktifkan (umum di lingkungan headless/CI), pakai kolom "Tempel teks
QRIS" atau tombol-tombol "Coba contoh"; alur ini didesain untuk tidak
pernah bergantung pada kamera yang berfungsi.

### Jalankan semua test otomatis

```bash
npm run test
```

31 test di `tests/`, di antaranya:

- `crc.test.ts` — round-trip CRC pada 3 fixture sehat + **property test**:
  mengubah satu karakter apa pun (selain field CRC) pada fixture sehat
  harus menghasilkan CRC yang tidak cocok.
- `parser.test.ts` — parsing TLV, termasuk payload terpotong (BAD-02).
- `rules.test.ts` — **8 fixture akseptansi** dari `tools/qris_fixtures.py`
  langsung diuji lewat `evaluate()`. Dua yang paling menentukan:
  - **BAD-03**: CRC-nya valid. Kalau `evaluate()` mengembalikan SAFE,
    engine-nya salah.
  - **OVERLAY-01**: lolos semua cek struktural dan identitas (kodenya
    memang asli). Kalau `evaluate()` mengembalikan SAFE tanpa
    `needsNameChallenge = true`, engine-nya salah — inilah test yang
    membenarkan seluruh mekanisme tantangan nama.
- `names.test.ts` — pencocokan nama toleran-typo pada kasus Anam/Zikri
  persis, 5 baris tabel di dokumen desain.
- `places.test.ts` — place memory (Haversine, upsert, dominan NMID) dan
  **simulasi fire-rate**: 100 pembayaran di 8 titik yang sudah dikenal,
  tantangan nama harus muncul **kurang dari 10 kali**.

### Cek tipe & build produksi

```bash
npx tsc -b        # typecheck murni, tanpa emit
npm run build     # tsc -b && vite build -> dist/
npm run preview   # coba hasil build produksi
```

### Membuat ulang fixture (opsional)

Fixture di `fixtures/fixtures.json` dihasilkan dari
`tools/qris_fixtures.py` (skrip Python asli dari desain, disalin apa
adanya):

```bash
cd tools
python3 qris_fixtures.py
# pindahkan fixtures.json yang baru ke ../fixtures/fixtures.json
```

Semua NMID dan nama merchant di fixture ini **fiktif**, dibuat khusus
untuk menguji sistem sendiri — bukan data merchant asli siapa pun.

---

## Lapisan LLM (opsional, kosmetik murni)

`src/llm/explain.ts` memanggil Anthropic API **sekali**, setelah verdict
final terbentuk, hanya untuk menerjemahkan hasil ke kalimat manusia. Yang
dikirim cuma level, skor, dan daftar `reasonId` — **tidak pernah** payload
mentah atau koordinat. LLM tidak bisa mengubah, melunakkan, atau
membantah level risiko yang sudah diputuskan mesin deterministik.

Tanpa API key, atau kalau panggilannya gagal/timeout 2 detik, aplikasi
memakai teks bawaan dari `src/copy/reasons.id.ts` — hasilnya identik dari
sisi pengguna. Untuk mengaktifkan:

```bash
echo "VITE_ANTHROPIC_API_KEY=sk-ant-..." > .env.local
```

---

## Yang sengaja TIDAK dibangun (di tahap PoC ini)

| Tidak dibangun | Alasan |
|---|---|
| Deteksi stiker lewat foto (computer vision) | Butuh dataset yang tidak dimiliki; risiko demo gagal tinggi |
| Akun pengguna & backend penuh | Tidak menambah nilai di tahap pembuktian konsep |
| Integrasi API bank sungguhan | Di luar jangkauan lomba; mengklaimnya akan terbaca bohong |
| AI sebagai pengambil keputusan | Keputusan keamanan harus bisa dijelaskan dan diulang — AI cuma menerjemahkan |
| Sidik lokasi Wi-Fi | Lebih presisi dari GPS tapi butuh aplikasi Android asli — masuk peta jalan, bukan PoC ini |

Detail lengkap kerangka masalah, model bisnis, dan naskah pitching ada
di tiga dokumen di direktori induk repo ini:
[`01_DEFINISI_MASALAH.md`](../01_DEFINISI_MASALAH.md),
[`02_MEGA_PROMPT.md`](../02_MEGA_PROMPT.md),
[`03_BUSINESS_BIBLE.md`](../03_BUSINESS_BIBLE.md).
