import { describe, it, expect } from "vitest";
import { evaluate } from "../src/engine";
import { crc16 } from "../src/engine/crc";
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

// --- Builder for synthetic, CRC-valid payloads to exercise individual rules ---

const tlv = (tag: string, value: string) => `${tag}${String(value.length).padStart(2, "0")}${value}`;

function build(overrides: Record<string, string | null> = {}): string {
  const fields: [string, string][] = [
    ["00", "01"],
    ["01", "11"],
    ["26", tlv("00", "ID.CO.QRIS.WWW") + tlv("01", "936000911223344556") + tlv("03", "UMI")],
    ["51", tlv("00", "ID.CO.QRIS.WWW") + tlv("02", "936000911223344556") + tlv("03", "UMI")],
    ["52", "5812"],
    ["53", "360"],
    ["58", "ID"],
    ["59", "WARUNG KOPI NUSA"],
    ["60", "BANDUNG"],
  ];
  const body = fields
    .map(([t, v]) => [t, t in overrides ? overrides[t] : v] as const)
    .concat(Object.entries(overrides).filter(([t]) => !fields.some(([f]) => f === t)) as [string, string | null][])
    .filter(([, v]) => v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([t, v]) => tlv(t, v!))
    .join("") + "6304";
  return body + crc16(body);
}

const ruleIds = (raw: string, ctx: Partial<Context> = {}) => evaluate(raw, baseCtx(ctx)).hits.map((h) => h.ruleId);

describe("Layer 1 structural rules", () => {
  it("builder produces a clean baseline", () => {
    expect(ruleIds(build()).filter((id) => id.startsWith("L1_"))).toEqual([]);
  });
  it("L1_BAD_FORMAT when tag 00 != 01", () => {
    expect(ruleIds(build({ "00": "02" }))).toContain("L1_BAD_FORMAT");
  });
  it("L1_WRONG_COUNTRY when tag 58 != ID", () => {
    expect(ruleIds(build({ "58": "MY" }))).toContain("L1_WRONG_COUNTRY");
  });
  it("L1_WRONG_CURRENCY when tag 53 != 360", () => {
    expect(ruleIds(build({ "53": "458" }))).toContain("L1_WRONG_CURRENCY");
  });
  it("L1_NO_MERCHANT_ACCT when no 26-45 and no 51", () => {
    expect(ruleIds(build({ "26": null, "51": null }))).toContain("L1_NO_MERCHANT_ACCT");
  });
});

describe("Layer 2 identity rules", () => {
  it("L2_NMID_REPORTED -> DANGER", () => {
    const v = evaluate(build(), baseCtx({ reportedNmids: new Set(["936000911223344556"]) }));
    expect(v.level).toBe("DANGER");
    expect(v.hits.some((h) => h.ruleId === "L2_NMID_REPORTED")).toBe(true);
  });
  it("L2_NMID_MALFORMED when NMID does not start with 9360", () => {
    const acct = tlv("00", "ID.CO.QRIS.WWW") + tlv("01", "123400911223344556") + tlv("03", "UMI");
    expect(ruleIds(build({ "26": acct }))).toContain("L2_NMID_MALFORMED");
  });
  it("L2_LOOKALIKE_NAME on exact name reuse under a foreign NMID (BAD-03)", () => {
    expect(ruleIds(fx("BAD-03").payload)).toContain("L2_LOOKALIKE_NAME");
  });
  it("does not flag a known merchant's own name", () => {
    expect(ruleIds(fx("OK-01").payload)).not.toContain("L2_LOOKALIKE_NAME");
  });
});

describe("Layer 3/4 amount and tip rules", () => {
  it("L3_MCC_AMOUNT_ANOMALY when amount > 10x MCC median", () => {
    expect(ruleIds(build({ "01": "12", "54": "300000" }))).toContain("L3_MCC_AMOUNT_ANOMALY");
  });
  it("L3_SUSPICIOUS_TIP when tag 55=03 on an unknown NMID", () => {
    const acct = tlv("00", "ID.CO.QRIS.WWW") + tlv("01", "936000977777777777") + tlv("03", "UMI");
    expect(ruleIds(build({ "26": acct, "55": "03" }))).toContain("L3_SUSPICIOUS_TIP");
  });
  it("L4_AMOUNT_OUTLIER when amount > 5x the user's median", () => {
    const history: PaidMerchant[] = [{ nmid: "936000911223344556", amount: 20000, ts: 0 }];
    expect(ruleIds(build({ "01": "12", "54": "150000" }), { history })).toContain("L4_AMOUNT_OUTLIER");
  });
  it("L4_RAPID_REPEAT with 3 distinct NMIDs inside 90 s", () => {
    const now = 1_000_000;
    const recentNmids = [
      { nmid: "936000900000000011", ts: now - 10_000 },
      { nmid: "936000900000000012", ts: now - 20_000 },
    ];
    expect(ruleIds(build(), { now, recentNmids })).toContain("L4_RAPID_REPEAT");
    expect(ruleIds(build(), { now, recentNmids: recentNmids.map((r) => ({ ...r, ts: now - 120_000 })) })).not.toContain(
      "L4_RAPID_REPEAT",
    );
  });
});

describe("name challenge skip", () => {
  it("nameSkipped adds L3_NAME_SKIPPED and is never SAFE", () => {
    const history: PaidMerchant[] = [{ nmid: "936000911223344556", amount: 20000, ts: 0 }];
    const v = evaluate(build(), baseCtx({ history, nameSkipped: true }));
    expect(v.needsNameChallenge).toBe(false);
    expect(v.hits.map((h) => h.ruleId)).toEqual(["L3_NAME_SKIPPED"]);
    expect(v.level).toBe("WARNING");
  });
});
