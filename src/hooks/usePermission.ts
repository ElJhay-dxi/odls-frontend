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