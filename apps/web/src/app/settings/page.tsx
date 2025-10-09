"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Rediriger vers la page Account (fusion des deux pages)
    router.replace("/account");
  }, [router]);
  
  return null;
}
