import { useScanGuard } from "../store";

const LEVEL_DOT = {
  SAFE: "bg-safe",
  WARNING: "bg-warning",
  DANGER: "bg-danger",
} as const;

export default function RiwayatScreen() {
  const riwayat = useScanGuard((s) => s.riwayat);

  return (
    <div className="p-5 flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-semibold">Riwayat</h1>
        <p className="text-sm text-white/50 mt-0.5">Hanya tersimpan di perangkat ini, sesi ini saja.</p>
      </header>

      {riwayat.length === 0 ? (
        <p className="text-sm text-white/40 mt-8 text-center">Belum ada transaksi yang diperiksa.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {riwayat.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-xl bg-white/[0.03] ring-1 ring-white/10 px-3.5 py-3"
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${LEVEL_DOT[r.level]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{r.merchantName}</p>
                <p className="text-[11px] text-white/40">
                  {r.city} · {new Date(r.ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <span className="text-[10px] font-mono text-white/40">skor {r.score}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
