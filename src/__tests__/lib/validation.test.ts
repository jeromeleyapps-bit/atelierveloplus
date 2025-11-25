import {
  CreateWorkOrderSchema,
  UpdateWorkOrderSchema,
  formatZodError,
} from '@/lib/validation';
import { z } from 'zod';

describe('Validation Schemas', () => {
  describe('CreateWorkOrderSchema', () => {
    it('should validate valid work order data', () => {
      const validData = {
        customerId: 'clx1234567890abcdefghij',
        bikeId: 'clx0987654321klmnopqrst',
        status: 'created',
        type: 'repair',
        dueAt: new Date().toISOString(),
      };

      const result = CreateWorkOrderSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          customerId: validData.customerId,
          status: 'created',
        });
      }
    });

    it('should accept optional fields', () => {
      const minimalData = {};
      const result = CreateWorkOrderSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const invalidData = {
        status: 'invalid_status',
      };

      const result = CreateWorkOrderSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid type', () => {
      const invalidData = {
        type: 'invalid_type',
      };

      const result = CreateWorkOrderSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept null values for optional fields', () => {
      const dataWithNulls = {
        customerId: null,
        bikeId: null,
        type: null,
        dueAt: null,
      };

      const result = CreateWorkOrderSchema.safeParse(dataWithNulls);
      expect(result.success).toBe(true);
    });
  });

  describe('UpdateWorkOrderSchema', () => {
    it('should validate valid update data', () => {
      const validData = {
        status: 'ready',
        type: 'maintenance',
        customerId: 'clx1234567890abcdefghij',
      };

      const result = UpdateWorkOrderSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept partial updates', () => {
      const partialData = {
        status: 'ready',
      };

      const result = UpdateWorkOrderSchema.safeParse(partialData);
      expect(result.success).toBe(true);
    });
  });

  describe('formatZodError', () => {
    it('should format Zod error correctly', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      const result = schema.safeParse({ name: '', email: 'invalid' });
      
      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted).toBeDefined();
        expect(typeof formatted).toBe('string'); // formatZodError returns a string
        expect(formatted.length).toBeGreaterThan(0);
      }
    });

    it('should handle empty errors', () => {
      const error = {
        name: 'ZodError',
        errors: [],
      } as z.ZodError;

      const formatted = formatZodError(error);
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
      expect(formatted).toBe(''); // Empty string for no errors
    });
  });
});

