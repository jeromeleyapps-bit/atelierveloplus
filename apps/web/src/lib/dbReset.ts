import { getPrisma } from "@/lib/db";

// Best-effort application data wipe for development.
// - Tries to delete in a safe order (children first).
// - Uses 'any' to avoid compile-time coupling to Prisma model types.
// - Silently ignores unknown models to be resilient to schema changes.
// - WARNING: Controlled by RESET_DB_ON_REGISTER env in register route.

const TRY_MODELS_IN_ORDER: string[] = [
  // Finance details first
  "invoicePayment",
  "invoiceLine",
  "invoice",
  // Work orders and related
  "workOrderPart",
  "laborEntry",
  "workOrder",
  // Catalog & stock
  "stockMovement",
  "supplierItemLink",
  "catalogItem",
  // Suppliers
  "supplierCredential",
  "supplier",
  // Customers & bikes
  "customerBike",
  "customer",
  // Calendar / unavailabilities / events
  "unavailability",
  // Settings
  "appSetting",
  // Any additional app data models can be appended here.
];

export async function wipeAllApplicationData() {
  const prisma = await getPrisma();
  if (!prisma) throw new Error("prisma_unavailable");

  // Attempt to disable FKs on SQLite; ignore errors on other providers
  try {
    await (prisma as any).$executeRawUnsafe?.("PRAGMA foreign_keys = OFF");
  } catch {}

  for (const model of TRY_MODELS_IN_ORDER) {
    try {
      const delegate = (prisma as any)[model];
      if (delegate && typeof delegate.deleteMany === "function") {
        await delegate.deleteMany({});
      }
    } catch {
      // Ignore: model may not exist, or FK order issue handled by cascades
    }
  }

  // Re-enable FKs on SQLite; ignore errors elsewhere
  try {
    await (prisma as any).$executeRawUnsafe?.("PRAGMA foreign_keys = ON");
  } catch {}
}
