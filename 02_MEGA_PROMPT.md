# 02 — MEGA PROMPT (v2)

**Cara pakai:** copy seluruh isi file ini ke Claude Code / Cursor sebagai satu
pesan. Ditulis dalam bahasa Inggris karena coding agent lebih akurat membacanya.
Kalau kepanjangan, kirim per BLOCK.

**Berubah dari v1:** target user & attack types dibuat eksplisit (BLOCK 1),
tambah Place Memory (BLOCK 5) dan Name Challenge (BLOCK 6) untuk menangani
serangan Tipe C, urutan pengerjaan dirombak.

---

## BLOCK 0 — ROLE, PRODUCT FRAME, GROUND RULES

You are a senior full-stack engineer. Build **QRIS Guard**, a mobile-first web app
that inspects an Indonesian QRIS payment code **before** the user pays.

**Product frame — this affects your architecture decisions.** The real product is
a verification SDK meant to be embedded inside an existing e-wallet's confirmation
screen. What you are building is a *reference implementation* that proves the SDK
works. Therefore:

- The detection engine lives in `src/engine/` with **zero UI imports**. It must be
  extractable as a standalone package. Treat `evaluate()` as a public API.
- The UI is a thin demo shell around the engine, not the product.
- No user accounts, no backend, no server-side state.

**The user we are protecting:** a buyer paying Rp5,000–Rp500,000 at a small
merchant — a food stall, street vendor, parking attendant — using a **static
printed QR sticker**. Not e-commerce. Not bank transfers. This narrowness is
deliberate; do not generalise the design.

Hard constraints:

1. **48-hour build.** Boring proven tech. Single repo, single deploy.
2. **Deterministic engine.** All verdicts come from rules written in plain code.
   An LLM is used **only** to phrase a finished verdict in Indonesian. It must
   never decide, soften, or override a verdict. If the LLM is unavailable the app
   works identically with hardcoded copy.
3. **Core runs offline.** Parsing, CRC, place memory, and the name challenge
   require zero network calls. The demo must survive airplane mode.
4. **No real merchant data.** All NMIDs and merchant names in fixtures are fictional.
5. Every rule exposes `id`, `severity`, `reasonId`, and `evidence` so the UI can
   show *why*, not just *what*.
6. **Never block a payment outright unless layer 1 fails.** Everything else adds
   friction. False positives on honest merchants destroy the product.

Stack: React + Vite + TypeScript + Tailwind, `html5-qrcode` for camera,
`zustand` for state. In-memory only — **no localStorage, no sessionStorage.**

---

## BLOCK 1 — THE THREAT MODEL (read before writing any rule)

Three attack types. They are genuinely different problems. Do not collapse them.

### Type A — QR edited carelessly
Attacker changes bytes in the payload but does not recompute the checksum. Also
covers physically damaged or badly printed codes.
**Detection: certain.** Pure arithmetic.

### Type B — QR forged from scratch
Attacker generates a fresh, fully valid QR pointing at a mule account and prints
it on a sticker. Checksum passes perfectly.
**Detection: probable**, via unknown merchant identity, lookalike naming, or
place history. Never via the checksum.

### Type C — Genuine QR in the wrong place
Neighbouring merchant "Zikri" tapes his own legitimate, registered QRIS over
merchant "Anam's" sticker. Nothing is forged. The payload is honest.
**Detection: impossible from the payload alone.** The QR truthfully says "Zikri".
The only entity that knows the payment was meant for Anam is the buyer.

| | Type A | Type B | Type C |
|---|---|---|---|
| CRC | fails | passes | passes |
| Merchant identity | unknown | unknown | **legitimately registered** |
| Caught by | Layer 1 | Layers 2–3 | **Layers 3–4 only** |
| Needs buyer input | no | no | **yes** |

**Critical:** CRC-16 is an error-detecting code, not a signature. It catches Type A
only. Any design that treats a passing CRC as "safe" is wrong. Write the Type B
and Type C fixtures as failing tests *first*.

---

## BLOCK 2 — DOMAIN SPEC: THE QRIS PAYLOAD

EMVCo Merchant-Presented Mode. ASCII string of nested **Tag-Length-Value** blocks.
Tag = 2 digits, Length = 2 digits zero-padded, Value = exactly `length` chars.

Golden fixture (real, CRC-valid — use as your first test):

```
00020101021126660014ID.CO.QRIS.WWW011893600091122334455602151122334455667780303UMI51470014ID.CO.QRIS.WWW02189360009112233445560303UMI5204581253033605802ID5916WARUNG KOPI NUSA6007BANDUNG61054025762070703A0163045798
```

| Tag | Meaning | Notes |
|---|---|---|
| `00` | Payload format indicator | Must be `01` |
| `01` | Point of initiation | `11` = static, `12` = dynamic |
| `26`–`45` | Merchant account templates | Nested TLV |
| `51` | Domestic QRIS template | Nested TLV |
| `52` | Merchant category code | 4 digits, `5812` = food |
| `53` | Currency | `360` = IDR |
| `54` | Amount | Dynamic QR only |
| `55`/`56`/`57` | Tip indicator / fixed / percent | `55`=`03` = user-entered tip |
| `58` | Country | Must be `ID` |
| `59` | Merchant name | Max 25 chars |
| `60` | Merchant city | Max 15 chars |
| `61` | Postal code | |
| `62` | Additional data | `01` bill, `05` ref, `07` terminal |
| `63` | CRC | Always final 8 chars: `6304` + 4 hex |

Inside `26`/`51`: `00` = GUID (`ID.CO.QRIS.WWW`), `01`/`02` = NMID
(15–18 digits, starts `9360`), `03` = criteria (`UMI`/`UKE`/`UME`/`URE`).

**CRC-16/CCITT-FALSE.** Poly `0x1021`, init `0xFFFF`, no reflection, no xorout,
4 uppercase hex. Computed over the whole payload **including the literal `6304`**,
excluding the final 4 chars.

```ts
export function crc16(input: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(input)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
```

---

## BLOCK 3 — ENGINE INTERFACE

`src/engine/index.ts` exports:

```ts
export function evaluate(raw: string, ctx: Context): Verdict;

interface Context {
  coords?: { lat: number; lng: number; accuracyM: number };
  places: PlaceMemory[];        // see BLOCK 5
  history: PaidMerchant[];      // NMIDs this user has paid before
  reportedNmids: Set<string>;
  nameAnswer?: string;          // see BLOCK 6, second pass only
}

interface Verdict {
  level: "SAFE" | "WARNING" | "DANGER";
  score: number;                // 0-100, higher = riskier
  hits: RuleHit[];
  needsNameChallenge: boolean;  // true => UI must ask, then re-evaluate
  explain: string;              // LLM text, static fallback
}

interface RuleHit {
  ruleId: string;
  layer: 1 | 2 | 3 | 4;
  severity: "info" | "warning" | "danger";
  weight: number;
  reasonId: string;             // key into src/copy/reasons.id.ts
  evidence: Record<string, unknown>;
}
```

Scoring:

```
score = min(100, sum of hit weights)
level = DANGER  if any layer-1 hit OR any danger-severity hit
        WARNING if score >= 30
        SAFE    otherwise
```

---

## BLOCK 4 — RULES, LAYERS 1 & 2

**Layer 1 — Structural. Any hit ⇒ DANGER, weight 100. Catches Type A.**

| id | Condition |
|---|---|
| `L1_MALFORMED` | TLV walk fails or a declared length overruns the string |
| `L1_CRC_MISMATCH` | recomputed CRC ≠ trailing 4 chars |
| `L1_BAD_FORMAT` | tag `00` ≠ `01` |
| `L1_WRONG_COUNTRY` | tag `58` ≠ `ID` |
| `L1_WRONG_CURRENCY` | tag `53` ≠ `360` |
| `L1_NO_MERCHANT_ACCT` | no tag `26`–`45` and no tag `51` |

**Layer 2 — Identity. Catches Type B.**

| id | Condition | Severity | Weight |
|---|---|---|---|
| `L2_NMID_REPORTED` | NMID in `reportedNmids` | danger | 100 |
| `L2_NMID_MALFORMED` | NMID fails `/^9360\d{10,14}$/` | warning | 40 |
| `L2_NMID_UNKNOWN` | NMID absent from history and known list | warning | 25 |
| `L2_LOOKALIKE_NAME` | Levenshtein 1–2 from a known merchant name after normalising (uppercase, strip spaces, map `0→O` `1→I` `5→S` `3→E`) | warning | 35 |

---

## BLOCK 5 — PLACE MEMORY (new in v2)

This is what makes Type C detectable at all. Implement in `src/engine/places.ts`.

**Concept:** the app remembers *places*, not just merchants. A place is a
coordinate cluster plus the merchant identities historically seen there.

```ts
interface PlaceMemory {
  id: string;
  centroid: { lat: number; lng: number };
  samples: number;
  nmids: Record<string, { count: number; name: string; lastSeen: number }>;
}
```

On every completed payment, upsert: find the nearest place within 25 m of the
current coords (Haversine); if none, create one; then increment that NMID's count
and move the centroid by a running average.

**Honest limitation you must encode in the UI copy:** consumer GPS is accurate to
roughly 10 m, while adjacent stalls sit 3–5 m apart. A single reading **cannot**
separate Anam from Zikri. What *is* detectable is a change in the historical
pattern at a place with many samples. So:

- Never fire a place rule when `samples < 5` or `accuracyM > 30`.
- Never emit `danger` from a place rule alone — cap at `warning`.
- The rule that matters is *the dominant NMID at this place changed*, not
  *this coordinate belongs to this merchant*.

**Layer 3 — Place & context rules**

| id | Condition | Severity | Weight |
|---|---|---|---|
| `L3_PLACE_NMID_SWITCH` | place has ≥5 samples, ≥80% historically one NMID, scanned NMID differs | warning | 45 |
| `L3_GEO_CITY_MISMATCH` | tag `60` city centroid > 60 km from user coords | warning | 30 |
| `L3_MCC_AMOUNT_ANOMALY` | dynamic QR amount > 10× median for that MCC (static table) | warning | 20 |
| `L3_SUSPICIOUS_TIP` | tag `55` = `03` combined with unknown NMID | warning | 15 |

**Layer 4 — Behavioural**

| id | Condition | Severity | Weight |
|---|---|---|---|
| `L4_FIRST_TIME_PAYEE` | NMID never paid by this user | info | 10 |
| `L4_AMOUNT_OUTLIER` | amount > 5× user median | warning | 20 |
| `L4_RAPID_REPEAT` | 3 distinct NMIDs scanned within 90 s | warning | 15 |

---

## BLOCK 6 — NAME CHALLENGE (new in v2 — the Type C defence)

**The mechanism.** For risky payments the app hides the payee name and asks the
buyer to type the shop name they can see on the physical signboard. Only then does
it compare.

**Order is load-bearing and must not be changed.** If the name is displayed first
and the user is asked to retype it, they will copy the screen — that is not
verification, it is transcription. The source of truth must be the buyer's eyes.

```
scan → evaluate(pass 1) → needsNameChallenge?
   yes → hide payee, prompt "Nama tokonya apa?" → evaluate(pass 2 with nameAnswer)
   no  → show result
```

The UI **must not** render tag `59` anywhere on screen — not in a preview, not in
a toast, not in the detail panel — while the challenge is pending.

**Trigger conditions** (`needsNameChallenge = true` if any):
- no place memory for these coords, **or**
- `L2_NMID_UNKNOWN` fired, **or**
- `L3_PLACE_NMID_SWITCH` fired, **or**
- amount > 3× user median

If none fire, skip the challenge. **Target: fires on under 1 in 10 payments.**
A security step that appears every time gets switched off, and a switched-off
system protects nobody. Log the fire rate in dev mode so you can tune it.

**Matching — must be forgiving.** Merchants register as "ANAM JAYA MAKMUR" while
the signboard says "Ayam Geprek Anam". Exact matching would reject honest
merchants constantly.

```ts
const STOPWORDS = new Set(["toko","warung","kedai","depot","resto","cafe","kios",
  "ayam","geprek","nasi","mie","bakso","kopi","es","jaya","makmur","abadi",
  "sejahtera","berkah","barokah","indah","raya"]);

function significantTokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
    .filter(t => t.length >= 3 && !STOPWORDS.has(t));
}

// returns true (match), false (mismatch), or null (inconclusive)
function nameMatches(typed: string, fromQr: string): boolean | null {
  const a = significantTokens(typed), b = significantTokens(fromQr);
  if (!a.length || !b.length) return null;
  return a.some(x => b.some(y => levenshtein(x, y) <= 1));
}
```

Verified behaviour on the Anam/Zikri case — the stopword filter is what makes the
distinctive token survive:

| Buyer types | QR says | Result |
|---|---|---|
| "ayam geprek anam" | AYAM GEPREK ZIKRI | mismatch ✓ |
| "anam" | AYAM GEPREK ZIKRI | mismatch ✓ |
| "warung anam" | AYAM GEPREK ZIKRI | mismatch ✓ |
| "geprek anam" | AYAM GEPREK ZIKRI | mismatch ✓ |
| "ayam geprek zikri" | AYAM GEPREK ZIKRI | match ✓ |

**Layer 3 challenge rules**

| id | Condition | Severity | Weight |
|---|---|---|---|
| `L3_NAME_MISMATCH` | `nameMatches` returned false | danger | 100 |
| `L3_NAME_INCONCLUSIVE` | returned null (buyer typed only generic words) | warning | 20 |

On `L3_NAME_MISMATCH` the result screen must name both sides explicitly:

> "Kamu mau bayar ke **Ayam Geprek Anam**, tapi QR ini menuju **Ayam Geprek
> Zikri**. Jangan bayar dulu."

Give the buyer three actions: **Batalkan**, **Laporkan QR ini**, and
**Lanjut, saya yakin** (which requires holding the button for 3 seconds). Never
remove the escape hatch entirely — the buyer might have misread the signboard, and
a system that cannot be overridden gets abandoned.

---

## BLOCK 7 — LLM LAYER (cosmetic only)

After the verdict is final, call the Anthropic API once. Send only the verdict
object — never the raw payload, never coordinates.

```
Kamu penerjemah keamanan untuk aplikasi pembayaran Indonesia. Kamu menerima
hasil pemeriksaan yang SUDAH final. Tugasmu hanya menjelaskannya.

ATURAN KERAS:
- Jangan pernah mengubah, melunakkan, atau membantah level risiko yang diberikan.
- Maksimal 2 kalimat. Bahasa Indonesia sehari-hari, tanpa istilah teknis.
- Jangan sebut CRC, TLV, NMID, koordinat, atau nama tag apa pun.
- Kalau level DANGER, akhiri dengan satu tindakan konkret.
- Balas teks polos, tanpa markdown.
```

Every `reasonId` also needs a hardcoded Indonesian string in
`src/copy/reasons.id.ts`, used on failure or after a 2 s timeout.

---

## BLOCK 8 — UI SPEC

Five screens, mobile viewport 390×844, dark theme, one accent colour.

1. **Scan** — camera view with framing bracket, a paste-from-clipboard fallback,
   and a "Coba contoh" button loading the fixture set. The demo must never depend
   on a working camera.

2. **Name challenge** — appears between scan and result when triggered. One text
   field, one question: *"Nama toko yang kamu datangi apa?"* Payee name is not
   rendered anywhere on this screen. Add a "Saya tidak tahu / tidak ada papan
   nama" escape that proceeds with a warning.

3. **Result** — the money screen.
   - `SAFE` green: merchant, city, amount, "Lanjut Bayar"
   - `WARNING` amber: same, plus banner, plus **7-second countdown before the pay
     button activates**. This friction is a product claim — implement it literally.
   - `DANGER` red: pay button replaced by "Batalkan" and "Laporkan QR ini"
   Below the card, a "Kenapa?" expander listing each hit in plain Indonesian.

4. **Bukti** — the judge-impressing screen. Parsed TLV table tag by tag,
   recomputed CRC beside embedded CRC, per-rule pass/fail list, and the place
   memory record for these coords. Proves the system actually reads the code.

5. **Riwayat** — past scans and verdicts. In-memory only.

---

## BLOCK 9 — FIXTURES & ACCEPTANCE TESTS

Bundle the 8 fixtures from `tools/qris_fixtures.py`:

| ID | Scenario | Type | Expected |
|---|---|---|---|
| OK-01 | healthy static QR | — | SAFE |
| OK-02 | healthy dynamic QR Rp25.000 | — | SAFE |
| OK-03 | known merchant in history | — | SAFE |
| BAD-01 | name edited, CRC stale | A | DANGER `L1_CRC_MISMATCH` |
| BAD-02 | truncated payload | A | DANGER `L1_MALFORMED` |
| BAD-03 | re-forged QR, valid CRC, foreign NMID | B | DANGER / WARNING via layer 2 |
| BAD-04 | lookalike name + wrong city | B | WARNING |
| **OVERLAY-01** | **Zikri's genuine QR at Anam's place** | **C** | **needsNameChallenge = true; DANGER only after `L3_NAME_MISMATCH`** |

**The two tests that decide whether the engine is correct:**

- **BAD-03 passes CRC.** If your engine returns SAFE, the engine is wrong.
- **OVERLAY-01 passes every structural and identity check**, because it is a
  genuine registered QR. If your engine returns SAFE *without asking the name*,
  the engine is wrong. This is the test that justifies BLOCK 6 existing.

Also required:
- `crc16` round-trips on all 3 OK fixtures
- Property test: mutating any single character of an OK fixture (other than the
  CRC field) yields either a parse error or a CRC mismatch
- `nameMatches` passes all 5 rows of the table in BLOCK 6
- Fire-rate test: across a simulated 100-payment session with 8 known places, the
  name challenge triggers fewer than 10 times

---

## BLOCK 10 — BUILD ORDER

Strictly in this order. Confirm each step runs before continuing.

1. `crc16` + `parseTlv` + unit tests — **no UI at all**
2. Layers 1 & 2 + fixtures OK-01…BAD-04 passing
3. Result screen wired to fixtures with hardcoded verdicts
4. **Name challenge + OVERLAY-01 passing** ← the differentiator, do not defer it
5. Camera scanning
6. Place memory + layer 3 place rules
7. Layer 4 + Bukti screen
8. LLM explanation layer (last, optional polish)
9. README with a 60-second reviewer walkthrough

If time runs out, steps 1–4 alone are a complete, honest, demoable submission that
already covers all three attack types.

---

## BLOCK 11 — REPO OUTPUT

```
qris-guard/
  src/
    engine/{index.ts,crc.ts,parser.ts,rules.ts,places.ts,names.ts,scoring.ts}
    data/{known_merchants.json,reported_nmids.json,city_centroids.json,mcc_table.json}
    copy/reasons.id.ts
    screens/{Scan,NameChallenge,Result,Bukti,Riwayat}.tsx
    llm/explain.ts
  tests/{crc,parser,rules,names,places}.test.ts
  fixtures/fixtures.json
  tools/qris_fixtures.py
  README.md
```

README must state, in its own section: the CRC limitation from BLOCK 1, the GPS
resolution limitation from BLOCK 5, and the fact that Type C detection depends on
buyer cooperation. Judges reward teams who name their own weaknesses before being
asked.
