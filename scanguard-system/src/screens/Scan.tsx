import { useEffect, useRef, useState } from "react";
import { useScanGuard } from "../store";
import { FIXTURES, DEMO_COORDS_BY_FIXTURE } from "../demo/seed";

const EXPECTED_BADGE: Record<string, string> = {
  SAFE: "bg-safe/15 text-safe",
  WARNING: "bg-warning/15 text-warning",
  DANGER: "bg-danger/15 text-danger",
  CHALLENGE: "bg-accent/15 text-accent",
};

export default function ScanScreen() {
  const scan = useScanGuard((s) => s.scan);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pasteValue, setPasteValue] = useState("");
  const regionRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);

  useEffect(() => {
    if (!cameraOn) return;
    let cancelled = false;

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
            scan(decoded);
            scanner.stop().catch(() => {});
            setCameraOn(false);
          },
          () => {},
        );
      } catch (err) {
        if (!cancelled) {
          setCameraError("Kamera tidak tersedia. Pakai tempel teks atau contoh di bawah.");
          setCameraOn(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      scannerRef.current?.stop().catch(() => {});
    };
  }, [cameraOn, scan]);

  return (
    <div className="p-5 flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">ScanGuard System</h1>
        <p className="text-sm text-white/50 mt-0.5">Periksa dulu, baru bayar.</p>
      </header>

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
            disabled={!pasteValue.trim()}
            onClick={() => {
              scan(pasteValue.trim());
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
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${EXPECTED_BADGE[fx.expected]}`}>
                  {fx.expected}
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
