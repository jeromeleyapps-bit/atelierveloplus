/**
 * Tests for GET/POST /api/admin/backup
 * Tests backup creation and restoration
 */

import { GET, POST } from '@/app/api/admin/backup/route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findMany: jest.fn(), upsert: jest.fn() },
    customer: { findMany: jest.fn(), upsert: jest.fn() },
    customerBike: { findMany: jest.fn(), upsert: jest.fn() },
    bike: { findMany: jest.fn(), upsert: jest.fn() },
    workOrder: { findMany: jest.fn(), upsert: jest.fn() },
    workOrderLine: { findMany: jest.fn(), upsert: jest.fn() },
    invoice: { findMany: jest.fn(), upsert: jest.fn() },
    invoiceLine: { findMany: jest.fn(), upsert: jest.fn() },
    invoicePayment: { findMany: jest.fn(), upsert: jest.fn() },
    invoiceSequence: { findMany: jest.fn(), upsert: jest.fn() },
    catalogItem: { findMany: jest.fn(), upsert: jest.fn() },
    stockMovement: { findMany: jest.fn(), upsert: jest.fn() },
    supplier: { findMany: jest.fn(), upsert: jest.fn() },
    supplierItem: { findMany: jest.fn(), upsert: jest.fn() },
    supplierOffer: { findMany: jest.fn(), upsert: jest.fn() },
    supplierProduct: { findMany: jest.fn(), upsert: jest.fn() },
    supplierCredential: { findMany: jest.fn(), upsert: jest.fn() },
    booking: { findMany: jest.fn(), upsert: jest.fn() },
    communication: { findMany: jest.fn(), upsert: jest.fn() },
    cashRegister: { findMany: jest.fn(), upsert: jest.fn() },
    serviceRate: { findMany: jest.fn(), upsert: jest.fn() },
    pricingMargin: { findMany: jest.fn(), upsert: jest.fn() },
    appSetting: { findMany: jest.fn(), upsert: jest.fn() },
    systemSettings: { findMany: jest.fn(), upsert: jest.fn() },
    emailTemplate: { findMany: jest.fn(), upsert: jest.fn() },
    sMSTemplate: { findMany: jest.fn(), upsert: jest.fn() },
    calendarEvent: { findMany: jest.fn(), upsert: jest.fn() },
    calendarBlock: { findMany: jest.fn(), upsert: jest.fn() },
    calendarConfig: { findMany: jest.fn(), upsert: jest.fn() },
    globalSetting: { findMany: jest.fn(), upsert: jest.fn() },
    license: { findMany: jest.fn(), upsert: jest.fn() },
    licenseVerification: { findMany: jest.fn(), upsert: jest.fn() },
  },
}));

describe('GET /api/admin/backup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'admin', active: true, createdAt: new Date() }
    ]);
    (prisma.customer.findMany as jest.Mock).mockResolvedValue([
      { id: 'customer-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' }
    ]);
    (prisma.customerBike.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.bike.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.workOrder.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.workOrderLine.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.invoiceLine.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.invoicePayment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.invoiceSequence.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.catalogItem.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.stockMovement.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.supplier.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.supplierItem.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.supplierOffer.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.supplierProduct.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.supplierCredential.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.communication.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.cashRegister.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.serviceRate.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.pricingMargin.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.appSetting.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.systemSettings.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.emailTemplate.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.sMSTemplate.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.calendarBlock.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.calendarConfig.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.globalSetting.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.license.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.licenseVerification.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('should create a complete backup', async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('exportDate');
    expect(data).toHaveProperty('version', '2.0');
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('metadata');
  });

  it('should include all data tables in backup', async () => {
    const res = await GET();
    const data = await res.json();

    expect(data.data).toHaveProperty('users');
    expect(data.data).toHaveProperty('customers');
    expect(data.data).toHaveProperty('workOrders');
    expect(data.data).toHaveProperty('invoices');
    expect(data.data).toHaveProperty('catalogItems');
    expect(data.data).toHaveProperty('suppliers');
    expect(data.data).toHaveProperty('bookings');
    expect(data.data).toHaveProperty('communications');
  });

  it('should include metadata with counts', async () => {
    const res = await GET();
    const data = await res.json();

    expect(data.metadata).toHaveProperty('totalUsers', 1);
    expect(data.metadata).toHaveProperty('totalCustomers', 1);
    expect(data.metadata).toHaveProperty('totalWorkOrders', 0);
    expect(data.metadata).toHaveProperty('totalInvoices', 0);
  });

  it('should set correct headers for file download', async () => {
    const res = await GET();

    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(res.headers.get('Content-Disposition')).toContain('atelier-velo-backup-');
  });

  it('should handle database errors gracefully', async () => {
    (prisma.user.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toHaveProperty('error', 'Failed to create backup');
  });

  it('should fetch all tables in parallel', async () => {
    await GET();

    // Verify all findMany were called
    expect(prisma.user.findMany).toHaveBeenCalled();
    expect(prisma.customer.findMany).toHaveBeenCalled();
    expect(prisma.workOrder.findMany).toHaveBeenCalled();
    expect(prisma.invoice.findMany).toHaveBeenCalled();
  });
});

describe('POST /api/admin/backup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup upsert mocks
    (prisma.user.upsert as jest.Mock).mockResolvedValue({});
    (prisma.customer.upsert as jest.Mock).mockResolvedValue({});
    (prisma.globalSetting.upsert as jest.Mock).mockResolvedValue({});
  });

  it('should require confirmation for restore', async () => {
    const req = new NextRequest('http://localhost/api/admin/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: { users: [], customers: [] },
        confirmRestore: false,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Confirmation requise');
  });

  it('should validate backup format', async () => {
    const req = new NextRequest('http://localhost/api/admin/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: { invalid: 'format' },
        confirmRestore: true,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Format de backup invalide');
  });

  it('should restore users from backup', async () => {
    const backupData = {
      users: [
        { id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'admin' },
        { id: 'user-2', email: 'user@test.com', name: 'User', role: 'user' },
      ],
      customers: [],
      globalSettings: [],
      calendarConfigs: [],
      serviceRates: [],
      pricingMargins: [],
      suppliers: [],
      catalogItems: [],
      customerBikes: [],
      bikes: [],
      workOrders: [],
      workOrderLines: [],
      invoices: [],
      invoiceLines: [],
      invoicePayments: [],
      invoiceSequences: [],
      stockMovements: [],
      supplierItems: [],
      supplierOffers: [],
      supplierProducts: [],
      supplierCredentials: [],
      bookings: [],
      communications: [],
      cashRegisters: [],
      appSettings: [],
      systemSettings: [],
      emailTemplates: [],
      smsTemplates: [],
      calendarEvents: [],
      calendarBlocks: [],
      licenses: [],
      licenseVerifications: [],
    };

    const req = new NextRequest('http://localhost/api/admin/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: backupData,
        confirmRestore: true,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('restored');
    expect(data.restored).toHaveProperty('users', 2);
    expect(prisma.user.upsert).toHaveBeenCalledTimes(2);
  });

  it('should restore customers from backup', async () => {
    const backupData = {
      users: [],
      customers: [
        { id: 'customer-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      ],
      globalSettings: [],
      calendarConfigs: [],
      serviceRates: [],
      pricingMargins: [],
      suppliers: [],
      catalogItems: [],
      customerBikes: [],
      bikes: [],
      workOrders: [],
      workOrderLines: [],
      invoices: [],
      invoiceLines: [],
      invoicePayments: [],
      invoiceSequences: [],
      stockMovements: [],
      supplierItems: [],
      supplierOffers: [],
      supplierProducts: [],
      supplierCredentials: [],
      bookings: [],
      communications: [],
      cashRegisters: [],
      appSettings: [],
      systemSettings: [],
      emailTemplates: [],
      smsTemplates: [],
      calendarEvents: [],
      calendarBlocks: [],
      licenses: [],
      licenseVerifications: [],
    };

    const req = new NextRequest('http://localhost/api/admin/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: backupData,
        confirmRestore: true,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.restored).toHaveProperty('customers', 1);
    expect(prisma.customer.upsert).toHaveBeenCalledTimes(1);
  });

  it('should handle restore errors gracefully', async () => {
    (prisma.user.upsert as jest.Mock).mockRejectedValue(new Error('Restore error'));

    const backupData = {
      users: [{ id: 'user-1', email: 'admin@test.com' }],
      customers: [],
      globalSettings: [],
      calendarConfigs: [],
      serviceRates: [],
      pricingMargins: [],
      suppliers: [],
      catalogItems: [],
      customerBikes: [],
      bikes: [],
      workOrders: [],
      workOrderLines: [],
      invoices: [],
      invoiceLines: [],
      invoicePayments: [],
      invoiceSequences: [],
      stockMovements: [],
      supplierItems: [],
      supplierOffers: [],
      supplierProducts: [],
      supplierCredentials: [],
      bookings: [],
      communications: [],
      cashRegisters: [],
      appSettings: [],
      systemSettings: [],
      emailTemplates: [],
      smsTemplates: [],
      calendarEvents: [],
      calendarBlocks: [],
      licenses: [],
      licenseVerifications: [],
    };

    const req = new NextRequest('http://localhost/api/admin/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: backupData,
        confirmRestore: true,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('errors');
    expect(data.errors.users).toBeDefined();
  });

  it('should return summary of restored items', async () => {
    const backupData = {
      users: [{ id: 'user-1' }],
      customers: [{ id: 'customer-1' }],
      globalSettings: [],
      calendarConfigs: [],
      serviceRates: [],
      pricingMargins: [],
      suppliers: [],
      catalogItems: [],
      customerBikes: [],
      bikes: [],
      workOrders: [],
      workOrderLines: [],
      invoices: [],
      invoiceLines: [],
      invoicePayments: [],
      invoiceSequences: [],
      stockMovements: [],
      supplierItems: [],
      supplierOffers: [],
      supplierProducts: [],
      supplierCredentials: [],
      bookings: [],
      communications: [],
      cashRegisters: [],
      appSettings: [],
      systemSettings: [],
      emailTemplates: [],
      smsTemplates: [],
      calendarEvents: [],
      calendarBlocks: [],
      licenses: [],
      licenseVerifications: [],
    };

    const req = new NextRequest('http://localhost/api/admin/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: backupData,
        confirmRestore: true,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('restored');
    expect(data).toHaveProperty('summary');
    expect(data.summary).toHaveProperty('totalRestored', 2);
  });
});

