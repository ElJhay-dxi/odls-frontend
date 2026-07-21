import { useUser } from '../context/UserContext';

/**
 * Returns whether the current user has a given permission code.
 * Admins always return true.
 * Usage: const canCreate = usePermission('daily.energy_hydro.create');
 */
export function usePermission(code: string): boolean {
  const { hasPermission } = useUser();
  return hasPermission(code);
}

/**
 * Returns whether the current user has ANY of the given permission codes.
 */
export function useAnyPermission(codes: string[]): boolean {
  const { hasAnyPermission } = useUser();
  return hasAnyPermission(codes);
}

/**
 * Returns all CRUD permission flags for a given section.
 * Usage: const { canView, canCreate, canEdit, canDelete } = useSectionPermissions('daily.energy_hydro');
 */
export function useSectionPermissions(section: string) {
  const { hasPermission } = useUser();
  return {
    canView:   hasPermission(`${section}.view`),
    canCreate: hasPermission(`${section}.create`),
    canEdit:   hasPermission(`${section}.edit`),
    canDelete: hasPermission(`${section}.delete`),
  };
}

/**
 * Returns the list of plant codes the current user is assigned to.
 * If the user is an admin or has no plant restrictions, returns empty array.
 */
export function useUserPlants(): { isPlantUser: boolean; plantCodes: string[] } {
  const { isPlantUser, userPlantCodes } = useUser();
  return { isPlantUser, plantCodes: userPlantCodes };
}
/**
 * Filters a plant list to only those the current user is assigned to.
 * If the user is an admin or unrestricted, all plants are returned.
 * Also returns plantLocked (true when user has exactly one plant — auto-select + disable)
 * and autoPlantCode (the single plant code to auto-select, or undefined).
 */
export function usePlantFilter<T extends { plantCode: string }>(plants: T[]) {
  const { isPlantUser, userPlantCodes } = useUser();

  const availablePlants = isPlantUser
    ? plants.filter((p) => userPlantCodes.includes(p.plantCode))
    : plants;

  const plantLocked = isPlantUser && availablePlants.length === 1;
  const autoPlantCode = plantLocked ? availablePlants[0]?.plantCode : undefined;

  return { availablePlants, plantLocked, autoPlantCode, isPlantUser };
}