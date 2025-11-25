import { redirect } from "next/navigation";

export default function BookingRedirectPage() {
  // Server-side redirect prevents any legacy content from rendering client-side
  redirect("/booking-local");
}
