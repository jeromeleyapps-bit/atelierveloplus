/**
 * Validation Schemas with Zod
 * Centralized validation for API inputs
 */

import { z } from 'zod';

// ============================================
// Common Validators
// ============================================

export const cuidSchema = z.string().cuid();
export const emailSchema = z.string().email();
export const phoneSchema = z.string().regex(/^\+?[0-9]{10,15}$/);
export const dateSchema = z.string().datetime();

// ============================================
// WorkOrder Schemas
// ============================================

export const CreateWorkOrderSchema = z.object({
  customerId: cuidSchema.optional().nullable(),
  bikeId: cuidSchema.optional().nullable(),
  status: z.enum(['created', 'ready']).optional(),
  type: z.enum(['revision', 'repair', 'maintenance', 'upgrade']).optional().nullable(),
  dueAt: dateSchema.optional().nullable(),
});

export const UpdateWorkOrderSchema = z.object({
  status: z.enum(['created', 'ready']).optional(),
  type: z.enum(['revision', 'repair', 'maintenance', 'upgrade']).optional().nullable(),
  customerId: cuidSchema.optional().nullable(),
  bikeId: cuidSchema.optional().nullable(),
  dueAt: dateSchema.optional().nullable(),
});

// ============================================
// Customer Schemas
// ============================================

export const CreateCustomerSchema = z.object({
  email: emailSchema.optional().nullable(),
  firstName: z.string().min(1).max(100).optional().nullable(),
  lastName: z.string().min(1).max(100).optional().nullable(),
  phone: phoneSchema.optional().nullable(),
  address2: z.string().max(255).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  bikeBrand: z.string().max(100).optional().nullable(),
  bikeModel: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial();

// ============================================
// Communication Schemas
// ============================================

export const SendCommunicationSchema = z.object({
  type: z.enum(['email', 'sms']),
  event: z.string().min(1).max(50),
  customerId: cuidSchema,
  workOrderId: cuidSchema.optional(),
  invoiceId: cuidSchema.optional(),
  // Zod 4 exige un type de clé explicite pour z.record.
  data: z.record(z.string(), z.any()).optional(),
});

// ============================================
// Supplier Schemas
// ============================================

export const CreateSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  website: z.string().url().optional().nullable(),
  connectorType: z.string().min(1).max(50),
  active: z.boolean().optional(),
});

export const SupplierCredentialSchema = z.object({
  username: z.string().min(1).max(200).optional().nullable(),
  password: z.string().min(1).max(500).optional().nullable(),
  extraJson: z.string().optional().nullable(),
});

export const B2BSearchSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(200).optional(),
  inStockOnly: z.boolean().optional(),
});

// ============================================
// Catalog Schemas
// ============================================

export const CreateCatalogItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  reference: z.string().max(100).optional().nullable(),
  brand: z.string().max(100).optional().nullable(),
  category: z.enum(['PIECES', 'EQUIPEMENTS', 'AUTRES']).optional(),
  priceHT: z.number().min(0),
  priceTTC: z.number().min(0).optional().nullable(),
  stock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});

export const UpdateCatalogItemSchema = CreateCatalogItemSchema.partial();

// ============================================
// Helper Functions
// ============================================

/**
 * Validate data against a schema
 * Returns validated data or throws error
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Validate data and return result with error
 * Safer alternative that doesn't throw
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Format Zod errors for API responses
 */
export function formatZodError(error: z.ZodError): string {
  // Zod 4 : la liste des problèmes s'appelle `issues` (anciennement `errors`).
  return error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
}
