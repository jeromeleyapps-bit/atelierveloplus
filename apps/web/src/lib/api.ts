// Prefer same-origin API routes. If an external API is configured, it will override.
// Using "/api" ensures we target Next.js route handlers by default.
export const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

function getAuthHeader() {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("jwt_token");
    if (token) {
      return { "Authorization": `Bearer ${token}` };
    }
  }
  return {} as Record<string, string>;
}

// Always hit local Next.js API routes, ignoring external BASE_URL
export async function requestLocal<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `/api${path}`;
  const res = await fetch(url, { headers: { "Content-Type": "application/json", ...getAuthHeader() }, ...options });
  if (!res.ok) {
    // Token expired or invalid - redirect to login (but not if already on auth pages)
    const isAuthPage = window.location.pathname === "/auth/login" || window.location.pathname === "/auth/register";
    if (res.status === 401 && typeof window !== "undefined" && !isAuthPage) {
      window.localStorage.removeItem("jwt_token");
      window.localStorage.removeItem("user");
      window.location.href = "/auth/login";
    }
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      ...options,
    });
    if (!res.ok) {
      // Token expired or invalid - redirect to login (but not if already on auth pages)
      const isAuthPage = window.location.pathname === "/auth/login" || window.location.pathname === "/auth/register";
      if (res.status === 401 && typeof window !== "undefined" && !isAuthPage) {
        window.localStorage.removeItem("jwt_token");
        window.localStorage.removeItem("user");
        window.location.href = "/auth/login";
      }
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text}`);
    }
    return res.json();
  } catch (e) {
    // If external BASE_URL failed, fallback to local /api once
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
      const localUrl = `/api${path}`;
      const res2 = await fetch(localUrl, {
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        ...options,
      });
      if (!res2.ok) {
        // Token expired or invalid - redirect to login (but not if already on auth pages)
        const isAuthPage = window.location.pathname === "/auth/login" || window.location.pathname === "/auth/register";
        if (res2.status === 401 && typeof window !== "undefined" && !isAuthPage) {
          window.localStorage.removeItem("jwt_token");
          window.localStorage.removeItem("user");
          window.location.href = "/auth/login";
        }
        const text2 = await res2.text();
        throw new Error(`API ${res2.status}: ${text2}`);
      }
      return res2.json();
    }
    throw e;
  }
}

export type WorkOrder = {
  id: string;
  status: string;
  customerId: string;
  bikeId?: string | null;
  createdAt: string;
  dueAt?: string | null;
  appointmentDate?: string | null;
  calendarEventId?: string | null;
  customer?: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  bike?: {
    id: string;
    brand?: string | null;
    model?: string | null;
    serialNumber?: string | null;
  } | null;
  hubspotFallbackAt?: string | null;
  inProgressAt?: string | null;
  readyAt?: string | null;
  type?: string | null;
  estimatedMinutes?: number | null;
  hourlyRate?: number | null;
};

// Partial payments
export type InvoicePayment = {
  id: string;
  invoiceId: string;
  amount: number;
  method?: string | null;
  paidAt: string; // ISO date
  note?: string | null;
  createdAt: string;
};

export async function listInvoicePayments(invoiceId: string): Promise<InvoicePayment[]> {
  // Expected API route: GET /finance/invoices/:id/payments
  return request(`/finance/invoices/${invoiceId}/payments`);
}

export async function addInvoicePayment(invoiceId: string, input: { amount: number; method?: string; paidAt?: string; note?: string }): Promise<InvoicePayment> {
  // Expected API route: POST /finance/invoices/:id/payments
  return request(`/finance/invoices/${invoiceId}/payments`, { method: 'POST', body: JSON.stringify(input) });
}

export async function deleteInvoicePayment(invoiceId: string, paymentId: string): Promise<{ ok: true }>{
  return request(`/finance/invoices/${invoiceId}/payments/${paymentId}`, { method: 'DELETE' });
}

export async function updateInvoicePayment(invoiceId: string, paymentId: string, input: Partial<{ amount: number; method?: string | null; paidAt?: string; note?: string | null }>): Promise<InvoicePayment> {
  return request(`/finance/invoices/${invoiceId}/payments/${paymentId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function listWorkOrders(
  status?: "created" | "in_progress" | "ready" | "delivered",
): Promise<WorkOrder[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return requestLocal(`/workshop/workorders${q}`);
}

export async function searchWorkOrders(params: {
  status?: "created" | "in_progress" | "ready" | "delivered";
  q?: string;
}): Promise<WorkOrder[]> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.q && params.q.trim()) query.set("q", params.q.trim());
  const qs = query.toString();
  return requestLocal(`/workshop/workorders${qs ? `?${qs}` : ""}`);
}

export async function createWorkOrder(input: {
  customerId: string;
  bikeId?: string;
  scheduledAt?: string;
  dueAt?: string;
}): Promise<WorkOrder> {
  return request("/workshop/workorders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function markWorkOrderReady(id: string): Promise<WorkOrder> {
  return requestLocal(`/workshop/workorders/${id}/ready`, { method: "POST" });
}

export async function startWorkOrder(id: string): Promise<WorkOrder> {
  return requestLocal(`/workshop/workorders/${id}/start`, { method: "POST" });
}

export async function getWorkOrder(id: string): Promise<WorkOrder> {
  return requestLocal(`/workshop/workorders/${id}`);
}

export async function deleteWorkOrder(id: string): Promise<{ ok: true }> {
  return requestLocal(`/workshop/workorders/${id}`, { method: "DELETE" });
}

// Local enrichments for WorkOrder
export type WorkOrderType = "revision" | "repair" | "maintenance" | "upgrade";
export async function getWorkOrderType(id: string): Promise<{ id: string; type: WorkOrderType | null }> {
  return requestLocal(`/workorders/${id}/type`);
}
export async function setWorkOrderType(id: string, type: WorkOrderType | null): Promise<{ id: string; type: WorkOrderType | null }> {
  return requestLocal(`/workorders/${id}/type`, { method: 'PUT', body: JSON.stringify({ type }) });
}

export type WorkOrderPart = {
  id: string;
  workOrderId: string;
  catalogItemId?: string | null;
  description: string;
  qty: number;
  priceHT: number;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};
export async function listWorkOrderParts(workOrderId: string): Promise<WorkOrderPart[]> {
  return requestLocal(`/workorders/${workOrderId}/parts`);
}
export async function addWorkOrderPart(workOrderId: string, input: { catalogItemId?: string; description: string; qty?: number; priceHT?: number; note?: string }): Promise<WorkOrderPart> {
  return requestLocal(`/workorders/${workOrderId}/parts`, { method: 'POST', body: JSON.stringify(input) });
}
export async function updateWorkOrderPart(workOrderId: string, partId: string, input: Partial<{ catalogItemId?: string | null; description: string; qty: number; priceHT: number; note: string | null }>): Promise<WorkOrderPart> {
  return requestLocal(`/workorders/${workOrderId}/parts/${partId}`, { method: 'PUT', body: JSON.stringify(input) });
}
export async function deleteWorkOrderPart(workOrderId: string, partId: string): Promise<{ ok: true }> {
  return requestLocal(`/workorders/${workOrderId}/parts/${partId}`, { method: 'DELETE' });
}

export async function setWorkOrderStatus(
  id: string,
  status: "created" | "in_progress" | "ready" | "delivered",
): Promise<WorkOrder> {
  return request(`/workshop/workorders/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export type QuoteLine = {
  type?: string;
  description: string;
  qty: number;
  priceHT: number;
  totalHT: number;
};
export type QuoteResult = {
  workOrderId: string;
  customerId?: string;
  customerName?: string;
  partsHT?: number;
  laborHT?: number;
  totalHT: number;
  tvaRate: number;
  totalTVA: number;
  totalTTC: number;
  currency: string;
  lines: QuoteLine[];
};

export async function quoteFromWorkOrder(id: string): Promise<QuoteResult> {
  return request(`/pos/workorders/${id}/quote`);
}

export async function createSaleFromWorkOrder(
  id: string,
): Promise<{ saleId: string; totals: QuoteResult }> {
  return request(`/pos/workorders/${id}/sale`, { method: "POST" });
}

// Unavailabilities
export type Unavailability = {
  id: string;
  title: string;
  start: string;
  end: string;
  type: "meeting" | "vacation" | "training" | "other";
};

export async function listUpcomingUnavailabilities(): Promise<
  Unavailability[]
> {
  return request("/unavailabilities/upcoming");
}

export async function createUnavailability(input: {
  title: string;
  start: string | Date;
  end: string | Date;
  type?: "meeting" | "vacation" | "training" | "other";
}) {
  return request("/unavailabilities", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateUnavailability(
  id: string,
  input: Partial<{
    title: string;
    start: string | Date;
    end: string | Date;
    type: "meeting" | "vacation" | "training" | "other";
  }>,
) {
  return request(`/unavailabilities/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteUnavailability(id: string) {
  return request(`/unavailabilities/${id}`, { method: "DELETE" });
}

// Customers
export type Customer = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  address1?: string | null;
  address2?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
  bikeBrand?: string | null;
  bikeModel?: string | null;
  nationalFileId?: string | null;
  shipAddress1?: string | null;
  shipAddress2?: string | null;
  shipZip?: string | null;
  shipCity?: string | null;
  shipCountry?: string | null;
  notes?: string | null;
  bikesCount?: number; // Enrichi par l'API
  createdAt: string;
  updatedAt?: string;
};

export async function listCustomers(): Promise<Customer[]> {
  return request("/customers");
}

export async function getCustomer(id: string): Promise<Customer> {
  return request(`/customers/${id}`);
}

export async function createCustomer(input: {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  zip?: string;
  city?: string;
  country?: string;
  bikeBrand?: string;
  bikeModel?: string;
  nationalFileId?: string;
  shipAddress1?: string;
  shipAddress2?: string;
  shipZip?: string;
  shipCity?: string;
  shipCountry?: string;
  notes?: string;
}): Promise<Customer> {
  return request("/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCustomer(id: string, input: Partial<{
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address1: string;
  address2: string;
  zip: string;
  city: string;
  country: string;
  bikeBrand: string;
  bikeModel: string;
  nationalFileId: string;
  shipAddress1: string;
  shipAddress2: string;
  shipZip: string;
  shipCity: string;
  shipCountry: string;
  notes: string;
}>): Promise<Customer> {
  return request(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function deleteCustomer(id: string): Promise<{ success: boolean }> {
  return request(`/customers/${id}`, { method: 'DELETE' });
}

// Customer Bikes
export type CustomerBike = {
  id: string;
  customerId: string;
  index: number; // 1..3
  brand?: string | null;
  model?: string | null;
  nationalFileId?: string | null;
  serialNumber?: string | null;
  color?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function listCustomerBikes(customerId: string): Promise<CustomerBike[]> {
  return request(`/customers/${customerId}/bikes`);
}

// New bikeId-based CRUD (preferred)
export async function createCustomerBike(
  customerId: string,
  input: Partial<Omit<CustomerBike, 'id' | 'customerId' | 'index' | 'createdAt' | 'updatedAt'>>,
): Promise<CustomerBike> {
  return request(`/customers/${customerId}/bikes`, { method: 'POST', body: JSON.stringify(input) });
}

export async function getCustomerBike(customerId: string, bikeId: string): Promise<CustomerBike> {
  return request(`/customers/${customerId}/bikes/${bikeId}`);
}

export async function updateCustomerBike(
  customerId: string,
  bikeId: string,
  input: Partial<Omit<CustomerBike, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>>,
): Promise<CustomerBike> {
  return request(`/customers/${customerId}/bikes/${bikeId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function deleteCustomerBikeById(customerId: string, bikeId: string): Promise<{ ok: true }> {
  return request(`/customers/${customerId}/bikes/${bikeId}`, { method: 'DELETE' });
}

export async function saveCustomerBike(customerId: string, index: 1|2|3|4|5, input: Partial<Omit<CustomerBike, 'id' | 'customerId' | 'index' | 'createdAt' | 'updatedAt'>>): Promise<CustomerBike> {
  return request(`/customers/${customerId}/bikes/${index}`, { method: 'PUT', body: JSON.stringify(input) });
}

export async function deleteCustomerBike(customerId: string, index: 1|2|3|4|5): Promise<{ ok: true }> {
  return request(`/customers/${customerId}/bikes/${index}`, { method: 'DELETE' });
}

// Auth
export async function authRegister(input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  shopName?: string;
  isAutoEntrepreneur?: boolean;
}) {
  return request<{
    token: string;
    user: {
      id: string;
      email: string;
      role: string;
      shopName?: string | null;
    };
    isAutoEntrepreneur: boolean;
  } | {
    // Fallback for old format
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    shopName?: string | null;
    isAutoEntrepreneur: boolean;
  }>(`/auth/register`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function authLogin(input: { email: string; password: string }) {
  return request<{
    token: string;
    user: {
      id: string;
      email: string;
      role: string;
    };
  }>(`/auth/login`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// =========================
// Finance (France defaults)
// =========================

export type PricingMode = "AE_TTC" | "HT_TVA"; // AE = auto-entrepreneur (TTC), otherwise HT + TVA

export type Invoice = {
  id: string;
  workOrderId: string;
  number?: string | null;
  issueDate?: string | null;
  status: "draft" | "issued" | "part_paid" | "paid" | "cancelled" | "converted";
  type?: "invoice" | "quote" | "credit"; // Type de document
  parentId?: string | null; // Pour les avoirs ou conversion devis→facture
  pricingMode: PricingMode;
  currency: string; // e.g., EUR
  vatRate: number; // default 20 for FR, can be overridden per line
  laborRate: number; // €/hour (TTC if AE_TTC, HT if HT_TVA)
  subtotalHT: number;
  vatAmount: number;
  totalTTC: number;
  discountAmount?: number;
  paidAt?: string | null;
  paymentMethod?: string | null;
  dueDate?: string | null;
  reminderCount?: number;
  lastReminderAt?: string | null;
  validUntil?: string | null; // Pour les devis: date d'expiration
  convertedAt?: string | null; // Pour les devis: date de conversion en facture
  convertedToId?: string | null; // Pour les devis: ID de la facture créée
  workOrderType?: string | null; // Type de prise en charge (revision, repair, etc.)
  customerName?: string | null; // Nom du client (enrichi par l'API)
  customerId?: string | null; // ID du client (enrichi par l'API)
  createdAt: string;
  updatedAt: string;
};

export type InvoiceLine = {
  id: string;
  invoiceId: string;
  type: "part" | "labor" | "custom";
  description: string;
  qty: number; // hours for labor
  unitPriceHT?: number | null; // used when pricingMode = HT_TVA
  unitPriceTTC?: number | null; // used when pricingMode = AE_TTC
  vatRate?: number | null; // override invoice vatRate if provided
  totalHT: number;
  totalTTC: number;
  // optional for parts
  partId?: string | null;
  purchasePriceHT?: number | null; // for margin computation
};

export type LaborEntry = {
  id: string;
  workOrderId: string;
  minutes: number;
  note?: string | null;
  createdAt: string;
  createdBy?: string | null;
};

// Invoices
export async function listInvoices(params?: {
  status?: "draft" | "issued" | "paid" | "cancelled";
  from?: string; // ISO date
  to?: string; // ISO date
  q?: string; // search by customer/ticket
}): Promise<Invoice[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.q) query.set("q", params.q);
  const qs = query.toString();
  return request(`/finance/invoices${qs ? `?${qs}` : ""}`);
}

export async function getInvoice(id: string): Promise<Invoice & { lines: InvoiceLine[] }> {
  return request(`/finance/invoices/${id}`);
}

export async function createInvoice(input: {
  workOrderId: string;
  pricingMode: PricingMode;
  currency?: string; // default EUR
  vatRate?: number; // default 20
  laborRate?: number; // €/h
}): Promise<Invoice> {
  return request(`/finance/invoices`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateInvoice(id: string, input: Partial<{
  pricingMode: PricingMode;
  currency: string;
  vatRate: number;
  laborRate: number;
  discountAmount: number;
  issueDate: string | null;
  status: "draft" | "issued" | "paid" | "cancelled";
  dueDate: string | null;
}>): Promise<Invoice> {
  return request(`/finance/invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function issueInvoice(id: string): Promise<Invoice> {
  return request(`/finance/invoices/${id}/issue`, { method: "POST" });
}

export async function sendInvoiceEmail(id: string): Promise<{ success: boolean; message: string; sentTo: string }> {
  return request(`/finance/invoices/${id}/send-email`, { method: "POST" });
}

export async function createCreditNote(invoiceId: string): Promise<Invoice> {
  return request(`/finance/invoices/${invoiceId}/credit`, { method: "POST" });
}

export async function payInvoice(id: string, input?: { paidAt?: string; method?: string }): Promise<Invoice> {
  return request(`/finance/invoices/${id}/pay`, { method: "POST", body: JSON.stringify(input || {}) });
}

// Invoice Lines
export async function addInvoiceLine(invoiceId: string, input: Omit<InvoiceLine, "id" | "invoiceId" | "totalHT" | "totalTTC">): Promise<InvoiceLine> {
  return request(`/finance/invoices/${invoiceId}/lines`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateInvoiceLine(invoiceId: string, lineId: string, input: Partial<Omit<InvoiceLine, "id" | "invoiceId">>): Promise<InvoiceLine> {
  return request(`/finance/invoices/${invoiceId}/lines/${lineId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteInvoiceLine(invoiceId: string, lineId: string): Promise<{ ok: true }> {
  return request(`/finance/invoices/${invoiceId}/lines/${lineId}`, { method: "DELETE" });
}

// Labor Entries
export async function listLaborEntries(workOrderId: string): Promise<LaborEntry[]> {
  return request(`/workshop/workorders/${workOrderId}/labor`);
}

export async function addLaborEntry(workOrderId: string, input: { minutes: number; note?: string }): Promise<LaborEntry> {
  return request(`/workshop/workorders/${workOrderId}/labor`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function importLaborToInvoice(invoiceId: string, workOrderId: string): Promise<{ lines: InvoiceLine[] }> {
  return request(`/finance/invoices/${invoiceId}/import-labor`, {
    method: "POST",
    body: JSON.stringify({ workOrderId }),
  });
}

// Quotes (Devis)
export async function createQuote(input: {
  workOrderId: string;
  validDays?: number; // Default 30 days
}): Promise<Invoice> {
  return request(`/finance/quotes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listQuotes(params?: {
  status?: string;
  workOrderId?: string;
}): Promise<Invoice[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.append("status", params.status);
  if (params?.workOrderId) qs.append("workOrderId", params.workOrderId);
  return request(`/finance/quotes${qs.toString() ? `?${qs}` : ""}`);
}

export async function convertQuoteToInvoice(quoteId: string): Promise<{
  success: boolean;
  invoice: Invoice & { lines: InvoiceLine[] };
  message: string;
}> {
  return request(`/finance/invoices/${quoteId}/convert-to-invoice`, {
    method: "POST",
  });
}

// Account Settings
export type AccountSettings = {
  shopName?: string | null;
  shopEmail?: string | null;
  shopPhone?: string | null;
  address1?: string | null;
  address2?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
  pdfPrimary?: string | null;
  legalFooter?: string | null;
  // Informations légales
  siret?: string | null;
  tva?: string | null;
  rcs?: string | null;
  capital?: string | null;
  insurance?: string | null;
  // Statut fiscal
  isAutoEntrepreneur?: boolean;
};

export async function getAccountSettings(): Promise<AccountSettings> {
  return request(`/account/settings`);
}

export async function updateAccountSettings(input: Partial<AccountSettings>): Promise<AccountSettings> {
  return request(`/account/settings`, { method: 'PATCH', body: JSON.stringify(input) });
}

// Catalog & Stock
export type CatalogItem = {
  id: string;
  sku?: string | null;
  category: string;
  name: string;
  priceHT: number; // Prix de vente HT
  priceTTC: number; // Prix de vente TTC (utilisé dans tickets/devis/factures)
  vatRate: number; // TVA de vente (0 si AE, 20 sinon)
  active: boolean;
  stockQty: number;
  minStock: number;
  reorderQty: number;
  location?: string | null;
  purchasePriceHT?: number | null; // Prix d'achat HT
  purchasePriceTTC?: number | null; // Prix d'achat TTC
  supplierVatEnabled?: boolean; // Si true, TTC achat = HT achat + 20%
  marginCoeff?: number | null; // Coefficient multiplicateur pour calculer prix vente
  createdAt: string;
  updatedAt: string;
};

export type StockMovement = {
  id: string;
  itemId: string;
  type: 'IN' | 'OUT' | 'ADJUST';
  qty: number;
  refType?: string | null;
  refId?: string | null;
  note?: string | null;
  createdAt: string;
};

export type SupplierOffer = {
  supplierId: string;
  supplierName: string;
  supplierSku: string;
  ean?: string | null;
  lastPriceHT?: number | null;
  lastAvailability?: string | null;
  lastCheckedAt?: string | null;
};

export async function listCatalogItems(params?: { q?: string; category?: string; limit?: number; offset?: number }): Promise<{ items: CatalogItem[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.category) query.set('category', params.category);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  const qs = query.toString();
  return request(`/catalog/items${qs ? `?${qs}` : ''}`);
}

export async function createCatalogItem(input: Partial<CatalogItem> & { category: string; name: string; priceHT: number; priceTTC: number; vatRate: number }): Promise<CatalogItem> {
  return request(`/catalog/items`, { method: 'POST', body: JSON.stringify(input) });
}

export async function getCatalogItem(id: string): Promise<CatalogItem> {
  return request(`/catalog/items/${id}`);
}

export async function updateCatalogItem(id: string, input: Partial<CatalogItem>): Promise<CatalogItem> {
  return request(`/catalog/items/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export async function deleteCatalogItem(id: string): Promise<{ ok: true }> {
  return request(`/catalog/items/${id}`, { method: 'DELETE' });
}

export async function listStockMovements(itemId: string): Promise<StockMovement[]> {
  return request(`/catalog/items/${itemId}/stock-movements`);
}

export async function createStockMovement(itemId: string, input: { type: 'IN' | 'OUT' | 'ADJUST'; qty: number; refType?: string; refId?: string; note?: string }): Promise<StockMovement> {
  return request(`/catalog/items/${itemId}/stock-movements`, { method: 'POST', body: JSON.stringify(input) });
}

export async function getItemOffers(itemId: string): Promise<{ itemId: string; offers: SupplierOffer[] }> {
  return request(`/catalog/items/${itemId}/offers`);
}

export type SupplierItemLink = {
  id: string;
  supplierId: string;
  catalogItemId?: string | null;
  supplierSku: string;
  ean?: string | null;
  lastPriceHT?: number | null;
  lastAvailability?: string | null;
  lastCheckedAt?: string | null;
};

export async function listItemSupplierItems(itemId: string): Promise<SupplierItemLink[]> {
  return request(`/catalog/items/${itemId}/supplier-items`);
}

export async function upsertItemSupplierItem(itemId: string, input: { supplierId: string; supplierSku: string; ean?: string }): Promise<SupplierItemLink> {
  return request(`/catalog/items/${itemId}/supplier-items`, { method: 'POST', body: JSON.stringify(input) });
}

export async function refreshItemOffers(itemId: string): Promise<{ itemId: string; offers: SupplierOffer[] }> {
  return request(`/catalog/items/${itemId}/offers/refresh`, { method: 'POST' });
}

export type LowStockItem = {
  id: string;
  name: string;
  stockQty: number;
  minStock?: number | null;
  category: string;
};

export async function getLowStock(): Promise<LowStockItem[]> {
  return requestLocal(`/catalog/low-stock`);
}

export async function mergeWorkOrders(workOrderIds: string[]): Promise<{ id: string; merged: number }> {
  return requestLocal(`/workshop/workorders/merge`, {
    method: 'POST',
    body: JSON.stringify({ workOrderIds })
  });
}

export async function saveWorkOrderEstimate(id: string, data: { estimatedMinutes?: number; hourlyRate?: number }): Promise<WorkOrder> {
  return request(`/workshop/workorders/${id}/estimate`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function searchSupplierOffers(params: { q: string; limit?: number }): Promise<{ offers: SupplierOffer[] }> {
  const query = new URLSearchParams();
  query.set('q', params.q);
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return request(`/suppliers/search${qs ? `?${qs}` : ''}`);
}

export async function deleteSupplier(id: string): Promise<{ ok: true }> {
  return request(`/suppliers/${id}`, { method: 'DELETE' });
}

// Settings
export async function getSetting<T = any>(key: string): Promise<{ key: string; value: T | null }> {
  return request(`/settings/${encodeURIComponent(key)}`);
}

export async function setSetting<T = any>(key: string, value: T | null): Promise<{ key: string; value: T | null }> {
  return request(`/settings/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify({ value }) });
}

// App Settings (informations atelier)
export type AppSettings = {
  shopName?: string | null;
  shopEmail?: string | null;
  shopPhone?: string | null;
  address1?: string | null;
  address2?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
  pdfPrimary?: string | null;
  legalFooter?: string | null;
  // Informations légales
  siret?: string | null;
  tva?: string | null;
  rcs?: string | null;
  capital?: string | null;
  insurance?: string | null;
  // Statut fiscal
  isAutoEntrepreneur?: boolean;
};

export async function getAppSettings(): Promise<AppSettings> {
  return request('/account/settings');
}

export async function updateAppSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  return request('/account/settings', { method: 'PATCH', body: JSON.stringify(settings) });
}

// Suppliers
export type Supplier = {
  id: string;
  name: string;
  website?: string | null;
  connectorType: string;
  active: boolean;
};

export type SupplierCredential = {
  id: string;
  supplierId: string;
  userId: string;
  username?: string | null;
  password?: string | null;
  extraJson?: string | null;
};

export async function listSuppliers(): Promise<Supplier[]> {
  return request(`/suppliers`);
}

export async function createSupplier(input: { name: string; website?: string; connectorType?: string; username?: string; password?: string; extraJson?: string }): Promise<Supplier> {
  return request(`/suppliers`, { method: 'POST', body: JSON.stringify(input) });
}

export async function getSupplierCredentials(supplierId: string): Promise<Partial<SupplierCredential>> {
  return request(`/suppliers/${supplierId}/credentials`);
}

export async function saveSupplierCredentials(supplierId: string, input: { username?: string; password?: string; extraJson?: string }): Promise<SupplierCredential> {
  return request(`/suppliers/${supplierId}/credentials`, { method: 'POST', body: JSON.stringify(input) });
}

// B2B Live Search
export type B2BSearchResult = {
  externalId: string;
  name: string;
  description?: string;
  reference?: string;
  brand?: string;
  price: number;
  priceHT?: number;
  currency: string;
  availability: string;
  stock?: number;
  deliveryDays?: number;
  url?: string;
  imageUrl?: string;
  supplierId: string;
  supplierName: string;
  metadata?: Record<string, any>;
};

export type B2BSearchResponse = {
  results: B2BSearchResult[];
  suppliers: Array<{
    id: string;
    name: string;
    count: number;
    error?: string;
  }>;
  total: number;
};

export async function searchB2B(query: string, options?: { limit?: number; inStockOnly?: boolean }): Promise<B2BSearchResponse> {
  return requestLocal(`/suppliers/search`, { 
    method: 'POST', 
    body: JSON.stringify({ query, ...options }) 
  });
}

// Communications
export type Communication = {
  id: string;
  customerId: string;
  workOrderId?: string;
  type: 'email' | 'sms';
  event: string;
  recipient: string;
  subject?: string;
  content: string;
  status: string;
  sentAt?: string;
  createdAt: string;
};

export async function sendCommunication(data: {
  type: 'email' | 'sms';
  event: string;
  customerId: string;
  workOrderId?: string;
  invoiceId?: string;
  data?: any;
}): Promise<{ success: boolean; communicationId?: string; messageId?: string; error?: string }> {
  return requestLocal(`/communications/send`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function listCommunications(filters?: {
  customerId?: string;
  type?: string;
  status?: string;
  limit?: number;
}): Promise<Communication[]> {
  const params = new URLSearchParams();
  if (filters?.customerId) params.append('customerId', filters.customerId);
  if (filters?.type) params.append('type', filters.type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  
  return request(`/communications?${params}`);
}

// ============================================
// ADMIN APIs
// ============================================

export async function adminGetStats(): Promise<any> {
  return requestLocal(`/admin/stats`);
}

export async function adminExportBackup(): Promise<Blob> {
  const url = `/api/admin/backup`;
  const res = await fetch(url, { 
    headers: { ...getAuthHeader() } 
  });
  if (!res.ok) {
    throw new Error(`Backup export failed: ${res.status}`);
  }
  return res.blob();
}

export async function adminImportBackup(data: { backup: any; wipeFirst: boolean }): Promise<{ success: boolean; message?: string }> {
  return requestLocal(`/admin/backup`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function adminCreateUser(data: { email: string; password: string; role?: string }): Promise<{ id: string; email: string }> {
  return requestLocal(`/admin/users`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function adminGetSystemSettings(): Promise<any> {
  return requestLocal(`/admin/system-settings`);
}

export async function adminUpdateSystemSettings(data: { setting: string; value: boolean }): Promise<any> {
  return requestLocal(`/admin/system-settings`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

// ============================================
// STATS APIs
// ============================================

export async function getStatsSummary(params?: { from?: string; to?: string }): Promise<any> {
  const query = new URLSearchParams();
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  const qs = query.toString();
  return requestLocal(`/stats/summary${qs ? `?${qs}` : ''}`);
}

export async function setWorkOrderAppointment(workOrderId: string, data: { appointmentDate: string; duration?: number }): Promise<any> {
  return requestLocal(`/workorders/${workOrderId}/appointment`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateWorkOrderAppointment(workOrderId: string, data: { appointmentDate: string; duration?: number }): Promise<any> {
  return requestLocal(`/workorders/${workOrderId}/appointment`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteWorkOrderAppointment(workOrderId: string): Promise<{ ok: true }> {
  return requestLocal(`/workorders/${workOrderId}/appointment`, {
    method: 'DELETE'
  });
}

// ============================================
// CALENDAR APIs
// ============================================

export async function listCalendarEvents(params: { start: string; end: string }): Promise<any[]> {
  return requestLocal(`/calendar/events?start=${encodeURIComponent(params.start)}&end=${encodeURIComponent(params.end)}`);
}

export async function listCalendarBlocks(params: { start: string; end: string }): Promise<any[]> {
  return requestLocal(`/calendar/blocks?start=${encodeURIComponent(params.start)}&end=${encodeURIComponent(params.end)}`);
}

export async function listCalendarBookings(params: { start: string; end: string }): Promise<any[]> {
  return requestLocal(`/calendar/bookings?start=${encodeURIComponent(params.start)}&end=${encodeURIComponent(params.end)}`);
}

export async function createCalendarEvent(data: { title: string; start: string; end: string; blocksAvail?: boolean }): Promise<any> {
  return requestLocal(`/calendar/events`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function createCalendarBlock(data: { reason: string; start: string; end: string }): Promise<any> {
  return requestLocal(`/calendar/blocks`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateBookingStatus(bookingId: string, status: string): Promise<any> {
  return requestLocal(`/calendar/bookings/${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

// ============================================
// FINANCE & WORKSHOP - Additional APIs
// ============================================

export async function deleteInvoice(invoiceId: string): Promise<{ ok: true }> {
  return requestLocal(`/finance/invoices/${invoiceId}`, {
    method: 'DELETE'
  });
}

export async function cancelInvoice(invoiceId: string, reason?: string): Promise<any> {
  return requestLocal(`/finance/invoices/${invoiceId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export async function listWorkOrdersByCustomer(customerId: string): Promise<WorkOrder[]> {
  return requestLocal(`/workshop/workorders?customerId=${customerId}`);
}

// ============================================
// CASH REGISTER APIs
// ============================================

export async function listCashRegisterEntries(): Promise<any[]> {
  return requestLocal(`/cash-register`);
}

export async function createCashRegisterEntry(data: { type: string; amount: number; note?: string; reference?: string }): Promise<any> {
  return requestLocal(`/cash-register`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateCashRegisterEntry(id: string, data: { type: string; amount: number; note?: string; reference?: string }): Promise<any> {
  return requestLocal(`/cash-register/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteCashRegisterEntry(id: string): Promise<{ ok: true }> {
  return requestLocal(`/cash-register/${id}`, {
    method: 'DELETE'
  });
}
