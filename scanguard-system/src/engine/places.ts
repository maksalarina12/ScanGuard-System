import type { Coords, PlaceMemory } from "./types";

const PLACE_RADIUS_M = 25;

/** Haversine distance in meters. */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function findNearestPlace(places: PlaceMemory[], coords: Coords): PlaceMemory | undefined {
  let nearest: PlaceMemory | undefined;
  let nearestDist = Infinity;
  for (const p of places) {
    const d = distanceM(p.centroid, coords);
    if (d <= PLACE_RADIUS_M && d < nearestDist) {
      nearest = p;
      nearestDist = d;
    }
  }
  return nearest;
}

/** Upsert a completed payment into place memory. Mutates and returns the list. */
export function upsertPlace(
  places: PlaceMemory[],
  coords: Coords,
  nmid: string,
  merchantName: string,
  now: number,
): PlaceMemory[] {
  const existing = findNearestPlace(places, coords);
  if (!existing) {
    const fresh: PlaceMemory = {
      id: `place_${now}_${Math.random().toString(36).slice(2, 8)}`,
      centroid: { lat: coords.lat, lng: coords.lng },
      samples: 1,
      nmids: { [nmid]: { count: 1, name: merchantName, lastSeen: now } },
    };
    return [...places, fresh];
  }
  return places.map((p) => {
    if (p.id !== existing.id) return p;
    const n = p.samples + 1;
    const centroid = {
      lat: p.centroid.lat + (coords.lat - p.centroid.lat) / n,
      lng: p.centroid.lng + (coords.lng - p.centroid.lng) / n,
    };
    const prior = p.nmids[nmid];
    const nmids = {
      ...p.nmids,
      [nmid]: { count: (prior?.count ?? 0) + 1, name: merchantName, lastSeen: now },
    };
    return { ...p, samples: n, centroid, nmids };
  });
}

export interface DominantNmid {
  nmid: string;
  share: number;
}

export function dominantNmid(place: PlaceMemory): DominantNmid | undefined {
  const total = Object.values(place.nmids).reduce((s, v) => s + v.count, 0);
  if (total === 0) return undefined;
  let best: DominantNmid | undefined;
  for (const [nmid, v] of Object.entries(place.nmids)) {
    const share = v.count / total;
    if (!best || share > best.share) best = { nmid, share };
  }
  return best;
}
