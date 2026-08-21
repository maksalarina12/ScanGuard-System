import { describe, it, expect } from "vitest";
import { parseTlv, parseQris, TlvParseError } from "../src/engine/parser";
import fixtures from "../fixtures/fixtures.json";

describe("parseTlv", () => {
  it("parses the golden fixture into the expected tag set", () => {
    const ok01 = fixtures.find((f) => f.id === "OK-01")!;
    const nodes = parseTlv(ok01.payload);
    const tags = nodes.map((n) => n.tag);
    expect(tags).toEqual(["00", "01", "26", "51", "52", "53", "58", "59", "60", "61", "62", "63"]);
  });

  it("throws on a truncated payload (BAD-02)", () => {
    const bad02 = fixtures.find((f) => f.id === "BAD-02")!;
    expect(() => parseTlv(bad02.payload)).toThrow(TlvParseError);
  });
});

describe("parseQris", () => {
  it("extracts merchant name, city, NMID from OK-01", () => {
    const ok01 = fixtures.find((f) => f.id === "OK-01")!;
    const parsed = parseQris(ok01.payload);
    expect(parsed.tags["59"]).toBe("WARUNG KOPI NUSA");
    expect(parsed.tags["60"]).toBe("BANDUNG");
    expect(parsed.merchantAccount?.nmid).toBe("936000911223344556");
    expect(parsed.crcValid).toBe(true);
  });

  it("flags BAD-01 as CRC-invalid but still structurally parseable", () => {
    const bad01 = fixtures.find((f) => f.id === "BAD-01")!;
    const parsed = parseQris(bad01.payload);
    expect(parsed.crcValid).toBe(false);
    expect(parsed.tags["59"]).toBe("WARUNG K0PI NUSA");
  });

  it("passes CRC on BAD-03 even though the NMID is foreign — CRC alone is not enough", () => {
    const bad03 = fixtures.find((f) => f.id === "BAD-03")!;
    const parsed = parseQris(bad03.payload);
    expect(parsed.crcValid).toBe(true);
    expect(parsed.merchantAccount?.nmid).toBe("936000999887766554");
  });
});
