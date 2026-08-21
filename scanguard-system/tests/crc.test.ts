import { describe, it, expect } from "vitest";
import { crc16, validateCrc } from "../src/engine/crc";
import fixtures from "../fixtures/fixtures.json";

describe("crc16", () => {
  const okFixtures = fixtures.filter((f) => f.id.startsWith("OK-"));

  it("round-trips on all 3 OK fixtures", () => {
    expect(okFixtures).toHaveLength(3);
    for (const fx of okFixtures) {
      const payload = fx.payload;
      const body = payload.slice(0, -4);
      const claimed = payload.slice(-4).toUpperCase();
      expect(crc16(body)).toBe(claimed);
      expect(validateCrc(payload)).toBe(true);
    }
  });

  it("detects a stale CRC after a byte edit (BAD-01)", () => {
    const bad = fixtures.find((f) => f.id === "BAD-01")!;
    expect(validateCrc(bad.payload)).toBe(false);
  });

  it("property: mutating any single non-CRC char breaks validation", () => {
    for (const fx of okFixtures) {
      const payload = fx.payload;
      const crcFieldStart = payload.length - 4;
      for (let i = 0; i < crcFieldStart; i++) {
        const ch = payload[i];
        const replacement = ch === "A" ? "B" : "A";
        const mutated = payload.slice(0, i) + replacement + payload.slice(i + 1);
        // Either it fails to parse (handled elsewhere) or the CRC no longer matches.
        expect(validateCrc(mutated)).toBe(false);
      }
    }
  });
});
