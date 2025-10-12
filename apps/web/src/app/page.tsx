"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth/AuthContext";

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isPublicDomain, setIsPublicDomain] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      setIsPublicDomain(hostname === 'rdv.upgradedbikes.com');
    }
  }, []);

  useEffect(() => {
    // Attendre que isPublicDomain soit initialisé
    if (isPublicDomain === null) return;

    // Sur domaine public, toujours aller vers /rdv
    if (isPublicDomain) {
      router.push("/rdv");
    } else {
      // Sur domaine local, si connecté -> dashboard, sinon -> rdv
      if (user) {
        router.push("/dashboard");
      } else {
        router.push("/rdv");
      }
    }
  }, [user, router, isPublicDomain]);

  return null;
}
