import type { ShiftOption } from '../types/shiftLog';

const HYDRO_SHIFTS: ShiftOption[] = [
  { code: 'A', label: 'Morning 06:00–14:00' },
  { code: 'B', label: 'Afternoon 14:00–22:00' },
  { code: 'C', label: 'Night 22:00–06:00' },
];

const THERMAL_SHIFTS: ShiftOption[] = [
  { code: 'A', label: 'Day 07:00–19:00' },
  { code: 'B', label: 'Night 19:00–07:00' },
];

export function getShiftOptions(classificationType?: string): ShiftOption[] {
  if (!classificationType) return [];
  return classificationType.toLowerCase() === 'hydro' ? HYDRO_SHIFTS : THERMAL_SHIFTS;
}