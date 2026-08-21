import { levenshtein } from "./levenshtein";

const STOPWORDS = new Set([
  "toko", "warung", "kedai", "depot", "resto", "cafe", "kios",
  "ayam", "geprek", "nasi", "mie", "bakso", "kopi", "es",
  "jaya", "makmur", "abadi", "sejahtera", "berkah", "barokah",
  "indah", "raya",
]);

export function significantTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/** true = match, false = mismatch, null = inconclusive (only generic words typed) */
export function nameMatches(typed: string, fromQr: string): boolean | null {
  const a = significantTokens(typed);
  const b = significantTokens(fromQr);
  if (!a.length || !b.length) return null;
  return a.some((x) => b.some((y) => levenshtein(x, y) <= 1));
}
