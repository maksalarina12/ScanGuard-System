import { useShallow } from "zustand/react/shallow";
import { useScanGuard, isChallengePending } from "./store";
import ScanScreen from "./screens/Scan";
import NameChallengeScreen from "./screens/NameChallenge";
import ResultScreen from "./screens/Result";
import BuktiScreen from "./screens/Bukti";
import RiwayatScreen from "./screens/Riwayat";

function ScreenSwitch() {
  const screen = useScanGuard((s) => s.screen);
  const verdictId = useScanGuard((s) => s.currentRiwayatId);
  switch (screen) {
    case "scan":
      return <ScanScreen />;
    case "challenge":
      return <NameChallengeScreen />;
    case "result":
      // Keyed per verdict so the WARNING countdown and hold state start fresh.
      return <ResultScreen key={verdictId} />;
    case "bukti":
      return <BuktiScreen />;
    case "riwayat":
      return <RiwayatScreen />;
  }
}

function BottomNav() {
  const { screen, goTo, currentPayload, challengePending } = useScanGuard(
    useShallow((s) => ({
      screen: s.screen,
      goTo: s.goTo,
      currentPayload: s.currentPayload,
      challengePending: isChallengePending(s),
    })),
  );

  const items: { id: "scan" | "bukti" | "riwayat"; label: string; icon: string; disabled?: boolean }[] = [
    { id: "scan", label: "Scan", icon: "▢" },
    { id: "bukti", label: "Bukti", icon: "≡", disabled: !currentPayload || challengePending },
    { id: "riwayat", label: "Riwayat", icon: "◷" },
  ];

  return (
    <nav className="flex border-t border-white/10 bg-[#0d1117]">
      {items.map((item) => (
        <button
          key={item.id}
          disabled={item.disabled}
          onClick={() => goTo(item.id)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors ${
            screen === item.id ? "text-accent" : "text-white/40"
          } ${item.disabled ? "opacity-30" : "active:text-accent"}`}
        >
          <span className="text-lg leading-none">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export default function App() {
  return (
    <div className="min-h-dvh w-full flex items-center justify-center bg-[#05070a] sm:py-4">
      <div className="w-full max-w-[390px] h-dvh sm:h-[844px] sm:max-h-dvh flex flex-col bg-[#0a0e14] text-white sm:rounded-[28px] overflow-hidden shadow-2xl shadow-black/60 sm:ring-1 ring-white/10">
        <div className="flex-1 overflow-y-auto">
          <ScreenSwitch />
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
