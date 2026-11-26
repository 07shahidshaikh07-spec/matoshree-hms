// Shared (client + server) vitals limits so the form and the API agree.

export interface VitalLimit {
  label: string;
  unit: string;
  min: number;
  max: number;
  int: boolean;
}

export const VITAL_LIMITS = {
  bloodPressureSys: { label: "BP Sys", unit: "mmHg", min: 50, max: 260, int: true },
  bloodPressureDia: { label: "BP Dia", unit: "mmHg", min: 30, max: 160, int: true },
  pulseRateBpm: { label: "Pulse", unit: "bpm", min: 30, max: 220, int: true },
  temperatureF: { label: "Temp", unit: "°F", min: 90, max: 110, int: false },
  spo2Percent: { label: "SpO2", unit: "%", min: 50, max: 100, int: true },
  weightKg: { label: "Weight", unit: "kg", min: 0.5, max: 300, int: false },
  heightCm: { label: "Height", unit: "cm", min: 20, max: 250, int: false }
} as const satisfies Record<string, VitalLimit>;

export type VitalKey = keyof typeof VITAL_LIMITS;

export function vitalRangeMessage(key: VitalKey): string {
  const l = VITAL_LIMITS[key];
  return `${l.label} must be between ${l.min} and ${l.max} ${l.unit}`;
}

/** Returns a list of human-readable problems (empty when every filled value is in range). */
export function validateVitalValues(values: Partial<Record<VitalKey, string>>): string[] {
  const problems: string[] = [];
  (Object.keys(VITAL_LIMITS) as VitalKey[]).forEach((key) => {
    const raw = (values[key] ?? "").toString().trim();
    if (raw === "") return;
    const n = Number(raw);
    const l: VitalLimit = VITAL_LIMITS[key];
    if (!isFinite(n) || n < l.min || n > l.max || (l.int && !Number.isInteger(n))) {
      problems.push(`${vitalRangeMessage(key)} (you entered ${raw})`);
    }
  });
  return problems;
}
