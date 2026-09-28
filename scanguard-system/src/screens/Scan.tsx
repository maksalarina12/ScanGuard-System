import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useScanGuard, isChallengePending } from "../store";
import type { Coords } from "../engine/types";
import { FIXTURES, DEMO_COORDS_BY_FIXTURE, DEMO_BADGE_OVERRIDE } from "../demo/seed";

/** One GPS reading for the scan at hand. Resolves undefined when location is
 * unavailable or denied — the engine then treats the spot as unknown (and
 * asks the name), which is the honest answer. Stays offline: no network. */
function currentCoords(): Promise<Coords | undefined> {
  if (!("geolocation" in navigator)) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    // The API's own `timeout` only starts once permission is granted — an
    // unanswered permission prompt would otherwise stall the scan forever.
    const guard = window.setTimeout(() => resolve(undefined), 5000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(guard);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: pos.coords.accuracy });
      },
      () => {
        window.clearTimeout(guard);
        resolve(undefined);
      },
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 30_000 },
    );
  });
}

type Scanner = import("html5-qrcode").Html5Qrcode;

/** html5-qrcode's stop() throws *synchronously* (not a rejected promise) when
 * the scanner is not running or a stop is already in flight. Uncaught, that
 * throw inside an effect cleanup unmounts the whole app — a blank screen. */
async function stopScanner(scanner: Scanner) {
  try {
    await scanner.stop();
  } catch {
    /* already stopped or stopping */
  }
}

const OUTCOME_TEXT = {
  dibayar: "Pembayaran dilanjutkan (simulasi). Tempat ini dicatat di riwayat lokasi.",
  dibatalkan: "Pembayaran dibatalkan.",
  dilaporkan: "QR dilaporkan. Nomor merchant ini akan ditandai di pemindaian berikutnya.",
} as const;

const EXPECTED_BADGE: Record<string, string> = {
  SAFE: "bg-safe/15 text-safe",
  WARNING: "bg-warning/15 text-warning",
  DANGER: "bg-danger/15 text-danger",
  CHALLENGE: "bg-accent/15 text-accent",
};

export default function ScanScreen() {
  const { scan, goTo, lastOutcome, challengePending } = useScanGuard(
    useShallow((s) => ({
      scan: s.scan,
      goTo: s.goTo,
      lastOutcome: s.lastOutcome,
      challengePending: isChallengePending(s),
    })),
  );
  const [locating, setLocating] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pasteValue, setPasteValue] = useState("");
  const regionRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Scanner | null>(null);

  const scanHere = useCallback(
    async (payload: string) => {
      setLocating(true);
      const coords = await currentCoords();
      setLocating(false);
      scan(payload, coords);
    },
    [scan],
  );

  useEffect(() => {
    if (!cameraOn) return;
    let cancelled = false;
    let decodedOnce = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled || !regionRef.current) return;
        const id = "qr-camera-region";
        regionRef.current.id = id;
        const scanner = new Html5Qrcode(id);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            // At 10 fps the same code is decoded several times before the
            // camera closes; only the first read counts. Stopping happens
            // exactly once, in the effect cleanup triggered by setCameraOn.
            if (decodedOnce) return;
            decodedOnce = true;
            setCameraOn(false);
            void scanHere(decoded.trim());
          },
          () => {},
        );
        // Camera was switched off while start() was still pending.
        if (cancelled) void stopScanner(scanner);
      } catch {
        if (!cancelled) {
          setCameraError("Kamera tidak tersedia. Pakai tempel teks atau contoh di bawah.");
          setCameraOn(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) void stopScanner(scanner);
    };
  }, [cameraOn, scanHere]);

  return (
    <div className="p-5 flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">ScanGuard System</h1>
        <p className="text-sm text-white/50 mt-0.5">Periksa dulu, baru bayar.</p>
      </header>

      {challengePending && (
        <button
          onClick={() => goTo("challenge")}
          className="text-left rounded-xl bg-accent/10 ring-1 ring-accent/30 px-4 py-3 text-sm text-accent"
        >
          Ada pemeriksaan yang belum selesai. Jawab pertanyaan nama toko →
        </button>
      )}
      {lastOutcome && (
        <p className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 px-4 py-3 text-xs text-white/60">
          {OUTCOME_TEXT[lastOutcome]}
        </p>
      )}
      {locating && <p className="text-xs text-accent">Membaca lokasi...</p>}

      <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-4">
        <div className="relative aspect-square w-full rounded-xl bg-black/40 overflow-hidden flex items-center justify-center">
          {cameraOn ? (
            <div ref={regionRef} className="w-full h-full" />
          ) : (
            <div className="text-center px-6">
              <div className="mx-auto mb-3 h-24 w-24 rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center text-3xl text-white/30">
                ▢
              </div>
              <p className="text-xs text-white/40">Kamera belum aktif</p>
            </div>
          )}
          <FramingBracket />
        </div>
        <button
          onClick={() => {
            setCameraError(null);
            setCameraOn((v) => !v);
          }}
          className="mt-4 w-full rounded-xl bg-accent/15 text-accent py-2.5 text-sm font-medium active:bg-accent/25"
        >
          {cameraOn ? "Matikan kamera" : "Aktifkan kamera"}
        </button>
        {cameraError && <p className="mt-2 text-xs text-danger">{cameraError}</p>}
      </section>

      <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-4">
        <p className="text-sm font-medium mb-2">Tempel teks QRIS</p>
        <textarea
          value={pasteValue}
          onChange={(e) => setPasteValue(e.target.value)}
          placeholder="Tempel isi QR di sini..."
          rows={2}
          className="w-full resize-none rounded-lg bg-black/30 ring-1 ring-white/10 px-3 py-2 text-xs font-mono placeholder:text-white/30 outline-none focus:ring-accent/60"
        />
        <div className="mt-2 flex gap-2">
          <button
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                setPasteValue(text);
              } catch {
                /* clipboard permission denied — user can paste manually */
              }
            }}
            className="flex-1 rounded-lg bg-white/5 py-2 text-xs text-white/70 active:bg-white/10"
          >
            Ambil dari clipboard
          </button>
          <button
            disabled={!pasteValue.trim() || locating}
            onClick={() => {
              void scanHere(pasteValue.trim());
              setPasteValue("");
            }}
            className="flex-1 rounded-lg bg-accent text-black py-2 text-xs font-semibold disabled:opacity-30"
          >
            Periksa
          </button>
        </div>
      </section>

      <section>
        <p className="text-sm font-medium mb-2 text-white/70">Coba contoh</p>
        <div className="grid grid-cols-1 gap-2">
          {FIXTURES.map((fx) => (
            <button
              key={fx.id}
              onClick={() => scan(fx.payload, DEMO_COORDS_BY_FIXTURE[fx.id])}
              className="text-left rounded-xl bg-white/[0.03] ring-1 ring-white/10 px-3.5 py-3 active:bg-white/[0.06]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{fx.id}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${EXPECTED_BADGE[DEMO_BADGE_OVERRIDE[fx.id] ?? fx.expected]}`}>
                  {DEMO_BADGE_OVERRIDE[fx.id] ?? fx.expected}
                </span>
              </div>
              <p className="text-xs text-white/45 mt-0.5">{fx.label}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function FramingBracket() {
  return (
    <div className="pointer-events-none absolute inset-6">
      {(["tl", "tr", "bl", "br"] as const).map((corner) => (
        <span
          key={corner}
          className={`absolute h-6 w-6 border-accent/70 ${
            corner === "tl" ? "top-0 left-0 border-t-2 border-l-2 rounded-tl-lg" : ""
          }${corner === "tr" ? "top-0 right-0 border-t-2 border-r-2 rounded-tr-lg" : ""}${
            corner === "bl" ? "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg" : ""
          }${corner === "br" ? "bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg" : ""}`}
        />
      ))}
    </div>
  );
}
