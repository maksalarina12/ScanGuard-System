import { upsertPlace } from "../engine/places";
import { parseQris } from "../engine/parser";
import type { Coords, PlaceMemory, PaidMerchant } from "../engine/types";
import fixturesJson from "../../fixtures/fixtures.json";

export interface DemoFixture {
  id: string;
  label: string;
  expected: string;
  payload: string;
  reason?: string;
  intendedMerchant?: string;
}

export const FIXTURES = fixturesJson as DemoFixture[];

function nmidOf(payload: string): string {
  const p = parseQris(payload);
  return p.merchantAccount?.nmid ?? p.domestic?.nmid ?? "";
}

function fx(id: string): DemoFixture {
  const f = FIXTURES.find((x) => x.id === id);
  if (!f) throw new Error(`fixture ${id} missing`);
  return f;
}

/** Simulated GPS spots for the demo. Anam's warung ("SPOT_A") is where the
 * Zikri overlay happens — same physical coordinates, different NMID. */
export const DEMO_LOCATIONS: Record<string, Coords> = {
  SPOT_A: { lat: -6.9175, lng: 107.6191, accuracyM: 8 }, // Anam's warung
  SPOT_B: { lat: -6.9201, lng: 107.6233, accuracyM: 8 }, // langganan toko kelontong
  SPOT_C: { lat: -6.9142, lng: 107.6108, accuracyM: 8 }, // langganan apotek
  UNKNOWN_SPOT: { lat: -6.905, lng: 107.63, accuracyM: 10 },
};

export const DEMO_COORDS_BY_FIXTURE: Record<string, Coords | undefined> = {
  "OK-01": DEMO_LOCATIONS.SPOT_A,
  "OK-02": DEMO_LOCATIONS.SPOT_B,
  "OK-03": DEMO_LOCATIONS.SPOT_C,
  "BAD-01": DEMO_LOCATIONS.SPOT_A,
  "BAD-02": DEMO_LOCATIONS.SPOT_A,
  "BAD-03": DEMO_LOCATIONS.UNKNOWN_SPOT,
  "BAD-04": DEMO_LOCATIONS.SPOT_A, // buyer is in Bandung, QR claims Surabaya
  "OVERLAY-01": DEMO_LOCATIONS.SPOT_A, // Zikri's QR taped over Anam's sticker
};

/** Builds the app's starting place memory: a few "regular spots" the demo
 * buyer has visited before, so the OK fixtures resolve straight to SAFE and
 * only OVERLAY-01 (a place/NMID switch at a well-known spot) has to ask. */
export function buildInitialPlaces(): PlaceMemory[] {
  let places: PlaceMemory[] = [];
  const seedVisits: [string, string][] = [
    ["OK-01", "SPOT_A"],
    ["OK-01", "SPOT_A"],
    ["OK-01", "SPOT_A"],
    ["OK-01", "SPOT_A"],
    ["OK-01", "SPOT_A"],
    ["OK-02", "SPOT_B"],
    ["OK-03", "SPOT_C"],
  ];
  for (const [fixtureId, spot] of seedVisits) {
    const f = fx(fixtureId);
    const parsed = parseQris(f.payload);
    places = upsertPlace(places, DEMO_LOCATIONS[spot], nmidOf(f.payload), parsed.tags["59"] ?? "", Date.now());
  }
  return places;
}

export function buildInitialHistory(): PaidMerchant[] {
  const ok03 = fx("OK-03");
  return [{ nmid: nmidOf(ok03.payload), amount: 60000, ts: Date.now() - 86_400_000 }];
}
