import { useShallow } from "zustand/react/shallow";
import { useQrisGuard } from "../store";
import { parseQris } from "../engine/parser";
import { findNearestPlace, dominantNmid } from "../engine/places";

const TAG_LABELS: Record<string, string> = {
  "00": "Payload format indicator",
  "01": "Point of initiation",
  "26": "Merchant account template",
  "51": "Domestic QRIS template",
  "52": "Merchant category code",
  "53": "Currency",
  "54": "Amount",
  "55": "Tip indicator",
  "58": "Country",
  "59": "Merchant name",
  "60": "Merchant city",
  "61": "Postal code",
  "62": "Additional data",
  "63": "CRC",
};

const ALL_RULE_IDS = [
  "L1_MALFORMED", "L1_CRC_MISMATCH", "L1_BAD_FORMAT", "L1_WRONG_COUNTRY",
  "L1_WRONG_CURRENCY", "L1_NO_MERCHANT_ACCT",
  "L2_NMID_REPORTED", "L2_NMID_MALFORMED", "L2_NMID_UNKNOWN", "L2_LOOKALIKE_NAME",
  "L3_PLACE_NMID_SWITCH", "L3_GEO_CITY_MISMATCH", "L3_MCC_AMOUNT_ANOMALY",
  "L3_SUSPICIOUS_TIP", "L3_NAME_MISMATCH", "L3_NAME_INCONCLUSIVE",
  "L4_FIRST_TIME_PAYEE", "L4_AMOUNT_OUTLIER", "L4_RAPID_REPEAT",
];

export default function BuktiScreen() {
  const { currentPayload, finalVerdict, pass1Verdict, currentCoords, places } = useQrisGuard(
    useShallow((s) => ({
      currentPayload: s.currentPayload,
      finalVerdict: s.finalVerdict,
      pass1Verdict: s.pass1Verdict,
      currentCoords: s.currentCoords,
      places: s.places,
    })),
  );

  if (!currentPayload) {
    return <div className="p-5 text-white/40 text-sm">Belum ada kode yang dipindai.</div>;
  }

  let parsed;
  try {
    parsed = parseQris(currentPayload);
  } catch {
    parsed = null;
  }

  const hits = finalVerdict?.hits ?? pass1Verdict?.hits ?? [];
  const firedIds = new Set(hits.map((h) => h.ruleId));
  const place = currentCoords ? findNearestPlace(places, currentCoords) : undefined;
  const dom = place ? dominantNmid(place) : undefined;

  return (
    <div className="p-5 flex flex-col gap-6 pb-8">
      <header>
        <h1 className="text-xl font-semibold">Bukti</h1>
        <p className="text-sm text-white/50 mt-0.5">Yang benar-benar dibaca sistem, apa adanya.</p>
      </header>

      <section>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Kode pengaman (CRC)</p>
        <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 p-4 grid grid-cols-2 gap-3 font-mono text-sm">
          <div>
            <p className="text-[10px] text-white/40 mb-0.5">Tertulis di kode</p>
            <p>{parsed?.crcClaimed ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/40 mb-0.5">Hasil hitung ulang</p>
            <p className={parsed?.crcValid ? "text-safe" : "text-danger"}>{parsed?.crcComputed ?? "—"}</p>
          </div>
        </div>
        <p className={`text-xs mt-2 ${parsed?.crcValid ? "text-safe" : "text-danger"}`}>
          {parsed?.crcValid ? "Cocok — kode belum diubah sejak dicetak." : "Tidak cocok — isinya sudah diubah."}
        </p>
      </section>

      <section>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Isi kode, tag demi tag</p>
        {parsed ? (
          <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 divide-y divide-white/5">
            {parsed.order.map((node, i) => (
              <div key={i} className="flex items-start gap-3 px-3.5 py-2.5">
                <span className="font-mono text-xs text-accent/80 w-7 shrink-0">{node.tag}</span>
                <div className="min-w-0">
                  <p className="text-[10px] text-white/40">{TAG_LABELS[node.tag] ?? "Tag lain"}</p>
                  <p className="text-xs break-all font-mono text-white/80">{node.value}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-danger">Struktur tidak bisa dibaca — kode ini rusak.</p>
        )}
      </section>

      <section>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">
          Daftar pemeriksaan ({hits.length} aktif dari {ALL_RULE_IDS.length})
        </p>
        <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 divide-y divide-white/5">
          {ALL_RULE_IDS.map((id) => {
            const fired = firedIds.has(id);
            return (
              <div key={id} className="flex items-center justify-between px-3.5 py-2 text-xs">
                <span className="font-mono text-white/60">{id}</span>
                <span className={fired ? "text-danger" : "text-safe"}>{fired ? "AKTIF" : "aman"}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Riwayat titik lokasi ini</p>
        {!currentCoords ? (
          <p className="text-xs text-white/40">Tidak ada data lokasi untuk transaksi ini.</p>
        ) : !place ? (
          <p className="text-xs text-white/40">Ini kali pertama tercatat di titik koordinat ini.</p>
        ) : (
          <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 p-4 text-xs space-y-1.5">
            <p>Jumlah kunjungan tercatat: <span className="text-white">{place.samples}</span></p>
            {dom && (
              <p>
                Merchant dominan di titik ini: <span className="text-white">{place.nmids[dom.nmid]?.name}</span>{" "}
                ({Math.round(dom.share * 100)}% dari kunjungan)
              </p>
            )}
            <p className="text-white/40 pt-1">
              GPS konsumen akurat ±10 m; dua lapak sebelahan bisa berjarak 3–5 m. Satu titik koordinat
              tidak bisa membedakan keduanya — yang dipakai adalah perubahan pola di titik ini.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
