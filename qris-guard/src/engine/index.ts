import type { Context, RuleHit, Verdict, VerdictLevel } from "./types";
import { evalLayer1, evalLayer2, evalLayer3, evalLayer4, evalNameChallenge, shouldTriggerNameChallenge } from "./rules";
import { scoreHits, levelForHits } from "./scoring";
import { reasonText } from "../copy/reasons.id";

export type { Context, RuleHit, Verdict, VerdictLevel } from "./types";
export * from "./crc";
export * from "./parser";
export * from "./places";
export * from "./names";
export * from "./rules";
export * from "./scoring";

/**
 * Public engine entry point. Deterministic, synchronous, offline. Called
 * twice for risky transactions: once before the name challenge, once after
 * the buyer answers (ctx.nameAnswer set).
 */
export function evaluate(raw: string, ctx: Context): Verdict {
  const layer1Hits = evalLayer1(raw);
  if (layer1Hits.length > 0) {
    return buildVerdict(layer1Hits, false);
  }

  const layer2Hits = evalLayer2(raw, ctx);
  const layer3Hits = evalLayer3(raw, ctx);
  const layer4Hits = evalLayer4(raw, ctx);
  const preChallengeHits = [...layer2Hits, ...layer3Hits, ...layer4Hits];

  const needsNameChallenge =
    ctx.nameAnswer === undefined && shouldTriggerNameChallenge(raw, ctx, preChallengeHits);
  if (needsNameChallenge) {
    return buildVerdict(preChallengeHits, true);
  }

  const nameChallengeHits = evalNameChallenge(raw, ctx);
  return buildVerdict([...preChallengeHits, ...nameChallengeHits], false);
}

function buildVerdict(hits: RuleHit[], needsNameChallenge: boolean): Verdict {
  const score = scoreHits(hits);
  const level = levelForHits(hits);
  return {
    level,
    score,
    hits,
    needsNameChallenge,
    explain: staticExplain(level, hits),
  };
}

function staticExplain(level: VerdictLevel, hits: RuleHit[]): string {
  if (!hits.length) {
    return "Kode QR ini terlihat aman. Lanjutkan pembayaran seperti biasa.";
  }
  const top = [...hits].sort((a, b) => b.weight - a.weight)[0];
  const text = reasonText(top.reasonId);
  if (level === "DANGER") return `${text} Jangan lanjutkan pembayaran ini.`;
  if (level === "WARNING") return `${text} Periksa dulu sebelum membayar.`;
  return text;
}
