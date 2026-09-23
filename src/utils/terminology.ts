// Thermal plants call this hierarchy "Auxiliary"; hydro (and everything else) calls it "BOP".
// Admins manage both plant types, so they see the combined term everywhere.
export function bopTerm(
  classifications: string[],
  isAdmin?: boolean
): 'BOP' | 'Auxiliary' | 'BOP / Auxiliary' {
  if (isAdmin) return 'BOP / Auxiliary';
  if (classifications.length > 0 && classifications.every((c) => c.toLowerCase() === 'thermal')) return 'Auxiliary';
  return 'BOP';
}
