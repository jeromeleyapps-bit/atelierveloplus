import { z } from "zod";

// ==================
// WorkOrder schemas
// ==================

export const workOrderTypeSchema = z.enum(["revision", "repair", "maintenance", "upgrade"]);

export const createWorkOrderSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  bikeId: z.string().optional(),
  type: workOrderTypeSchema.optional(),
  dueAt: z.string().datetime().optional(),
});

export const updateWorkOrderStatusSchema = z.object({
  status: z.enum(["created", "in_progress", "ready", "delivered"]),
});

// ==================
// WorkOrderPart schemas
// ==================

export const createWorkOrderPartSchema = z.object({
  catalogItemId: z.string().optional(),
  description: z.string().min(1, "Description is required").max(200),
  qty: z.number().int().positive().default(1),
  priceHT: z.number().nonnegative().default(0),
  note: z.string().max(500).optional(),
});

export const updateWorkOrderPartSchema = z.object({
  catalogItemId: z.string().nullable().optional(),
  description: z.string().min(1).max(200).optional(),
  qty: z.number().int().positive().optional(),
  priceHT: z.number().nonnegative().optional(),
  note: z.string().max(500).nullable().optional(),
});

// ==================
// Customer schemas
// ==================

export const createCustomerSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  zip: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default("France"),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// ==================
// CatalogItem schemas
// ==================

export const createCatalogItemSchema = z.object({
  sku: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Name is required"),
  priceHT: z.number().nonnegative(),
  priceTTC: z.number().nonnegative(),
  vatRate: z.number().nonnegative().max(100),
  active: z.boolean().default(true),
  stockQty: z.number().int().nonnegative().default(0),
  minStock: z.number().int().nonnegative().default(0),
  reorderQty: z.number().int().nonnegative().default(0),
  location: z.string().optional(),
  purchasePriceHT: z.number().nonnegative().optional(),
});

export const updateCatalogItemSchema = createCatalogItemSchema.partial();

// ==================
// Invoice schemas
// ==================

export const createInvoiceSchema = z.object({
  workOrderId: z.string().min(1, "Work order ID is required"),
  pricingMode: z.enum(["AE_TTC", "HT_TVA"]).default("HT_TVA"),
  currency: z.string().default("EUR"),
  vatRate: z.number().nonnegative().max(100).default(20),
  laborRate: z.number().nonnegative().default(60),
});

export const updateInvoiceSchema = z.object({
  number: z.string().optional(),
  issueDate: z.string().datetime().optional(),
  status: z.enum(["draft", "issued", "paid", "cancelled"]).optional(),
  paidAt: z.string().datetime().nullable().optional(),
  paymentMethod: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  discountAmount: z.number().nonnegative().optional(),
});

export const createInvoiceLineSchema = z.object({
  type: z.enum(["part", "labor", "custom"]).default("part"),
  description: z.string().min(1, "Description is required"),
  qty: z.number().positive(),
  unitPriceHT: z.number().nonnegative().optional(),
  unitPriceTTC: z.number().nonnegative().optional(),
  vatRate: z.number().nonnegative().max(100).optional(),
  partId: z.string().optional(),
  purchasePriceHT: z.number().nonnegative().optional(),
});

export const updateInvoiceLineSchema = createInvoiceLineSchema.partial();

// ==================
// User schemas
// ==================

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["user", "admin", "technician", "accountant"]).default("user"),
  active: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["user", "admin", "technician", "accountant"]).optional(),
  active: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ==================
// Helper function to validate and parse
// ==================

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
