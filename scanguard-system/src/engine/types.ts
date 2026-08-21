export interface Coords {
  lat: number;
  lng: number;
  accuracyM: number;
}

export interface PlaceMemory {
  id: string;
  centroid: { lat: number; lng: number };
  samples: number;
  nmids: Record<string, { count: number; name: string; lastSeen: number }>;
}

export interface PaidMerchant {
  nmid: string;
  amount: number;
  ts: number;
}

export interface Context {
  coords?: Coords;
  places: PlaceMemory[];
  history: PaidMerchant[];
  reportedNmids: Set<string>;
  nameAnswer?: string;
  now?: number; // injectable for tests; defaults to Date.now()
  recentNmids?: { nmid: string; ts: number }[]; // for L4_RAPID_REPEAT
}

export type Severity = "info" | "warning" | "danger";
export type Layer = 1 | 2 | 3 | 4;

export interface RuleHit {
  ruleId: string;
  layer: Layer;
  severity: Severity;
  weight: number;
  reasonId: string;
  evidence: Record<string, unknown>;
}

export type VerdictLevel = "SAFE" | "WARNING" | "DANGER";

export interface Verdict {
  level: VerdictLevel;
  score: number;
  hits: RuleHit[];
  needsNameChallenge: boolean;
  explain: string;
}
