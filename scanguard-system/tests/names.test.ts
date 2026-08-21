import { describe, it, expect } from "vitest";
import { nameMatches } from "../src/engine/names";

describe("nameMatches — Anam/Zikri case", () => {
  const qrName = "AYAM GEPREK ZIKRI";

  it.each([
    ["ayam geprek anam", false],
    ["anam", false],
    ["warung anam", false],
    ["geprek anam", false],
    ["ayam geprek zikri", true],
  ] as const)("typed=%s -> %s", (typed, expected) => {
    expect(nameMatches(typed, qrName)).toBe(expected);
  });

  it("returns null (inconclusive) when only generic words are typed", () => {
    expect(nameMatches("ayam geprek", qrName)).toBeNull();
  });
});
