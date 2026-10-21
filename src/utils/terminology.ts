// Hydro plants call this hierarchy "Auxiliary"; thermal plants call it "BOP".
// Anyone whose plants span both types (and admins, who manage both) sees the combined term.
export function bopTerm(
  classifications: string[],
  isAdmin?: boolean
): 'BOP' | 'Auxiliary' | 'BOP / Auxiliary' {
  if (isAdmin) return 'BOP / Auxiliary';
  const types = new Set(classifications.map((c) => (c ?? '').toLowerCase()));
  const hydro = types.has('hydro');
  const thermal = types.has('thermal');
  if (hydro && thermal) return 'BOP / Auxiliary';
  if (hydro) return 'Auxiliary';
  if (thermal) return 'BOP';
  // No hydro/thermal plant to go by (e.g. no plants assigned): show both names
  return 'BOP / Auxiliary';
}
