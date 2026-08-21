import type { RuleHit, VerdictLevel } from "./types";

export function scoreHits(hits: RuleHit[]): number {
  return Math.min(100, hits.reduce((s, h) => s + h.weight, 0));
}

export function levelForHits(hits: RuleHit[]): VerdictLevel {
  const anyLayer1 = hits.some((h) => h.layer === 1);
  const anyDanger = hits.some((h) => h.severity === "danger");
  if (anyLayer1 || anyDanger) return "DANGER";
  if (scoreHits(hits) >= 30) return "WARNING";
  return "SAFE";
}
