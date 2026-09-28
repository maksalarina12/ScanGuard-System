import { describe, it, expect, beforeEach } from "vitest";
import { useScanGuard, isChallengePending } from "../src/store";
import { FIXTURES, DEMO_COORDS_BY_FIXTURE, DEMO_LOCATIONS } from "../src/demo/seed";
import { findNearestPlace } from "../src/engine/places";

const fx = (id: string) => FIXTURES.find((f) => f.id === id)!.payload;
const st = () => useScanGuard.getState();

beforeEach(() => {
  useScanGuard.setState(useScanGuard.getInitialState(), true);
});

describe("store: demo flows", () => {
  it("BAD-02 (truncated) reaches a DANGER result without throwing", () => {
    expect(() => st().scan(fx("BAD-02"), DEMO_COORDS_BY_FIXTURE["BAD-02"])).not.toThrow();
    expect(st().screen).toBe("result");
    expect(st().finalVerdict?.level).toBe("DANGER");
    expect(st().riwayat[0].merchantName).toBe("(kode rusak)");
    expect(() => st().reportQr()).not.toThrow();
    expect(() => st().confirmPay()).not.toThrow();
  });

  it("OVERLAY-01 at Anam's spot asks the name, then DANGER on 'ayam geprek anam'", () => {
    st().scan(fx("OVERLAY-01"), DEMO_COORDS_BY_FIXTURE["OVERLAY-01"]);
    expect(st().screen).toBe("challenge");
    st().submitNameAnswer("ayam geprek anam");
    expect(st().finalVerdict?.level).toBe("DANGER");
    expect(st().finalVerdict?.hits.some((h) => h.ruleId === "L3_NAME_MISMATCH")).toBe(true);
  });
});

describe("store: name challenge must not leak the payee name", () => {
  it("Bukti cannot be opened while the challenge is pending", () => {
    st().scan(fx("OK-01"), DEMO_COORDS_BY_FIXTURE["OK-01"]); // earlier verdict exists
    st().scan(fx("OVERLAY-01"), DEMO_COORDS_BY_FIXTURE["OVERLAY-01"]);
    expect(isChallengePending(st())).toBe(true);
    // stale verdict from the previous scan must be gone
    expect(st().finalVerdict).toBeUndefined();
    st().goTo("bukti");
    expect(st().screen).toBe("challenge");
  });

  it("Bukti opens once the buyer has answered", () => {
    st().scan(fx("OVERLAY-01"), DEMO_COORDS_BY_FIXTURE["OVERLAY-01"]);
    st().submitNameAnswer("ayam geprek zikri");
    st().goTo("bukti");
    expect(st().screen).toBe("bukti");
  });
});

describe("store: skip and coordinates", () => {
  it("'Saya tidak tahu' never ends in SAFE, even for a merchant paid before", () => {
    st().scan(fx("OK-03")); // no coords -> unknown spot -> challenge
    expect(st().screen).toBe("challenge");
    st().skipNameChallenge();
    expect(st().finalVerdict?.level).not.toBe("SAFE");
    expect(st().finalVerdict?.hits.some((h) => h.ruleId === "L3_NAME_SKIPPED")).toBe(true);
  });

  it("a scan without coords does not inherit the previous scan's location", () => {
    st().scan(fx("OK-01"), DEMO_LOCATIONS.SPOT_A);
    st().cancelPay();
    st().scan(fx("OK-01"));
    expect(st().currentCoords).toBeUndefined();
  });
});

describe("store: payment outcomes", () => {
  it("records the outcome on the riwayat entry", () => {
    st().scan(fx("OK-01"), DEMO_COORDS_BY_FIXTURE["OK-01"]);
    st().confirmPay();
    expect(st().riwayat[0].outcome).toBe("dibayar");
    expect(st().lastOutcome).toBe("dibayar");
  });

  it("a DANGER override does not teach place memory that the new NMID is normal", () => {
    const coords = DEMO_COORDS_BY_FIXTURE["OVERLAY-01"]!;
    const before = findNearestPlace(st().places, coords)!;
    st().scan(fx("OVERLAY-01"), coords);
    st().submitNameAnswer("ayam geprek anam");
    expect(st().finalVerdict?.level).toBe("DANGER");
    st().confirmPay();
    const after = findNearestPlace(st().places, coords)!;
    expect(after.samples).toBe(before.samples);
  });

  it("L4_RAPID_REPEAT fires on the third distinct NMID within 90 s", () => {
    st().scan(fx("OK-01"), DEMO_COORDS_BY_FIXTURE["OK-01"]);
    st().cancelPay();
    st().scan(fx("OK-02"), DEMO_COORDS_BY_FIXTURE["OK-02"]);
    st().cancelPay();
    st().scan(fx("OK-03"), DEMO_COORDS_BY_FIXTURE["OK-03"]);
    expect(st().finalVerdict?.hits.some((h) => h.ruleId === "L4_RAPID_REPEAT")).toBe(true);
  });
});
