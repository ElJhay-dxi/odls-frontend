import { MsalProvider } from '@azure/msal-react';
import type { ReactNode } from 'react';
import { msalInstance } from './msalInstance';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  return (
    <MsalProvider instance={msalInstance}>
      {children}
    </MsalProvider>
  );
};