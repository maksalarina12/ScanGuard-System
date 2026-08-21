import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useScanGuard } from "../store";

export default function NameChallengeScreen() {
  const { submitNameAnswer, skipNameChallenge } = useScanGuard(
    useShallow((s) => ({
      submitNameAnswer: s.submitNameAnswer,
      skipNameChallenge: s.skipNameChallenge,
    })),
  );
  const [value, setValue] = useState("");

  return (
    <div className="p-5 flex flex-col gap-6 h-full">
      <div className="flex items-center gap-2 text-accent text-xs font-medium">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        Transaksi ini butuh pengecekan tambahan
      </div>

      <div>
        <h1 className="text-2xl font-semibold leading-snug">
          Nama toko yang kamu datangi apa?
        </h1>
        <p className="text-sm text-white/50 mt-2">
          Lihat papan nama atau spanduk di depanmu, lalu ketik nama tokonya.
          Kami akan bandingkan dengan data di kode QR — <span className="text-white/70">setelah</span> kamu menjawab.
        </p>
      </div>

      <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 px-3.5 py-3 text-xs text-white/40">
        Nama penerima disembunyikan sampai kamu menjawab. Ini bukan basa-basi —
        kalau ditampilkan duluan, kamu cuma akan menyalin layar.
      </div>

      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="misal: Ayam Geprek Anam"
        className="w-full rounded-xl bg-black/30 ring-1 ring-white/10 px-4 py-3.5 text-base placeholder:text-white/25 outline-none focus:ring-accent/60"
      />

      <div className="mt-auto flex flex-col gap-2">
        <button
          disabled={!value.trim()}
          onClick={() => submitNameAnswer(value.trim())}
          className="w-full rounded-xl bg-accent text-black py-3.5 text-sm font-semibold disabled:opacity-30"
        >
          Lanjutkan
        </button>
        <button
          onClick={skipNameChallenge}
          className="w-full rounded-xl py-3 text-sm text-white/40 active:text-white/60"
        >
          Saya tidak tahu / tidak ada papan nama
        </button>
      </div>
    </div>
  );
}
