import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useIsAuthenticated } from '@azure/msal-react';
import { meApi } from '../api/auth/meApi';
import type { CurrentUserProfile } from '../types/userManagement';

interface UserContextValue {
  profile: CurrentUserProfile | null;
  loading: boolean;
  error: string | null;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  isPlantUser: boolean;       // true if user is restricted to specific plants
  userPlantCodes: string[];   // list of plant codes the user is assigned to
  userPlantClassifications: string[]; // list of classification types for user's plants (e.g. ['hydro', 'thermal'])
  reload: () => void;
}

const UserContext = createContext<UserContextValue>({
  profile: null, loading: true, error: null,
  hasPermission: () => false, hasAnyPermission: () => false,
  isPlantUser: false, userPlantCodes: [], userPlantClassifications: [], reload: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    setLoading(true);
    meApi.getProfile()
      .then((res) => { setProfile(res.data); setError(null); })
      .catch((err) => {
        const msg = err?.response?.data?.message ?? 'Failed to load user profile.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, tick]);

  const hasPermission = (code: string) =>
    profile?.isAdmin || profile?.permissions.includes(code) || false;

  const hasAnyPermission = (codes: string[]) =>
    codes.some((c) => hasPermission(c));

  // Plant-restricted users have assigned plants and are not admins
  const isPlantUser = !profile?.isAdmin && (profile?.plants.length ?? 0) > 0;
  const userPlantCodes = profile?.plants.map((p) => p.plantCode) ?? [];
  const userPlantClassifications = [...new Set(
    profile?.plants.map((p) => p.classificationType?.toLowerCase()).filter(Boolean) ?? []
  )] as string[];

  return (
    <UserContext.Provider value={{
      profile, loading, error,
      hasPermission, hasAnyPermission,
      isPlantUser, userPlantCodes, userPlantClassifications,
      reload: () => setTick((t) => t + 1),
    }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);