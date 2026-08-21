import { describe, it, expect } from "vitest";
import { distanceM, findNearestPlace, upsertPlace, dominantNmid } from "../src/engine/places";
import { evaluate } from "../src/engine";
import { parseQris } from "../src/engine/parser";
import type { Context, PlaceMemory, PaidMerchant } from "../src/engine/types";
import fixtures from "../fixtures/fixtures.json";

function nmidOf(payload: string): string {
  const p = parseQris(payload);
  return p.merchantAccount?.nmid ?? p.domestic?.nmid ?? "";
}

describe("distanceM", () => {
  it("is ~0 for identical coordinates", () => {
    expect(distanceM({ lat: -6.9, lng: 107.6 }, { lat: -6.9, lng: 107.6 })).toBeCloseTo(0, 3);
  });
});

describe("upsertPlace / findNearestPlace / dominantNmid", () => {
  it("creates a new place when nothing is within 25m", () => {
    const places = upsertPlace([], { lat: -6.9, lng: 107.6, accuracyM: 5 }, "N1", "TOKO A", Date.now());
    expect(places).toHaveLength(1);
    expect(places[0].samples).toBe(1);
  });

  it("merges into the nearest place within 25m and tracks per-NMID counts", () => {
    let places: PlaceMemory[] = [];
    const coords = { lat: -6.9, lng: 107.6, accuracyM: 5 };
    for (let i = 0; i < 5; i++) {
      places = upsertPlace(places, coords, "N1", "TOKO A", Date.now());
    }
    expect(places).toHaveLength(1);
    expect(places[0].samples).toBe(5);
    const dom = dominantNmid(places[0]);
    expect(dom?.nmid).toBe("N1");
    expect(dom?.share).toBe(1);
  });

  it("findNearestPlace ignores places farther than 25m", () => {
    const far: PlaceMemory = {
      id: "far",
      centroid: { lat: -6.95, lng: 107.65 },
      samples: 10,
      nmids: {},
    };
    const found = findNearestPlace([far], { lat: -6.9, lng: 107.6, accuracyM: 5 });
    expect(found).toBeUndefined();
  });
});

describe("fire-rate: name challenge must stay rare once places are established", () => {
  it("fires fewer than 10 times across a 100-payment session at 8 known places", () => {
    const random = mulberry32(42);
    let places: PlaceMemory[] = [];
    const history: PaidMerchant[] = [];
    const okPayloads = fixtures.filter((f) => f.expected === "SAFE").map((f) => f.payload);

    // Seed 8 places, each with an established, dominant NMID (>=5 samples).
    const placeCoords = Array.from({ length: 8 }, (_, i) => ({
      lat: -6.9 + i * 0.001,
      lng: 107.6 + i * 0.001,
      accuracyM: 8,
    }));
    // Each place gets its own fixed, dominant merchant (mirrors reality: a
    // physical spot is normally paid to the same stall every time).
    const placeMerchant = placeCoords.map(
      (_, i) => okPayloads[i % okPayloads.length],
    );
    for (let i = 0; i < placeCoords.length; i++) {
      const coords = placeCoords[i];
      const payload = placeMerchant[i];
      for (let j = 0; j < 6; j++) {
        places = upsertPlace(places, coords, nmidOf(payload), "SEED MERCHANT", Date.now());
      }
      history.push({ nmid: nmidOf(payload), amount: 20000, ts: Date.now() });
    }

    let fireCount = 0;
    for (let i = 0; i < 100; i++) {
      const coordsIdx = Math.floor(random() * placeCoords.length);
      const coords = placeCoords[coordsIdx];
      const payload = placeMerchant[coordsIdx]; // buyer pays the usual stall at this spot
      const ctx: Context = { coords, places, history, reportedNmids: new Set() };
      const verdict = evaluate(payload, ctx);
      if (verdict.needsNameChallenge) fireCount++;
      places = upsertPlace(places, coords, nmidOf(payload), "SEED MERCHANT", Date.now());
    }

    expect(fireCount).toBeLessThan(10);
  });
});

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
