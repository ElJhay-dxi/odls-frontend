import { useUser } from '../context/UserContext';

/**
 * Returns true if the current user is a plant-restricted user
 * whose plant classification does NOT include the required type.
 * Use this to block access to pages that are type-specific.
 *
 * @example
 * const isWrongPlantType = usePlantTypeGuard('hydro');
 * if (isWrongPlantType) return <AccessDenied />;
 */
export function usePlantTypeGuard(requiredType: 'hydro' | 'thermal'): boolean {
  const { isPlantUser, userPlantClassifications } = useUser();
  return (
    isPlantUser &&
    userPlantClassifications.length > 0 &&
    !userPlantClassifications.includes(requiredType)
  );
}