import { create } from "zustand";
import { evaluate } from "./engine";
import { parseQris } from "./engine/parser";
import { upsertPlace } from "./engine/places";
import type { Context, PaidMerchant, PlaceMemory, Verdict } from "./engine/types";
import reportedNmidsSeed from "./data/reported_nmids.json";
import { buildInitialPlaces, buildInitialHistory } from "./demo/seed";
import { explainVerdict } from "./llm/explain";

export type Screen = "scan" | "challenge" | "result" | "bukti" | "riwayat";

export interface RiwayatEntry {
  id: string;
  ts: number;
  merchantName: string;
  city: string;
  level: Verdict["level"];
  score: number;
}

interface ScanGuardState {
  screen: Screen;
  currentPayload?: string;
  currentCoords?: Context["coords"];
  pass1Verdict?: Verdict;
  finalVerdict?: Verdict;
  nameAnswer?: string;
  explainText?: string;
  explainLoading: boolean;

  places: PlaceMemory[];
  history: PaidMerchant[];
  reportedNmids: Set<string>;
  riwayat: RiwayatEntry[];

  goTo: (screen: Screen) => void;
  scan: (payload: string, coords?: Context["coords"]) => void;
  submitNameAnswer: (name: string) => void;
  skipNameChallenge: () => void;
  confirmPay: () => void;
  cancelPay: () => void;
  reportQr: () => void;
  resetToScan: () => void;
}

function buildContext(state: ScanGuardState, nameAnswer?: string): Context {
  return {
    coords: state.currentCoords,
    places: state.places,
    history: state.history,
    reportedNmids: state.reportedNmids,
    nameAnswer,
  };
}

function runExplain(verdict: Verdict, set: (fn: (s: ScanGuardState) => Partial<ScanGuardState>) => void) {
  set(() => ({ explainLoading: true }));
  explainVerdict(verdict).then((text) => {
    set(() => ({ explainText: text, explainLoading: false }));
  });
}

export const useScanGuard = create<ScanGuardState>((set, get) => ({
  screen: "scan",
  currentPayload: undefined,
  currentCoords: undefined,
  pass1Verdict: undefined,
  finalVerdict: undefined,
  nameAnswer: undefined,
  explainText: undefined,
  explainLoading: false,

  places: buildInitialPlaces(),
  history: buildInitialHistory(),
  reportedNmids: new Set<string>(reportedNmidsSeed as string[]),
  riwayat: [],

  goTo: (screen) => set({ screen }),

  scan: (payload, coordsOverride) => {
    const coords = coordsOverride ?? get().currentCoords;
    set({ currentPayload: payload, currentCoords: coords, nameAnswer: undefined, explainText: undefined });

    const ctx = buildContext({ ...get(), currentCoords: coords } as ScanGuardState);
    const verdict = evaluate(payload, ctx);

    if (verdict.needsNameChallenge) {
      set({ pass1Verdict: verdict, screen: "challenge" });
      return;
    }
    set({ finalVerdict: verdict, screen: "result" });
    recordRiwayat(payload, verdict, set, get);
    runExplain(verdict, set);
  },

  submitNameAnswer: (name) => {
    const payload = get().currentPayload;
    if (!payload) return;
    const ctx = buildContext(get(), name);
    const verdict = evaluate(payload, ctx);
    set({ nameAnswer: name, finalVerdict: verdict, screen: "result" });
    recordRiwayat(payload, verdict, set, get);
    runExplain(verdict, set);
  },

  skipNameChallenge: () => {
    // "Saya tidak tahu / tidak ada papan nama": proceeds with an explicit warning,
    // never with a silent SAFE — the buyer opted out of the one check that matters.
    const payload = get().currentPayload;
    if (!payload) return;
    const pass1 = get().pass1Verdict;
    const hits = [
      ...(pass1?.hits ?? []),
      {
        ruleId: "L3_NAME_INCONCLUSIVE" as const,
        layer: 3 as const,
        severity: "warning" as const,
        weight: 20,
        reasonId: "L3_NAME_INCONCLUSIVE",
        evidence: { skipped: true },
      },
    ];
    const score = Math.min(100, hits.reduce((s, h) => s + h.weight, 0));
    const level = hits.some((h) => h.severity === "danger") ? "DANGER" : score >= 30 ? "WARNING" : "SAFE";
    const verdict: Verdict = {
      level,
      score,
      hits,
      needsNameChallenge: false,
      explain: "Kamu memilih tidak menjawab. Kami tidak bisa memastikan ini toko yang kamu maksud — hati-hati sebelum membayar.",
    };
    set({ finalVerdict: verdict, screen: "result" });
    recordRiwayat(payload, verdict, set, get);
  },

  confirmPay: () => {
    const state = get();
    const payload = state.currentPayload;
    if (!payload || !state.finalVerdict) return;
    const parsed = parseQris(payload);
    const nmid = parsed.merchantAccount?.nmid ?? parsed.domestic?.nmid ?? "";
    const amountStr = parsed.tags["54"];
    const amount = amountStr ? Number(amountStr) : 0;
    const now = Date.now();

    const nextHistory: PaidMerchant[] = [...state.history, { nmid, amount, ts: now }];
    let nextPlaces = state.places;
    if (state.currentCoords) {
      nextPlaces = upsertPlace(state.places, state.currentCoords, nmid, parsed.tags["59"] ?? "", now);
    }
    set({ history: nextHistory, places: nextPlaces, screen: "scan", currentPayload: undefined });
  },

  cancelPay: () => set({ screen: "scan", currentPayload: undefined, finalVerdict: undefined }),

  reportQr: () => {
    const state = get();
    const payload = state.currentPayload;
    if (!payload) return;
    const parsed = parseQris(payload);
    const nmid = parsed.merchantAccount?.nmid ?? parsed.domestic?.nmid ?? "";
    const nextReported = new Set(state.reportedNmids);
    nextReported.add(nmid);
    set({ reportedNmids: nextReported, screen: "scan", currentPayload: undefined });
  },

  resetToScan: () => set({ screen: "scan", currentPayload: undefined, finalVerdict: undefined, pass1Verdict: undefined }),
}));

function recordRiwayat(
  payload: string,
  verdict: Verdict,
  set: (fn: (s: ScanGuardState) => Partial<ScanGuardState>) => void,
  get: () => ScanGuardState,
) {
  const parsed = parseQris(payload);
  const entry: RiwayatEntry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    merchantName: parsed.tags["59"] ?? "(tidak diketahui)",
    city: parsed.tags["60"] ?? "",
    level: verdict.level,
    score: verdict.score,
  };
  set(() => ({ riwayat: [entry, ...get().riwayat] }));
}

