/**
 * CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, no reflect, no xorout.
 * Computed over the whole payload including the literal "6304" prefix
 * of the CRC field, excluding the final 4 hex chars themselves.
 */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(input)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function validateCrc(payload: string): boolean {
  if (payload.length < 8 || payload.slice(-8, -4) !== "6304") return false;
  return crc16(payload.slice(0, -4)) === payload.slice(-4).toUpperCase();
}
