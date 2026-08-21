/** Hardcoded Indonesian copy for every reasonId. Used when the LLM layer
 * is unavailable or times out — the app must read identically either way. */
export const REASONS_ID: Record<string, string> = {
  L1_MALFORMED:
    "Kode QR ini rusak atau tidak lengkap. Strukturnya tidak bisa dibaca dengan benar.",
  L1_CRC_MISMATCH:
    "Isi kode QR ini sudah diubah setelah dicetak. Kode pengaman di dalamnya tidak cocok lagi.",
  L1_BAD_FORMAT:
    "Format kode QR ini bukan format QRIS yang seharusnya.",
  L1_WRONG_COUNTRY:
    "Kode QR ini tidak terdaftar untuk Indonesia.",
  L1_WRONG_CURRENCY:
    "Mata uang pada kode QR ini bukan Rupiah.",
  L1_NO_MERCHANT_ACCT:
    "Kode QR ini tidak memuat data merchant sama sekali.",

  L2_NMID_REPORTED:
    "Nomor merchant pada kode ini pernah dilaporkan sebagai penipuan oleh pengguna lain.",
  L2_NMID_MALFORMED:
    "Nomor identitas merchant pada kode ini formatnya tidak wajar.",
  L2_NMID_UNKNOWN:
    "Ini pertama kalinya kamu bertemu merchant ini. Belum ada riwayat yang bisa dicocokkan.",
  L2_LOOKALIKE_NAME:
    "Nama merchant ini mirip sekali dengan merchant lain yang sudah dikenal — bisa jadi typo yang disengaja.",

  L3_PLACE_NMID_SWITCH:
    "Di titik lokasi ini, biasanya kamu membayar merchant lain. Merchant pada kode ini berbeda dari kebiasaan di sini.",
  L3_GEO_CITY_MISMATCH:
    "Kota pada kode QR ini jauh dari lokasimu sekarang.",
  L3_MCC_AMOUNT_ANOMALY:
    "Nominal ini jauh lebih besar dari wajarnya untuk jenis usaha seperti ini.",
  L3_SUSPICIOUS_TIP:
    "Kode ini meminta kamu mengisi sendiri nominal tip, dan merchant-nya belum dikenal.",
  L3_NAME_MISMATCH:
    "Nama toko yang kamu ketik tidak cocok dengan nama penerima pada kode QR ini.",
  L3_NAME_INCONCLUSIVE:
    "Nama yang kamu ketik terlalu umum untuk dicocokkan dengan pasti.",

  L4_FIRST_TIME_PAYEE:
    "Kamu belum pernah membayar merchant ini sebelumnya.",
  L4_AMOUNT_OUTLIER:
    "Nominal ini jauh lebih besar dari kebiasaan transaksimu.",
  L4_RAPID_REPEAT:
    "Kamu memindai beberapa kode QR berbeda dalam waktu singkat.",
};

export function reasonText(reasonId: string): string {
  return REASONS_ID[reasonId] ?? "Alasan tidak diketahui.";
}
