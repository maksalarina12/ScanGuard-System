import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useQrisGuard } from "../store";
import { parseQris } from "../engine/parser";
import { reasonText } from "../copy/reasons.id";

const LEVEL_STYLES = {
  SAFE: { bg: "bg-safe/10", ring: "ring-safe/30", text: "text-safe", label: "AMAN" },
  WARNING: { bg: "bg-warning/10", ring: "ring-warning/30", text: "text-warning", label: "PERIKSA DULU" },
  DANGER: { bg: "bg-danger/10", ring: "ring-danger/30", text: "text-danger", label: "BAHAYA" },
} as const;

const HOLD_MS = 3000;
const COUNTDOWN_S = 7;

function formatIdr(amountTag: string | undefined): string | null {
  if (!amountTag) return null;
  const n = Number(amountTag);
  if (!Number.isFinite(n)) return null;
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

export default function ResultScreen() {
  const {
    finalVerdict,
    currentPayload,
    explainText,
    explainLoading,
    confirmPay,
    cancelPay,
    reportQr,
    nameAnswer,
    goTo,
  } = useQrisGuard(
    useShallow((s) => ({
      finalVerdict: s.finalVerdict,
      currentPayload: s.currentPayload,
      explainText: s.explainText,
      explainLoading: s.explainLoading,
      confirmPay: s.confirmPay,
      cancelPay: s.cancelPay,
      reportQr: s.reportQr,
      nameAnswer: s.nameAnswer,
      goTo: s.goTo,
    })),
  );

  const [showWhy, setShowWhy] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_S);
  const [holding, setHolding] = useState(0); // 0-100 progress on the hold-to-override button
  const holdTimer = useRef<number | null>(null);
  const holdStart = useRef<number>(0);

  useEffect(() => {
    setCountdown(COUNTDOWN_S);
    if (finalVerdict?.level !== "WARNING") return;
    const iv = window.setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(iv);
  }, [finalVerdict]);

  if (!finalVerdict || !currentPayload) {
    return (
      <div className="p-5 text-white/40 text-sm">Belum ada hasil pemeriksaan.</div>
    );
  }

  const parsed = parseQris(currentPayload);
  const style = LEVEL_STYLES[finalVerdict.level];
  const merchantName = parsed.tags["59"] ?? "(tidak diketahui)";
  const city = parsed.tags["60"] ?? "";
  const amount = formatIdr(parsed.tags["54"]);
  const nameMismatch = finalVerdict.hits.find((h) => h.ruleId === "L3_NAME_MISMATCH");

  function startHold() {
    holdStart.current = Date.now();
    holdTimer.current = window.setInterval(() => {
      const elapsed = Date.now() - holdStart.current;
      setHolding(Math.min(100, (elapsed / HOLD_MS) * 100));
      if (elapsed >= HOLD_MS) {
        stopHold();
        confirmPay();
      }
    }, 30);
  }
  function stopHold() {
    if (holdTimer.current) window.clearInterval(holdTimer.current);
    holdTimer.current = null;
    setHolding(0);
  }

  return (
    <div className="p-5 flex flex-col gap-5 h-full">
      <div className={`rounded-2xl ${style.bg} ring-1 ${style.ring} p-5`}>
        <span className={`text-xs font-bold tracking-wide ${style.text}`}>{style.label}</span>
        <h1 className="text-2xl font-semibold mt-1">{merchantName}</h1>
        {city && <p className="text-sm text-white/50">{city}</p>}
        {amount && <p className="text-3xl font-bold mt-3 tracking-tight">{amount}</p>}

        {nameMismatch && (
          <div className="mt-4 rounded-xl bg-black/30 p-3.5 text-sm leading-relaxed">
            Kamu mau bayar ke <span className="font-semibold text-white">{String(nameAnswer)}</span>, tapi
            QR ini menuju <span className="font-semibold text-white">{merchantName}</span>. Jangan bayar dulu.
          </div>
        )}

        <p className="text-sm text-white/70 mt-4 leading-relaxed">
          {explainLoading ? "Memuat penjelasan..." : explainText ?? finalVerdict.explain}
        </p>
      </div>

      <button
        onClick={() => setShowWhy((v) => !v)}
        className="text-left text-sm text-white/50 flex items-center justify-between rounded-xl bg-white/[0.03] ring-1 ring-white/10 px-4 py-3"
      >
        <span>Kenapa? ({finalVerdict.hits.length} pemeriksaan)</span>
        <span>{showWhy ? "▲" : "▼"}</span>
      </button>
      {showWhy && (
        <ul className="flex flex-col gap-2 -mt-2">
          {finalVerdict.hits.length === 0 && (
            <li className="text-xs text-white/40 px-4">Tidak ada masalah ditemukan.</li>
          )}
          {finalVerdict.hits.map((h, i) => (
            <li
              key={i}
              className="text-xs rounded-lg bg-white/[0.03] ring-1 ring-white/10 px-3.5 py-2.5 text-white/70"
            >
              <span
                className={
                  h.severity === "danger" ? "text-danger" : h.severity === "warning" ? "text-warning" : "text-white/40"
                }
              >
                ●
              </span>{" "}
              {reasonText(h.reasonId)}
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => goTo("bukti")}
        className="text-sm text-accent underline underline-offset-2 self-start"
      >
        Lihat Bukti teknis →
      </button>

      <div className="mt-auto flex flex-col gap-2">
        {finalVerdict.level === "SAFE" && (
          <button onClick={confirmPay} className="w-full rounded-xl bg-safe text-black py-3.5 text-sm font-semibold">
            Lanjut Bayar
          </button>
        )}

        {finalVerdict.level === "WARNING" && (
          <button
            onClick={confirmPay}
            disabled={countdown > 0}
            className="w-full rounded-xl bg-warning text-black py-3.5 text-sm font-semibold disabled:opacity-40"
          >
            {countdown > 0 ? `Tunggu ${countdown} detik...` : "Lanjut Bayar"}
          </button>
        )}

        {finalVerdict.level === "DANGER" && (
          <>
            <button onClick={cancelPay} className="w-full rounded-xl bg-white/10 py-3.5 text-sm font-semibold">
              Batalkan
            </button>
            <button
              onClick={reportQr}
              className="w-full rounded-xl bg-danger/15 text-danger py-3 text-sm font-medium"
            >
              Laporkan QR ini
            </button>
            <button
              onMouseDown={startHold}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={startHold}
              onTouchEnd={stopHold}
              className="relative w-full overflow-hidden rounded-xl bg-white/5 py-3 text-xs text-white/40"
            >
              <span
                className="absolute inset-y-0 left-0 bg-danger/20 transition-[width]"
                style={{ width: `${holding}%` }}
              />
              <span className="relative">Tahan 3 detik: Lanjut, saya yakin</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
