"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authLogin, authRegister } from "@/lib/api";
import { logger } from '@/lib/logger';

export type AuthUser = {
  id: string;
  email?: string;
  shopName?: string;
};

export type AuthContextValue = {
  ready: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    shopName?: string;
    isAutoEntrepreneur?: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    logger.info('[AUTH] AuthContext initializing');

    // Charge depuis localStorage après le montage (évite un écart SSR/CSR), puis
    // VÉRIFIE que le jeton est réellement valide côté serveur. Un jeton présent mais
    // signé avec un ancien JWT_SECRET (rotation de secrets, réinstallation par-dessus
    // d'anciennes données) doit être purgé : sinon l'application tourne en session
    // fantôme et le wizard de première configuration échoue silencieusement.
    async function initAuth() {
      const token = window.localStorage.getItem("jwt_token");
      const userStr = window.localStorage.getItem("user");
      logger.info('[AUTH] Token exists', { exists: !!token });
      logger.info('[AUTH] User data exists', { exists: !!userStr });

      if (!token || !userStr) {
        logger.info('[AUTH] No token or user data - user is null');
        setReady(true);
        logger.info('[AUTH] AuthContext ready');
        return;
      }

      let stored: AuthUser | null = null;
      try {
        const parsed = JSON.parse(userStr);
        stored = { id: parsed.id, email: parsed.email, shopName: parsed.shopName };
      } catch (_e) {
        logger.info('[AUTH] Invalid user data - clearing');
        window.localStorage.removeItem("jwt_token");
        window.localStorage.removeItem("user");
        setReady(true);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          logger.warn('[AUTH] Jeton de session périmé - purge et retour à la connexion');
          window.localStorage.removeItem("jwt_token");
          window.localStorage.removeItem("user");
          setUser(null);
          setReady(true);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setUser({
            id: data.user.id,
            email: data.user.email,
            shopName: stored.shopName,
          });
        } else {
          // Serveur indisponible ou erreur inattendue : on garde la session locale
          // plutôt que de déconnecter l'utilisateur à tort.
          logger.warn('[AUTH] Vérification du jeton impossible - session locale conservée', {
            status: res.status,
          });
          setUser(stored);
        }
      } catch (err) {
        logger.warn('[AUTH] Vérification du jeton injoignable - session locale conservée', {
          error: err instanceof Error ? err.message : String(err),
        });
        setUser(stored);
      }

      setReady(true);
      logger.info('[AUTH] AuthContext ready');
    }

    void initAuth();
    
    // Écouter les événements de déconnexion depuis api.ts
    const handleStorageChange = () => {
      const token = window.localStorage.getItem("jwt_token");
      if (!token) {
        // Token supprimé → déconnecter
        setUser(null);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Événement custom pour déconnexion dans le même onglet
    window.addEventListener('auth:logout', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth:logout', handleStorageChange);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authLogin({ email, password });
    // Store JWT token
    window.localStorage.setItem("jwt_token", response.token);
    window.localStorage.setItem("user", JSON.stringify(response.user));
    setUser({ id: response.user.id, email: response.user.email });
  };

  const register = async (input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    shopName?: string;
    isAutoEntrepreneur?: boolean;
  }) => {
    const response = await authRegister(input);
    logger.info('[AuthContext] Register response:', response);
    logger.info('[AuthContext] Has token?', { hasToken: 'token' in response });
    logger.info('[AuthContext] Has user?', { hasUser: 'user' in response });
    
    // Register now returns token - auto-login
    if ('token' in response && 'user' in response) {
      logger.info('[AuthContext] Storing token in localStorage');
      window.localStorage.setItem("jwt_token", response.token);
      window.localStorage.setItem("user", JSON.stringify(response.user));
      setUser({ id: response.user.id, email: response.user.email, shopName: response.user.shopName });
      logger.info('[AuthContext] Token stored, user set');
    } else {
      logger.info('[AuthContext] Using fallback (old format)');
      // Fallback for old response format
      window.localStorage.setItem("user", JSON.stringify({ id: response.id, email: response.email, shopName: response.shopName }));
      setUser({ id: response.id, email: response.email, shopName: response.shopName });
    }
  };

  const logout = async () => {
    window.localStorage.removeItem("jwt_token");
    window.localStorage.removeItem("user");
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ ready, user, login, register, logout }),
    [ready, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
