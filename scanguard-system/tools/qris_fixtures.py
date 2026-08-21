"""
ScanGuard System - Test Fixture Generator & Validator
================================================
Membuat QR uji coba (versi BENAR dan versi TIMPA) untuk menguji detektor kamu.

PENTING: semua NMID / nama merchant di file ini FIKTIF. Jangan pernah pakai
NMID merchant asli milik orang lain. File ini hanya untuk menguji sistem
deteksi kamu sendiri di laptop sendiri.

Jalankan:  python3 qris_fixtures.py
Output  :  fixtures.json + folder qr_png/ (kalau qrcode terpasang)
"""

import json
import os

# ---------------------------------------------------------------- CRC & TLV

def crc16_ccitt_false(s: str) -> str:
    """CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, no reflect, no xorout."""
    crc = 0xFFFF
    for byte in s.encode("utf-8"):
        crc ^= byte << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    return f"{crc:04X}"


def tlv(tag: str, value: str) -> str:
    """Encode satu blok Tag-Length-Value. Length selalu 2 digit."""
    if len(value) > 99:
        raise ValueError(f"value tag {tag} kepanjangan ({len(value)})")
    return f"{tag}{len(value):02d}{value}"


def parse_tlv(payload: str) -> dict:
    """Parse string EMVCo jadi dict {tag: value}. Raise kalau struktur rusak."""
    out, i = {}, 0
    while i < len(payload):
        if i + 4 > len(payload):
            raise ValueError(f"TLV terpotong di posisi {i}")
        tag = payload[i:i + 2]
        try:
            length = int(payload[i + 2:i + 4])
        except ValueError:
            raise ValueError(f"length bukan angka di tag {tag}")
        value = payload[i + 4:i + 4 + length]
        if len(value) < length:
            raise ValueError(f"value tag {tag} lebih pendek dari length")
        out[tag] = value
        i += 4 + length
    return out


def validate_crc(payload: str) -> bool:
    """CRC dihitung atas SELURUH string termasuk '6304', tidak termasuk 4 digit CRC."""
    if len(payload) < 8 or payload[-8:-4] != "6304":
        return False
    return crc16_ccitt_false(payload[:-4]).upper() == payload[-4:].upper()


# ---------------------------------------------------------------- Builder

def build_qris(nmid, merchant_id, name, city, mcc="5812", postal="40257",
               amount=None, criteria="UMI", terminal="A01"):
    """Bangun payload QRIS statis (tanpa amount) atau dinamis (dengan amount)."""
    mai = (tlv("00", "ID.CO.QRIS.WWW") + tlv("01", nmid)
           + tlv("02", merchant_id) + tlv("03", criteria))
    domestic = tlv("00", "ID.CO.QRIS.WWW") + tlv("02", nmid) + tlv("03", criteria)

    p = tlv("00", "01")
    p += tlv("01", "12" if amount else "11")   # 11=statis, 12=dinamis
    p += tlv("26", mai)
    p += tlv("51", domestic)
    p += tlv("52", mcc)
    p += tlv("53", "360")                       # IDR
    if amount:
        p += tlv("54", amount)
    p += tlv("58", "ID")
    p += tlv("59", name[:25])
    p += tlv("60", city[:15])
    p += tlv("61", postal)
    p += tlv("62", tlv("07", terminal))
    p += "6304"
    return p + crc16_ccitt_false(p)


# ---------------------------------------------------------------- Fixtures

def make_fixtures():
    f = []

    # --- 3 QR SEHAT --------------------------------------------------------
    f.append(dict(
        id="OK-01", label="Warung kopi, QR statis, sehat",
        expected="SAFE",
        payload=build_qris("936000911223344556", "112233445566778",
                           "WARUNG KOPI NUSA", "BANDUNG")))

    f.append(dict(
        id="OK-02", label="Toko kelontong, QR dinamis Rp25.000, sehat",
        expected="SAFE",
        payload=build_qris("936000911223344557", "112233445566779",
                           "TOKO BERKAH JAYA", "BANDUNG",
                           mcc="5411", amount="25000.00")))

    f.append(dict(
        id="OK-03", label="Merchant besar, sudah pernah dibayar sebelumnya",
        expected="SAFE",
        payload=build_qris("936000911223344558", "112233445566780",
                           "APOTEK SEHAT NUSA", "BANDUNG", mcc="5912")))

    # --- 4 QR BERMASALAH ---------------------------------------------------

    # 1. Edit malas: nama diganti, CRC tidak dihitung ulang -> CRC GAGAL
    base = f[0]["payload"]
    f.append(dict(
        id="BAD-01", label="Nama merchant diedit, CRC tidak diperbarui",
        expected="DANGER", reason="crc_mismatch",
        payload=base.replace("WARUNG KOPI NUSA", "WARUNG K0PI NUSA")))

    # 2. Struktur rusak (QR sobek / hasil scan cacat) -> PARSE GAGAL
    f.append(dict(
        id="BAD-02", label="Payload terpotong / rusak",
        expected="DANGER", reason="malformed",
        payload=base[:-30]))

    # 3. Timpa cerdas: NMID diganti, CRC DIHITUNG ULANG, nama disamakan.
    #    CRC LULUS. Ini kasus yang membuktikan CRC saja tidak cukup.
    f.append(dict(
        id="BAD-03", label="QR ditimpa penuh, NMID asing, CRC valid",
        expected="DANGER", reason="unknown_nmid + name_reuse",
        payload=build_qris("936000999887766554", "998877665544332",
                           "WARUNG KOPI NUSA", "BANDUNG")))

    # 4. Nama mirip (homoglyph) + kota tidak cocok lokasi user
    f.append(dict(
        id="BAD-04", label="Nama mirip merchant terkenal + kota beda jauh",
        expected="WARNING", reason="lookalike_name + geo_mismatch",
        payload=build_qris("936000955443322110", "554433221100998",
                           "WARUNG KOPI NUSAA", "SURABAYA")))

    # --- TIPE C: QR ASLI DI TEMPAT YANG SALAH -----------------------------
    # Kasus Zikri. QR ini SAH 100%. Terdaftar resmi, CRC valid, NMID benar.
    # Tidak ada satu pun pemeriksaan struktural yang bisa menolaknya.
    # Satu-satunya yang tahu ini salah adalah pembeli.
    f.append(dict(
        id="OVERLAY-01",
        label="QR asli milik warung sebelah, ditempel di warung Anam",
        expected="CHALLENGE",
        reason="butuh tantangan nama - tidak terdeteksi dari isi QR",
        intended_merchant="AYAM GEPREK ANAM",
        payload=build_qris("936000922334455667", "223344556677889",
                           "AYAM GEPREK ZIKRI", "BANDUNG")))

    return f


# ---------------------------------------------------------------- Nama

STOPWORDS = {"toko", "warung", "kedai", "depot", "resto", "cafe", "kios",
             "ayam", "geprek", "nasi", "mie", "bakso", "kopi", "es",
             "jaya", "makmur", "abadi", "sejahtera", "berkah", "barokah",
             "indah", "raya"}


def significant_tokens(s):
    """Buang kata umum, sisakan kata pembeda ('anam', 'zikri')."""
    cleaned = "".join(c if c.isalnum() else " " for c in s.lower())
    return [t for t in cleaned.split() if len(t) >= 3 and t not in STOPWORDS]


def levenshtein(a, b):
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a):
        cur = [i + 1]
        for j, cb in enumerate(b):
            cur.append(min(prev[j + 1] + 1, cur[j] + 1, prev[j] + (ca != cb)))
        prev = cur
    return prev[-1]


def name_matches(typed, from_qr):
    """True = cocok, False = beda, None = tidak bisa disimpulkan."""
    a, b = significant_tokens(typed), significant_tokens(from_qr)
    if not a or not b:
        return None
    return any(levenshtein(x, y) <= 1 for x in a for y in b)


def main():
    fixtures = make_fixtures()
    for fx in fixtures:
        fx["crc_valid"] = validate_crc(fx["payload"])
        try:
            fx["parsed_tags"] = sorted(parse_tlv(fx["payload"]).keys())
        except ValueError as e:
            fx["parsed_tags"] = None
            fx["parse_error"] = str(e)

    with open("fixtures.json", "w") as fh:
        json.dump(fixtures, fh, indent=2)

    print(f"{'ID':<12}{'CRC':<7}{'HARAPAN':<11}KETERANGAN")
    print("-" * 78)
    for fx in fixtures:
        print(f"{fx['id']:<12}{str(fx['crc_valid']):<7}{fx['expected']:<11}{fx['label']}")

    # PNG opsional
    try:
        import qrcode
        os.makedirs("qr_png", exist_ok=True)
        for fx in fixtures:
            qrcode.make(fx["payload"]).save(f"qr_png/{fx['id']}.png")
        print("\nPNG tersimpan di qr_png/ - tempel di layar lain lalu scan pakai app kamu.")
    except ImportError:
        print("\n(pip install qrcode[pil] kalau mau otomatis jadi gambar PNG)")

    print("\n--- Uji pencocokan nama (kasus Zikri) ---")
    qr_name = "AYAM GEPREK ZIKRI"
    for typed in ["ayam geprek anam", "anam", "warung anam",
                  "geprek anam", "ayam geprek zikri", "ayam geprek"]:
        r = name_matches(typed, qr_name)
        verdict = {True: "COCOK", False: "BEDA -> TAHAN", None: "tak jelas"}[r]
        print(f"  pembeli ketik {typed!r:22} -> {verdict}")

    print("\nCATATAN PENTING:")
    print("  BAD-03    lolos cek CRC. Kalau detektor cuma cek CRC, dia gagal.")
    print("  OVERLAY-01 lolos SEMUA cek teknis, karena QR-nya memang asli.")
    print("             Hanya tantangan nama yang bisa menangkapnya.")


if __name__ == "__main__":
    main()
