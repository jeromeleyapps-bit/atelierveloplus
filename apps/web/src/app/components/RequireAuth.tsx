"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";
import { Box, CircularProgress } from "@mui/material";

const PUBLIC_ROUTES = new Set<string>(["/auth/login", "/auth/register"]);

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready, user } = useAuth();
  const pathname = usePathname() || "/";
  const router = useRouter();

  // Redirect effect (must not be conditional)
  useEffect(() => {
    const isPublic = PUBLIC_ROUTES.has(pathname) || pathname === "/";
    if (ready && !user && !isPublic) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [ready, user, pathname, router]);

  const isPublic = PUBLIC_ROUTES.has(pathname) || pathname === "/";
  if (isPublic) return <>{children}</>;

  // While auth state is initializing, render a deterministic skeleton
  if (!ready) {
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

  // Protected route: hide content until user is present (redirect happens via effect)
  if (!user) return null;

  return <>{children}</>;
}
