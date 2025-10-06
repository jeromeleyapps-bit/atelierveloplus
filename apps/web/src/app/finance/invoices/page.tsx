import { redirect } from "next/navigation";

export default function InvoicesIndexRedirect() {
  // Redirect legacy/pathless list to Factures main page
  redirect("/finance");
}
