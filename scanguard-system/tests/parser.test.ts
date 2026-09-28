import { describe, it, expect } from "vitest";
import { parseTlv, parseQris, TlvParseError, merchantLocation } from "../src/engine/parser";
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

describe("merchantLocation", () => {
  const tlv = (t: string, v: string) => `${t}${String(v.length).padStart(2, "0")}${v}`;
  const withTags = (extra: string) => parseQris(tlv("00", "01") + extra + "6304" + "0000");

  it("flags a city filled to the 15-char limit as possibly truncated", () => {
    const loc = merchantLocation(withTags(tlv("60", "Jl. Medan Merde") + tlv("61", "20112")));
    expect(loc.city).toBe("Jl. Medan Merde");
    expect(loc.cityMayBeTruncated).toBe(true);
    expect(loc.postalCode).toBe("20112");
  });

  it("does not flag a normal city name, and reads tag 64 / 62 extras", () => {
    const extra = tlv("60", "BANDUNG") + tlv("62", tlv("03", "Cabang Dago")) + tlv("64", tlv("00", "ID") + tlv("02", "Kota Bandung"));
    const loc = merchantLocation(withTags(extra));
    expect(loc.cityMayBeTruncated).toBe(false);
    expect(loc.storeLabel).toBe("Cabang Dago");
    expect(loc.cityAlt).toBe("Kota Bandung");
  });
});
