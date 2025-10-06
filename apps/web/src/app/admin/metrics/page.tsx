"use client";

// This page has been removed. Redirect to /admin to avoid dead routes.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Removed() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin");
  }, [router]);
  return null;
}

// (no content)
