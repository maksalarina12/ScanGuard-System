import { describe, it, expect } from "vitest";
import { evaluate } from "../src/engine";
import type { Context, PaidMerchant, PlaceMemory } from "../src/engine/types";
import fixtures from "../fixtures/fixtures.json";

function fx(id: string) {
  const f = fixtures.find((x) => x.id === id);
  if (!f) throw new Error(`fixture ${id} not found`);
  return f;
}

function baseCtx(overrides: Partial<Context> = {}): Context {
  return {
    coords: undefined,
    places: [],
    history: [],
    reportedNmids: new Set<string>(),
    ...overrides,
  };
}

describe("BLOCK 9 acceptance fixtures", () => {
  it("OK-01: healthy static QR -> SAFE", () => {
    const v = evaluate(fx("OK-01").payload, baseCtx());
    expect(v.level).toBe("SAFE");
  });

  it("OK-02: healthy dynamic QR Rp25.000 -> SAFE", () => {
    const v = evaluate(fx("OK-02").payload, baseCtx());
    expect(v.level).toBe("SAFE");
  });

  it("OK-03: known merchant in history -> SAFE", () => {
    const history: PaidMerchant[] = [{ nmid: "936000911223344558", amount: 50000, ts: Date.now() }];
    const v = evaluate(fx("OK-03").payload, baseCtx({ history }));
    expect(v.level).toBe("SAFE");
  });

  it("BAD-01: name edited, CRC stale -> DANGER via L1_CRC_MISMATCH", () => {
    const v = evaluate(fx("BAD-01").payload, baseCtx());
    expect(v.level).toBe("DANGER");
    expect(v.hits.some((h) => h.ruleId === "L1_CRC_MISMATCH")).toBe(true);
  });

  it("BAD-02: truncated payload -> DANGER via L1_MALFORMED", () => {
    const v = evaluate(fx("BAD-02").payload, baseCtx());
    expect(v.level).toBe("DANGER");
    expect(v.hits.some((h) => h.ruleId === "L1_MALFORMED")).toBe(true);
  });

  it("BAD-03: re-forged QR passes CRC but must NOT be SAFE (layer 2 catches it)", () => {
    const v = evaluate(fx("BAD-03").payload, baseCtx());
    expect(v.level).not.toBe("SAFE");
    expect(v.hits.some((h) => h.layer === 2)).toBe(true);
  });

  it("BAD-04: lookalike name + wrong city -> WARNING", () => {
    const coords = { lat: -6.9175, lng: 107.6191, accuracyM: 10 }; // Bandung
    const v = evaluate(fx("BAD-04").payload, baseCtx({ coords }));
    expect(v.level).toBe("WARNING");
    expect(v.hits.some((h) => h.ruleId === "L2_LOOKALIKE_NAME")).toBe(true);
    expect(v.hits.some((h) => h.ruleId === "L3_GEO_CITY_MISMATCH")).toBe(true);
  });

  it("OVERLAY-01 pass 1: genuine QR in wrong place -> must ask before it can ever say SAFE", () => {
    // This is the test that justifies BLOCK 6: the payload is a fully valid,
    // registered QR, so every structural/identity check passes. The engine
    // must not skip straight to a verdict — it must set needsNameChallenge.
    const v1 = evaluate(fx("OVERLAY-01").payload, baseCtx());
    expect(v1.needsNameChallenge).toBe(true);
  });

  it("OVERLAY-01 pass 2: buyer names the real shop -> DANGER via L3_NAME_MISMATCH", () => {
    const v2 = evaluate(fx("OVERLAY-01").payload, baseCtx({ nameAnswer: "ayam geprek anam" }));
    expect(v2.level).toBe("DANGER");
    expect(v2.hits.some((h) => h.ruleId === "L3_NAME_MISMATCH")).toBe(true);
  });

  it("OVERLAY-01 pass 2: buyer confirms the correct (genuine) name -> no mismatch", () => {
    const v2 = evaluate(fx("OVERLAY-01").payload, baseCtx({ nameAnswer: "ayam geprek zikri" }));
    expect(v2.hits.some((h) => h.ruleId === "L3_NAME_MISMATCH")).toBe(false);
  });
});

describe("Layer 3 place rules", () => {
  it("L3_PLACE_NMID_SWITCH fires when a well-established place suddenly shows a different NMID", () => {
    const coords = { lat: -6.9, lng: 107.6, accuracyM: 10 };
    const place: PlaceMemory = {
      id: "p1",
      centroid: { lat: -6.9, lng: 107.6 },
      samples: 10,
      nmids: { "936000911223344556": { count: 9, name: "WARUNG KOPI NUSA", lastSeen: Date.now() } },
    };
    const v = evaluate(fx("OVERLAY-01").payload, baseCtx({ coords, places: [place] }));
    expect(v.hits.some((h) => h.ruleId === "L3_PLACE_NMID_SWITCH")).toBe(true);
  });

  it("never fires a place rule when samples < 5", () => {
    const coords = { lat: -6.9, lng: 107.6, accuracyM: 10 };
    const place: PlaceMemory = {
      id: "p1",
      centroid: { lat: -6.9, lng: 107.6 },
      samples: 3,
      nmids: { "936000911223344556": { count: 3, name: "WARUNG KOPI NUSA", lastSeen: Date.now() } },
    };
    const v = evaluate(fx("OVERLAY-01").payload, baseCtx({ coords, places: [place] }));
    expect(v.hits.some((h) => h.ruleId === "L3_PLACE_NMID_SWITCH")).toBe(false);
  });
});
