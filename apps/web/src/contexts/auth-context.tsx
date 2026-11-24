import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser, LoginInput, RegisterInput } from '@myanmart/shared';
import { apiRequest, jsonRequest } from '../lib/api-client';
import { clearGuestCart, readGuestCart, writeGuestCart } from '../lib/guest-cart';

type AuthResponse = { user: AuthUser; token: string };

async function mergeGuestCart(): Promise<void> {
  const remaining = [];
  for (const entry of readGuestCart()) {
    try {
      await apiRequest('/api/cart/items', { method: 'POST', ...jsonRequest(entry) });
    } catch {
      remaining.push(entry);
    }
  }
  if (remaining.length) writeGuestCart(remaining);
  else clearGuestCart();
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (input: LoginInput) => Promise<AuthUser>;
  signUp: (input: RegisterInput) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
}

const missingProvider = (): never => {
  throw new Error('Authentication actions require an AuthProvider');
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: false,
  signIn: missingProvider,
  signUp: missingProvider,
  signOut: missingProvider,
  refresh: missingProvider,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const currentUser = await apiRequest<AuthUser>('/api/me');
      setUser(currentUser);
      return currentUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  const signIn = useCallback(async (input: LoginInput) => {
    const response = await apiRequest<AuthResponse>('/api/login', {
      method: 'POST',
      ...jsonRequest(input),
    });
    setUser(response.user);
    await mergeGuestCart();
    return response.user;
  }, []);

  const signUp = useCallback(async (input: RegisterInput) => {
    const response = await apiRequest<AuthResponse>('/api/register', {
      method: 'POST',
      ...jsonRequest(input),
    });
    setUser(response.user);
    await mergeGuestCart();
    return response.user;
  }, []);

  const signOut = useCallback(async () => {
    await apiRequest<{ message: string }>('/api/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signUp, signOut, refresh }),
    [loading, refresh, signIn, signOut, signUp, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}