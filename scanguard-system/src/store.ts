import { create } from "zustand";
import { evaluate } from "./engine";
import { tryParseQris, type ParsedQris } from "./engine/parser";
import { upsertPlace } from "./engine/places";
import type { Context, PaidMerchant, PlaceMemory, Verdict } from "./engine/types";
import reportedNmidsSeed from "./data/reported_nmids.json";
import { buildInitialPlaces, buildInitialHistory } from "./demo/seed";
import { explainVerdict } from "./llm/explain";

export type Screen = "scan" | "challenge" | "result" | "bukti" | "riwayat";

export type RiwayatOutcome = "dibayar" | "dibatalkan" | "dilaporkan";

export interface RiwayatEntry {
  id: string;
  ts: number;
  merchantName: string;
  city: string;
  level: Verdict["level"];
  score: number;
  outcome?: RiwayatOutcome;
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
  currentRiwayatId?: string;
  lastOutcome?: RiwayatOutcome;

  places: PlaceMemory[];
  history: PaidMerchant[];
  reportedNmids: Set<string>;
  recentScans: { nmid: string; ts: number }[];
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

/** True while the buyer still owes an answer to the name challenge. The
 * payee name (tag 59) must not be rendered anywhere in this state. */
export function isChallengePending(s: Pick<ScanGuardState, "pass1Verdict" | "finalVerdict">): boolean {
  return Boolean(s.pass1Verdict && !s.finalVerdict);
}

function nmidOf(parsed: ParsedQris | null): string {
  return parsed?.merchantAccount?.nmid ?? parsed?.domestic?.nmid ?? "";
}

function buildContext(state: ScanGuardState, extra: Partial<Context> = {}): Context {
  return {
    coords: state.currentCoords,
    places: state.places,
    history: state.history,
    reportedNmids: state.reportedNmids,
    recentNmids: state.recentScans,
    now: Date.now(),
    ...extra,
  };
}

// Dev-only fire-rate counter (BLOCK 6: "log the fire rate in dev mode so you can tune it").
const fireRate = { scans: 0, challenges: 0 };
function logFireRate(challenged: boolean) {
  fireRate.scans++;
  if (challenged) fireRate.challenges++;
  if (import.meta.env.DEV && import.meta.env.MODE !== "test") {
    const pct = ((fireRate.challenges / fireRate.scans) * 100).toFixed(0);
    console.info(`[ScanGuard] name challenge fire rate: ${fireRate.challenges}/${fireRate.scans} (${pct}%) — target < 10%`);
  }
}

export const useScanGuard = create<ScanGuardState>((set, get) => {
  function finalize(payload: string, verdict: Verdict, nameAnswer?: string) {
    const parsed = tryParseQris(payload);
    const entry: RiwayatEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      merchantName: parsed?.tags["59"] ?? "(kode rusak)",
      city: parsed?.tags["60"] ?? "",
      level: verdict.level,
      score: verdict.score,
    };
    set((s) => ({
      nameAnswer,
      finalVerdict: verdict,
      screen: "result",
      explainLoading: true,
      currentRiwayatId: entry.id,
      riwayat: [entry, ...s.riwayat],
    }));
    explainVerdict(verdict).then((text) => {
      // A slower LLM reply for an earlier scan must not overwrite this one.
      if (get().finalVerdict === verdict) set({ explainText: text, explainLoading: false });
    });
  }

  function closeWith(outcome: RiwayatOutcome, patch: Partial<ScanGuardState> = {}) {
    const id = get().currentRiwayatId;
    set((s) => ({
      ...patch,
      screen: "scan",
      currentPayload: undefined,
      pass1Verdict: undefined,
      finalVerdict: undefined,
      currentRiwayatId: undefined,
      lastOutcome: outcome,
      riwayat: s.riwayat.map((r) => (r.id === id ? { ...r, outcome } : r)),
    }));
  }

  return {
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
    recentScans: [],
    riwayat: [],

    goTo: (screen) => {
      // Bukti renders tag 59 — never while the name challenge is unanswered.
      if (screen === "bukti" && isChallengePending(get())) return;
      set({ screen });
    },

    // `coords` is the location for THIS scan only. Never fall back to an
    // earlier scan's coordinates: that would evaluate the payload against
    // a place the buyer is not standing at.
    scan: (payload, coords) => {
      set({
        currentPayload: payload,
        currentCoords: coords,
        pass1Verdict: undefined,
        finalVerdict: undefined,
        nameAnswer: undefined,
        explainText: undefined,
        explainLoading: false,
        currentRiwayatId: undefined,
        lastOutcome: undefined,
      });

      const verdict = evaluate(payload, buildContext(get()));

      const nmid = nmidOf(tryParseQris(payload));
      if (nmid) {
        const now = Date.now();
        set((s) => ({ recentScans: [...s.recentScans.filter((r) => r.ts >= now - 90_000), { nmid, ts: now }] }));
      }
      logFireRate(verdict.needsNameChallenge);

      if (verdict.needsNameChallenge) {
        set({ pass1Verdict: verdict, screen: "challenge" });
        return;
      }
      finalize(payload, verdict);
    },

    submitNameAnswer: (name) => {
      const payload = get().currentPayload;
      if (!payload) return;
      const verdict = evaluate(payload, buildContext(get(), { nameAnswer: name }));
      finalize(payload, verdict, name);
    },

    // "Saya tidak tahu / tidak ada papan nama": re-evaluated by the engine with
    // nameSkipped, which adds L3_NAME_SKIPPED and guarantees at least WARNING.
    skipNameChallenge: () => {
      const payload = get().currentPayload;
      if (!payload) return;
      const verdict = evaluate(payload, buildContext(get(), { nameSkipped: true }));
      finalize(payload, verdict);
    },

    confirmPay: () => {
      const state = get();
      const payload = state.currentPayload;
      if (!payload || !state.finalVerdict) return;
      const parsed = tryParseQris(payload);
      if (!parsed) return; // a code that cannot be parsed cannot be paid
      const nmid = nmidOf(parsed);
      const amountStr = parsed.tags["54"];
      const amount = amountStr ? Number(amountStr) : 0;
      const now = Date.now();

      const history: PaidMerchant[] = [...state.history, { nmid, amount, ts: now }];
      // A DANGER override (hold-to-confirm) is the buyer's call, but it must not
      // teach place memory that this NMID is normal here — otherwise one
      // overridden Zikri overlay starts diluting Anam's history at that spot.
      let places = state.places;
      if (state.currentCoords && state.finalVerdict.level !== "DANGER") {
        places = upsertPlace(state.places, state.currentCoords, nmid, parsed.tags["59"] ?? "", now);
      }
      closeWith("dibayar", { history, places });
    },

    cancelPay: () => closeWith("dibatalkan"),

    reportQr: () => {
      const state = get();
      if (!state.currentPayload) return;
      const nmid = nmidOf(tryParseQris(state.currentPayload));
      const reportedNmids = new Set(state.reportedNmids);
      if (nmid) reportedNmids.add(nmid);
      closeWith("dilaporkan", { reportedNmids });
    },

    resetToScan: () =>
      set({ screen: "scan", currentPayload: undefined, finalVerdict: undefined, pass1Verdict: undefined }),
  };
});
