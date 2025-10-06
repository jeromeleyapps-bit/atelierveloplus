import { describe, it, expect } from 'vitest';
import {
  createWorkOrderSchema,
  createWorkOrderPartSchema,
  createCustomerSchema,
  createCatalogItemSchema,
  createInvoiceSchema,
  loginSchema,
  validateRequest,
} from '@/lib/validations';

describe('Validation Schemas', () => {
  describe('WorkOrder', () => {
    it('should validate a valid work order', () => {
      const data = {
        customerId: 'cust_123',
        bikeId: 'bike_456',
        type: 'repair' as const,
      };
      const result = validateRequest(createWorkOrderSchema, data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customerId).toBe('cust_123');
      }
    });

    it('should reject work order without customerId', () => {
      const data = { bikeId: 'bike_456' };
      const result = validateRequest(createWorkOrderSchema, data);
      expect(result.success).toBe(false);
    });
  });

  describe('WorkOrderPart', () => {
    it('should validate a valid part', () => {
      const data = {
        description: 'Pneu avant',
        qty: 1,
        priceHT: 25.5,
      };
      const result = validateRequest(createWorkOrderPartSchema, data);
      expect(result.success).toBe(true);
    });

    it('should reject part with negative price', () => {
      const data = {
        description: 'Pneu',
        qty: 1,
        priceHT: -10,
      };
      const result = validateRequest(createWorkOrderPartSchema, data);
      expect(result.success).toBe(false);
    });

    it('should reject part with empty description', () => {
      const data = {
        description: '',
        qty: 1,
        priceHT: 10,
      };
      const result = validateRequest(createWorkOrderPartSchema, data);
      expect(result.success).toBe(false);
    });
  });

  describe('Customer', () => {
    it('should validate a valid customer', () => {
      const data = {
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean@example.com',
      };
      const result = validateRequest(createCustomerSchema, data);
      expect(result.success).toBe(true);
    });

    it('should reject customer with invalid email', () => {
      const data = {
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'invalid-email',
      };
      const result = validateRequest(createCustomerSchema, data);
      expect(result.success).toBe(false);
    });
  });

  describe('CatalogItem', () => {
    it('should validate a valid catalog item', () => {
      const data = {
        category: 'Pneus',
        name: 'Pneu VTT 26"',
        priceHT: 25,
        priceTTC: 30,
        vatRate: 20,
      };
      const result = validateRequest(createCatalogItemSchema, data);
      expect(result.success).toBe(true);
    });

    it('should reject item with VAT rate > 100', () => {
      const data = {
        category: 'Pneus',
        name: 'Pneu',
        priceHT: 25,
        priceTTC: 30,
        vatRate: 150,
      };
      const result = validateRequest(createCatalogItemSchema, data);
      expect(result.success).toBe(false);
    });
  });

  describe('Invoice', () => {
    it('should validate a valid invoice', () => {
      const data = {
        workOrderId: 'wo_123',
        pricingMode: 'HT_TVA' as const,
      };
      const result = validateRequest(createInvoiceSchema, data);
      expect(result.success).toBe(true);
    });
  });

  describe('Login', () => {
    it('should validate valid credentials', () => {
      const data = {
        email: 'user@example.com',
        password: 'password123',
      };
      const result = validateRequest(loginSchema, data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const data = {
        email: 'not-an-email',
        password: 'password123',
      };
      const result = validateRequest(loginSchema, data);
      expect(result.success).toBe(false);
    });
  });
});
