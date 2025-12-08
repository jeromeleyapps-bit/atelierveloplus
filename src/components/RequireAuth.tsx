"use client";

import { useAuth } from "@/app/auth/AuthContext";
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

// Keep UserRole type locally for prop compatibility (role enforcement can be added later if needed)
type UserRole = "user" | "admin" | "technician" | "accountant";

interface RequireAuthProps {
  children: React.ReactNode;
  role?: UserRole;
  fallback?: React.ReactNode;
}

export default function RequireAuth({ children, role: _role, fallback }: RequireAuthProps) {
  const { ready, user } = useAuth();
  
  // Temporary bypass on client if env flag is set
  if (process.env.NEXT_PUBLIC_DISABLE_AUTH === "true") {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Vérification de l&apos;authentification...
        </Typography>
      </Box>
    );
  }

  // If not authenticated, redirect to login preserving callback URL
  if (!user) {
    if (typeof window !== "undefined") {
      const cb = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/auth/login?callbackUrl=${cb}`;
    }
    if (fallback) return <>{fallback}</>;

    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Typography variant="h5">Accès refusé</Typography>
        <Typography variant="body2" color="text.secondary">
          Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
}
