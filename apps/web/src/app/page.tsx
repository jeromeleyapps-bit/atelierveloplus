import { redirect } from "next/navigation";

export default function HomePage() {
  // Server Component redirect to avoid SSR/CSR mismatch
  redirect("/dashboard");
}
