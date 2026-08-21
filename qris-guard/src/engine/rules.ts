import { parseQris, TlvParseError } from "./parser";
import type { Context, RuleHit } from "./types";
import { levenshtein } from "./levenshtein";
import { nameMatches } from "./names";
import { findNearestPlace, dominantNmid, distanceM } from "./places";
import knownMerchants from "../data/known_merchants.json";
import cityCentroids from "../data/city_centroids.json";
import mccTable from "../data/mcc_table.json";

const KNOWN: Record<string, { name: string; city: string }> = knownMerchants;
const CITIES: Record<string, { lat: number; lng: number }> = cityCentroids;
const MCC: Record<string, { label: string; medianAmount: number }> = mccTable;

function normalizeName(s: string): string {
  return s
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/0/g, "O")
    .replace(/1/g, "I")
    .replace(/5/g, "S")
    .replace(/3/g, "E");
}

/** Layer 1 — structural. Returns either a parse-failure hit array, or null if
 * the payload is at least structurally sound enough to proceed to layer 2+. */
export function evalLayer1(raw: string): RuleHit[] {
  let parsed;
  try {
    parsed = parseQris(raw);
  } catch (e) {
    return [
      {
        ruleId: "L1_MALFORMED",
        layer: 1,
        severity: "danger",
        weight: 100,
        reasonId: "L1_MALFORMED",
        evidence: { error: e instanceof TlvParseError ? e.message : String(e) },
      },
    ];
  }

  const hits: RuleHit[] = [];

  if (!parsed.crcValid) {
    hits.push({
      ruleId: "L1_CRC_MISMATCH",
      layer: 1,
      severity: "danger",
      weight: 100,
      reasonId: "L1_CRC_MISMATCH",
      evidence: { claimed: parsed.crcClaimed, computed: parsed.crcComputed },
    });
  }
  if (parsed.tags["00"] !== "01") {
    hits.push({
      ruleId: "L1_BAD_FORMAT",
      layer: 1,
      severity: "danger",
      weight: 100,
      reasonId: "L1_BAD_FORMAT",
      evidence: { tag00: parsed.tags["00"] },
    });
  }
  if (parsed.tags["58"] !== "ID") {
    hits.push({
      ruleId: "L1_WRONG_COUNTRY",
      layer: 1,
      severity: "danger",
      weight: 100,
      reasonId: "L1_WRONG_COUNTRY",
      evidence: { tag58: parsed.tags["58"] },
    });
  }
  if (parsed.tags["53"] !== "360") {
    hits.push({
      ruleId: "L1_WRONG_CURRENCY",
      layer: 1,
      severity: "danger",
      weight: 100,
      reasonId: "L1_WRONG_CURRENCY",
      evidence: { tag53: parsed.tags["53"] },
    });
  }
  if (!parsed.merchantAccount && !parsed.tags["51"]) {
    hits.push({
      ruleId: "L1_NO_MERCHANT_ACCT",
      layer: 1,
      severity: "danger",
      weight: 100,
      reasonId: "L1_NO_MERCHANT_ACCT",
      evidence: {},
    });
  }

  return hits;
}

/** Layer 2 — identity. Assumes layer 1 passed (payload is structurally sound). */
export function evalLayer2(raw: string, ctx: Context): RuleHit[] {
  const parsed = parseQris(raw);
  const nmid = parsed.merchantAccount?.nmid ?? parsed.domestic?.nmid ?? "";
  const name = parsed.tags["59"] ?? "";
  const hits: RuleHit[] = [];

  if (ctx.reportedNmids.has(nmid)) {
    hits.push({
      ruleId: "L2_NMID_REPORTED",
      layer: 2,
      severity: "danger",
      weight: 100,
      reasonId: "L2_NMID_REPORTED",
      evidence: { nmid },
    });
  }

  if (!/^9360\d{10,14}$/.test(nmid)) {
    hits.push({
      ruleId: "L2_NMID_MALFORMED",
      layer: 2,
      severity: "warning",
      weight: 40,
      reasonId: "L2_NMID_MALFORMED",
      evidence: { nmid },
    });
  }

  const inHistory = ctx.history.some((h) => h.nmid === nmid);
  const inKnownList = Boolean(KNOWN[nmid]);
  if (!inHistory && !inKnownList) {
    hits.push({
      ruleId: "L2_NMID_UNKNOWN",
      layer: 2,
      severity: "warning",
      weight: 25,
      reasonId: "L2_NMID_UNKNOWN",
      evidence: { nmid },
    });
  }

  const normalizedScanned = normalizeName(name);
  for (const [knownNmid, info] of Object.entries(KNOWN)) {
    if (knownNmid === nmid) continue; // exact same registered merchant, not a lookalike
    const dist = levenshtein(normalizedScanned, normalizeName(info.name));
    if (dist >= 1 && dist <= 2) {
      hits.push({
        ruleId: "L2_LOOKALIKE_NAME",
        layer: 2,
        severity: "warning",
        weight: 35,
        reasonId: "L2_LOOKALIKE_NAME",
        evidence: { scanned: name, similarTo: info.name, distance: dist },
      });
      break;
    }
  }

  return hits;
}

/** Layer 3 — place & context rules (excludes the name-challenge rules, see evalNameChallenge). */
export function evalLayer3(raw: string, ctx: Context): RuleHit[] {
  const parsed = parseQris(raw);
  const nmid = parsed.merchantAccount?.nmid ?? parsed.domestic?.nmid ?? "";
  const hits: RuleHit[] = [];

  if (ctx.coords && ctx.coords.accuracyM <= 30) {
    const place = findNearestPlace(ctx.places, ctx.coords);
    if (place && place.samples >= 5) {
      const dom = dominantNmid(place);
      if (dom && dom.share >= 0.8 && dom.nmid !== nmid) {
        hits.push({
          ruleId: "L3_PLACE_NMID_SWITCH",
          layer: 3,
          severity: "warning",
          weight: 45,
          reasonId: "L3_PLACE_NMID_SWITCH",
          evidence: { placeId: place.id, dominantNmid: dom.nmid, share: dom.share, scannedNmid: nmid },
        });
      }
    }
  }

  const city = parsed.tags["60"];
  const cityCentroid = city ? CITIES[city.trim().toUpperCase()] : undefined;
  if (ctx.coords && cityCentroid) {
    const d = distanceM(cityCentroid, ctx.coords) / 1000;
    if (d > 60) {
      hits.push({
        ruleId: "L3_GEO_CITY_MISMATCH",
        layer: 3,
        severity: "warning",
        weight: 30,
        reasonId: "L3_GEO_CITY_MISMATCH",
        evidence: { qrCity: city, distanceKm: Math.round(d) },
      });
    }
  }

  const mcc = parsed.tags["52"];
  const amountStr = parsed.tags["54"];
  if (mcc && amountStr && MCC[mcc]) {
    const amount = Number(amountStr);
    const median = MCC[mcc].medianAmount;
    if (Number.isFinite(amount) && amount > median * 10) {
      hits.push({
        ruleId: "L3_MCC_AMOUNT_ANOMALY",
        layer: 3,
        severity: "warning",
        weight: 20,
        reasonId: "L3_MCC_AMOUNT_ANOMALY",
        evidence: { amount, medianForMcc: median, mcc },
      });
    }
  }

  const tipIndicator = parsed.tags["55"];
  const nmidUnknown = !ctx.history.some((h) => h.nmid === nmid) && !KNOWN[nmid];
  if (tipIndicator === "03" && nmidUnknown) {
    hits.push({
      ruleId: "L3_SUSPICIOUS_TIP",
      layer: 3,
      severity: "warning",
      weight: 15,
      reasonId: "L3_SUSPICIOUS_TIP",
      evidence: { tipIndicator, nmid },
    });
  }

  return hits;
}

/** Layer 4 — behavioural. */
export function evalLayer4(raw: string, ctx: Context): RuleHit[] {
  const parsed = parseQris(raw);
  const nmid = parsed.merchantAccount?.nmid ?? parsed.domestic?.nmid ?? "";
  const amountStr = parsed.tags["54"];
  const amount = amountStr ? Number(amountStr) : undefined;
  const hits: RuleHit[] = [];
  const now = ctx.now ?? Date.now();

  const paidBefore = ctx.history.some((h) => h.nmid === nmid);
  if (!paidBefore) {
    hits.push({
      ruleId: "L4_FIRST_TIME_PAYEE",
      layer: 4,
      severity: "info",
      weight: 10,
      reasonId: "L4_FIRST_TIME_PAYEE",
      evidence: { nmid },
    });
  }

  if (amount !== undefined && ctx.history.length > 0) {
    const median = medianOf(ctx.history.map((h) => h.amount));
    if (median > 0 && amount > median * 5) {
      hits.push({
        ruleId: "L4_AMOUNT_OUTLIER",
        layer: 4,
        severity: "warning",
        weight: 20,
        reasonId: "L4_AMOUNT_OUTLIER",
        evidence: { amount, userMedian: median },
      });
    }
  }

  if (ctx.recentNmids) {
    const windowStart = now - 90_000;
    const recent = ctx.recentNmids.filter((r) => r.ts >= windowStart);
    const distinct = new Set([...recent.map((r) => r.nmid), nmid]);
    if (distinct.size >= 3) {
      hits.push({
        ruleId: "L4_RAPID_REPEAT",
        layer: 4,
        severity: "warning",
        weight: 15,
        reasonId: "L4_RAPID_REPEAT",
        evidence: { distinctNmids: distinct.size },
      });
    }
  }

  return hits;
}

function medianOf(nums: number[]): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Determines whether the app must ask the buyer to name the shop, based on
 * everything except the answer itself (pass 1). */
export function shouldTriggerNameChallenge(raw: string, ctx: Context, hitsSoFar: RuleHit[]): boolean {
  const parsed = parseQris(raw);
  const amountStr = parsed.tags["54"];
  const amount = amountStr ? Number(amountStr) : undefined;

  const noPlaceMemory = !ctx.coords || !findNearestPlace(ctx.places, ctx.coords);
  const nmidUnknownFired = hitsSoFar.some((h) => h.ruleId === "L2_NMID_UNKNOWN");
  const placeSwitchFired = hitsSoFar.some((h) => h.ruleId === "L3_PLACE_NMID_SWITCH");

  let amountOverThreshold = false;
  if (amount !== undefined && ctx.history.length > 0) {
    const median = medianOf(ctx.history.map((h) => h.amount));
    amountOverThreshold = median > 0 && amount > median * 3;
  }

  return noPlaceMemory || nmidUnknownFired || placeSwitchFired || amountOverThreshold;
}

/** Layer 3 name-challenge rules — pass 2 only, once ctx.nameAnswer is set. */
export function evalNameChallenge(raw: string, ctx: Context): RuleHit[] {
  if (ctx.nameAnswer === undefined) return [];
  const parsed = parseQris(raw);
  const qrName = parsed.tags["59"] ?? "";
  const result = nameMatches(ctx.nameAnswer, qrName);

  if (result === false) {
    return [
      {
        ruleId: "L3_NAME_MISMATCH",
        layer: 3,
        severity: "danger",
        weight: 100,
        reasonId: "L3_NAME_MISMATCH",
        evidence: { typed: ctx.nameAnswer, qrName },
      },
    ];
  }
  if (result === null) {
    return [
      {
        ruleId: "L3_NAME_INCONCLUSIVE",
        layer: 3,
        severity: "warning",
        weight: 20,
        reasonId: "L3_NAME_INCONCLUSIVE",
        evidence: { typed: ctx.nameAnswer, qrName },
      },
    ];
  }
  return [];
}
