"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

// ✅ FIX PC3: Permettre accès /admin/license sans authentification pour activation
const PUBLIC_ROUTES = new Set<string>([
  "/auth/login", 
  "/auth/register",
  "/admin/license",  // Permettre activation licence sur nouveau PC
  "/admin/license/upgrade",  // Permettre voir offres
  "/admin/license/blocked"  // Permettre voir page blocage
]);

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready, user } = useAuth();
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Vérifier la validité du token côté serveur
  useEffect(() => {
    if (!ready || !user) {
      setTokenValid(false);
      return;
    }

    // Vérifier le token en faisant une requête légère
    const checkToken = async () => {
      try {
        const token = window.localStorage.getItem("jwt_token");
        if (!token) {
          setTokenValid(false);
          return;
        }

        // Faire une requête légère pour vérifier le token
        const res = await fetch('/api/account/settings', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (res.ok || res.status === 404) {
          // 404 est OK (pas de settings), 200 est OK
          setTokenValid(true);
        } else if (res.status === 401) {
          // Token invalide ou expiré
          setTokenValid(false);
          window.localStorage.removeItem("jwt_token");
          window.localStorage.removeItem("user");
          window.dispatchEvent(new Event('auth:logout'));
        } else {
          // Autre erreur, considérer comme valide pour l'instant
          setTokenValid(true);
        }
      } catch (error) {
        // Erreur réseau, considérer comme valide pour éviter les déconnexions intempestives
        setTokenValid(true);
      }
    };

    checkToken();
  }, [ready, user]);

  // Redirect effect (must not be conditional)
  useEffect(() => {
    const isPublic = PUBLIC_ROUTES.has(pathname) || pathname === "/";
    if (ready && (!user || tokenValid === false) && !isPublic) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [ready, user, tokenValid, pathname, router]);

  const isPublic = PUBLIC_ROUTES.has(pathname) || pathname === "/";
  if (isPublic) return <>{children}</>;

  // While auth state is initializing or token is being validated, render a deterministic skeleton
  if (!ready || tokenValid === null) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height={56}
      >
        <CircularProgress size={20} />
      </Box>
    );
  }

  // Protected route: hide content until user is present and token is valid (redirect happens via effect)
  if (!user || tokenValid === false) return null;

  return <>{children}</>;
}
