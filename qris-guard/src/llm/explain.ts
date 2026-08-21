import type { Verdict } from "../engine/types";

const SYSTEM_PROMPT = `Kamu penerjemah keamanan untuk aplikasi pembayaran Indonesia. Kamu menerima
hasil pemeriksaan yang SUDAH final. Tugasmu hanya menjelaskannya.

ATURAN KERAS:
- Jangan pernah mengubah, melunakkan, atau membantah level risiko yang diberikan.
- Maksimal 2 kalimat. Bahasa Indonesia sehari-hari, tanpa istilah teknis.
- Jangan sebut CRC, TLV, NMID, koordinat, atau nama tag apa pun.
- Kalau level DANGER, akhiri dengan satu tindakan konkret.
- Balas teks polos, tanpa markdown.`;

const TIMEOUT_MS = 2000;

/**
 * Sends only the finished verdict (level, score, rule ids) — never the raw
 * QR payload or coordinates — to phrase it in plain Indonesian. The LLM
 * cannot change the verdict; on any failure or timeout the engine's own
 * static copy (verdict.explain) is used unchanged.
 */
export async function explainVerdict(verdict: Verdict): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) return verdict.explain;

  const summary = {
    level: verdict.level,
    score: verdict.score,
    reasons: verdict.hits.map((h) => h.reasonId),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify(summary) }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return verdict.explain;
    const data = await res.json();
    const text = data?.content?.[0]?.text?.trim();
    return text || verdict.explain;
  } catch {
    return verdict.explain;
  } finally {
    clearTimeout(timer);
  }
}
