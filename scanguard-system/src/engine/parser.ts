import { crc16 } from "./crc";

export class TlvParseError extends Error {}

export interface TlvNode {
  tag: string;
  value: string;
}

/** Parse a flat EMVCo TLV string into an ordered list of {tag, value}. */
export function parseTlv(payload: string): TlvNode[] {
  const out: TlvNode[] = [];
  let i = 0;
  while (i < payload.length) {
    if (i + 4 > payload.length) {
      throw new TlvParseError(`TLV terpotong di posisi ${i}`);
    }
    const tag = payload.slice(i, i + 2);
    const lengthStr = payload.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(lengthStr)) {
      throw new TlvParseError(`length bukan angka di tag ${tag}`);
    }
    const length = Number(lengthStr);
    const value = payload.slice(i + 4, i + 4 + length);
    if (value.length < length) {
      throw new TlvParseError(`value tag ${tag} lebih pendek dari length`);
    }
    out.push({ tag, value });
    i += 4 + length;
  }
  return out;
}

/** Parse into a tag -> value map. Duplicate tags: last wins. */
export function parseTlvMap(payload: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const { tag, value } of parseTlv(payload)) {
    map[tag] = value;
  }
  return map;
}

export interface ParsedQris {
  raw: string;
  tags: Record<string, string>;
  order: TlvNode[];
  merchantAccount?: { tag: string; guid: string; nmid?: string; merchantId?: string; criteria?: string };
  domestic?: { guid: string; nmid: string; criteria: string };
  crcClaimed: string;
  crcComputed: string;
  crcValid: boolean;
}

/** Full structural parse used by the engine and the Bukti screen. */
export function parseQris(raw: string): ParsedQris {
  const order = parseTlv(raw);
  const tags: Record<string, string> = {};
  for (const { tag, value } of order) tags[tag] = value;

  // Merchant account template: any tag 26-45
  let merchantAccount: ParsedQris["merchantAccount"];
  for (const { tag, value } of order) {
    const n = Number(tag);
    if (n >= 26 && n <= 45) {
      const sub = parseTlvMap(value);
      merchantAccount = {
        tag,
        guid: sub["00"] ?? "",
        nmid: sub["01"] ?? sub["02"],
        merchantId: sub["02"],
        criteria: sub["03"],
      };
      break;
    }
  }

  let domestic: ParsedQris["domestic"];
  if (tags["51"]) {
    const sub = parseTlvMap(tags["51"]);
    domestic = { guid: sub["00"] ?? "", nmid: sub["02"] ?? "", criteria: sub["03"] ?? "" };
  }

  const crcClaimed = raw.length >= 4 ? raw.slice(-4).toUpperCase() : "";
  const crcComputed = raw.length >= 4 ? crc16(raw.slice(0, -4)) : "";

  return {
    raw,
    tags,
    order,
    merchantAccount,
    domestic,
    crcClaimed,
    crcComputed,
    crcValid: raw.slice(-8, -4) === "6304" && crcClaimed === crcComputed,
  };
}
