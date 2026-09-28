# Kontribusi ke ScanGuard System

## Format pesan commit

Repo ini memakai [Conventional Commits 1.0](https://www.conventionalcommits.org/).
Pesan commit ditulis dalam **bahasa Inggris**.

```
<type>(<scope>): <ringkasan>

<body — apa yang berubah dan kenapa>

<footer — BREAKING CHANGE:, Refs #123, Co-Authored-By:>
```

- **Ringkasan:** kalimat perintah ("add", bukan "added"/"adds"), huruf kecil
  di awal, tanpa titik di akhir, maksimal 72 karakter.
- **Body:** opsional untuk perubahan kecil. Jelaskan *kenapa*, bukan cuma
  *apa* — diff sudah menunjukkan apa. Bungkus di ±72 karakter; boleh pakai
  bullet `-`.
- **Footer:** `BREAKING CHANGE: ...` kalau kontrak `evaluate()` atau format
  data berubah; `Refs #<issue>` kalau terkait issue.

### Type

| Type | Kapan dipakai |
|---|---|
| `feat` | Kemampuan baru (rule baru, layar baru, field baru di verdict) |
| `fix` | Memperbaiki perilaku yang salah atau crash |
| `docs` | Hanya dokumentasi (README, file ini, komentar besar) |
| `test` | Menambah/memperbaiki test tanpa mengubah kode produksi |
| `refactor` | Mengubah struktur kode tanpa mengubah perilaku |
| `perf` | Mempercepat tanpa mengubah perilaku |
| `style` | Format/whitespace, tidak ada perubahan logika |
| `build` | Vite, TypeScript config, dependency |
| `ci` | Pipeline CI / deploy (mis. `vercel.json`) |
| `chore` | Pekerjaan rutin lain (fixture, aset, housekeeping) |

### Scope

| Scope | Area |
|---|---|
| `engine` | `src/engine/` — parser, CRC, rule, scoring, place memory |
| `store` | `src/store.ts` — alur state aplikasi |
| `ui` | `src/screens/`, `src/App.tsx` (selain Scan) |
| `scan` | `src/screens/Scan.tsx` — kamera, GPS, tempel teks |
| `data` | `src/data/`, `fixtures/`, `tools/` |
| `llm` | `src/llm/`, `src/copy/` |
| `readme` / `docs` | README / dokumen lain |
| `deps` | `package.json`, lockfile |

Scope boleh dikosongkan kalau perubahan lintas area: `docs: ...`.

### Contoh

```
fix(scan): stop camera once and read GPS per scan

html5-qrcode throws synchronously when stop() is called twice. The
decode callback and the effect cleanup both stopped the scanner, and
the uncaught throw unmounted the whole app (blank screen).
```

```
feat(engine): add L3_NAME_SKIPPED so skipping never ends in SAFE
```

| ❌ Hindari | ✅ Lebih baik |
|---|---|
| `update` | `fix(store): reset stale verdict on new scan` |
| `Fixed bug.` | `fix(ui): render BAD-02 result without crashing` |
| `feat: many changes` | pecah jadi beberapa commit, satu per urusan |

## Aturan commit

1. **Satu commit = satu urusan.** Kalau ringkasannya butuh kata "and" untuk
   dua hal yang tidak berhubungan, pecah jadi dua commit.
2. **Setiap commit harus lolos sendiri** — jalankan dari `scanguard-system/`
   sebelum commit:
   ```bash
   npx tsc -b && npm test && npm run lint
   ```
3. Jangan commit `.env.local` atau API key apa pun.

## Nama branch

`<type>/<deskripsi-singkat>`, contoh: `feat/postal-code-region`,
`fix/camera-double-stop`, `docs/contributing`.

## Setup template commit (sekali per clone)

Dari root repo:

```bash
git config commit.template .gitmessage
```

Setelah itu `git commit` (tanpa `-m`) membuka editor yang sudah berisi
panduan format di atas sebagai komentar.
