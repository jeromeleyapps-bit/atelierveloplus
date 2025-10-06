import { getPrisma } from "@/lib/db";

/**
 * Generate next invoice number for the current year
 * Format: FAC-YYYY-NNNN (e.g., FAC-2025-0001)
 * 
 * This function is atomic and thread-safe using Prisma transactions
 */
export async function generateInvoiceNumber(type: 'invoice' | 'quote' | 'credit' = 'invoice'): Promise<string> {
  const prisma = await getPrisma();
  if (!prisma) throw new Error("Prisma unavailable");

  const currentYear = new Date().getFullYear();

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Get or create sequence for current year
    let sequence = await tx.invoiceSequence.findUnique({
      where: { year: currentYear },
    });

    if (!sequence) {
      sequence = await tx.invoiceSequence.create({
        data: {
          year: currentYear,
          lastNumber: 0,
        },
      });
    }

    // Increment and update
    const nextNumber = sequence.lastNumber + 1;
    await tx.invoiceSequence.update({
      where: { year: currentYear },
      data: { lastNumber: nextNumber },
    });

    return nextNumber;
  });

  // Format selon le type: DEV-2025-0001, FAC-2025-0001, AVO-2025-0001
  const paddedNumber = String(result).padStart(4, "0");
  const prefix = type === 'quote' ? 'DEV' : type === 'credit' ? 'AVO' : 'FAC';
  return `${prefix}-${currentYear}-${paddedNumber}`;
}

/**
 * Get the next invoice number without incrementing (preview)
 */
export async function previewNextInvoiceNumber(): Promise<string> {
  const prisma = await getPrisma();
  if (!prisma) throw new Error("Prisma unavailable");

  const currentYear = new Date().getFullYear();
  const sequence = await prisma.invoiceSequence.findUnique({
    where: { year: currentYear },
  });

  const nextNumber = (sequence?.lastNumber || 0) + 1;
  const paddedNumber = String(nextNumber).padStart(4, "0");
  return `FAC-${currentYear}-${paddedNumber}`;
}

/**
 * Generate credit note number for the current year
 * Format: AVOIR-YYYY-NNNN (e.g., AVOIR-2025-0001)
 */
export async function generateCreditNoteNumber(): Promise<string> {
  const prisma = await getPrisma();
  if (!prisma) throw new Error("Prisma unavailable");

  const currentYear = new Date().getFullYear();

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Get or create sequence for current year
    let sequence = await tx.invoiceSequence.findUnique({
      where: { year: currentYear },
    });

    if (!sequence) {
      sequence = await tx.invoiceSequence.create({
        data: {
          year: currentYear,
          lastNumber: 0,
        },
      });
    }

    // Increment and update
    const nextNumber = sequence.lastNumber + 1;
    await tx.invoiceSequence.update({
      where: { year: currentYear },
      data: { lastNumber: nextNumber },
    });

    return nextNumber;
  });

  // Format: AVOIR-2025-0001
  const paddedNumber = String(result).padStart(4, "0");
  return `AVOIR-${currentYear}-${paddedNumber}`;
}

/**
 * Reset sequence for a given year (admin only, use with caution)
 */
export async function resetInvoiceSequence(year: number): Promise<void> {
  const prisma = await getPrisma();
  if (!prisma) throw new Error("Prisma unavailable");

  await prisma.invoiceSequence.upsert({
    where: { year },
    update: { lastNumber: 0 },
    create: { year, lastNumber: 0 },
  });
}
