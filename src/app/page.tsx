"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { logger } from '@/lib/logger';

export default function HomePage() {
  logger.info('[HOME] HomePage mounting');
  const router = useRouter();

  useEffect(() => {
    logger.info('[HOME] Redirecting to /auth/login');
    // Redirection immédiate vers login
    // Le middleware gérera la redirection vers dashboard si authentifié
    router.replace("/auth/login");
  }, [router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Chargement...</p>
    </div>
  );
}
