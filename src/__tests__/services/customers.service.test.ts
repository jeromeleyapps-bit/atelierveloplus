/**
 * Tests pour CustomersService
 * 
 * Note: Ces tests mockent Prisma pour tester la logique métier
 */
import { CustomersService } from '@/services/customers.service';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    customerBike: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('CustomersService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return customers with bikesCount', async () => {
      const mockCustomers = [
        { id: '1', firstName: 'Jean', lastName: 'Dupont', email: 'jean@test.com', _count: { CustomerBike: 2 } },
        { id: '2', firstName: 'Marie', lastName: 'Martin', email: 'marie@test.com', _count: { CustomerBike: 0 } },
      ];

      (prisma.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers);

      const result = await CustomersService.list();

      expect(result).toHaveLength(2);
      expect(result[0].bikesCount).toBe(2);
      expect(result[1].bikesCount).toBe(0);
      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: { _count: { select: { CustomerBike: true } } },
      });
    });

    it('should filter by query', async () => {
      const mockCustomers = [
        { id: '1', firstName: 'Jean', lastName: 'Dupont', email: 'jean@test.com', phone: '0601020304', _count: { CustomerBike: 1 } },
        { id: '2', firstName: 'Marie', lastName: 'Martin', email: 'marie@test.com', phone: '0605060708', _count: { CustomerBike: 0 } },
      ];

      (prisma.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers);

      const result = await CustomersService.list({ query: 'jean' });

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('Jean');
    });

    it('should respect limit', async () => {
      const mockCustomers = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        firstName: `User${i}`,
        lastName: 'Test',
        email: `user${i}@test.com`,
        _count: { CustomerBike: 0 },
      }));

      (prisma.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers);

      const result = await CustomersService.list({ limit: 5 });

      expect(result).toHaveLength(5);
    });
  });

  describe('getById', () => {
    it('should return customer with details', async () => {
      const mockCustomer = {
        id: '1',
        firstName: 'Jean',
        lastName: 'Dupont',
        CustomerBike: [{ id: 'b1', brand: 'Trek' }],
        WorkOrder: [],
        _count: { CustomerBike: 1, WorkOrder: 0 },
      };

      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);

      const result = await CustomersService.getById('1');

      expect(result).not.toBeNull();
      expect(result?.bikesCount).toBe(1);
      expect(result?.workOrdersCount).toBe(0);
    });

    it('should return null for non-existent customer', async () => {
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await CustomersService.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create customer with valid data', async () => {
      const input = {
        email: 'new@test.com',
        firstName: 'Nouveau',
        lastName: 'Client',
      };

      const mockCreated = { id: 'new-id', ...input };
      (prisma.customer.create as jest.Mock).mockResolvedValue(mockCreated);

      const result = await CustomersService.create(input);

      expect(result.id).toBe('new-id');
      expect(prisma.customer.create).toHaveBeenCalled();
    });

    it('should throw error if no identifier provided', async () => {
      await expect(CustomersService.create({})).rejects.toThrow(
        'Au moins un identifiant requis'
      );
    });

    it('should create bike if bike info provided', async () => {
      const input = {
        firstName: 'Jean',
        bikeBrand: 'Trek',
        bikeModel: 'Domane',
      };

      const mockCreated = { id: 'new-id', ...input };
      (prisma.customer.create as jest.Mock).mockResolvedValue(mockCreated);
      (prisma.customerBike.upsert as jest.Mock).mockResolvedValue({});

      await CustomersService.create(input);

      expect(prisma.customerBike.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { customerId_index: { customerId: 'new-id', index: 1 } },
        })
      );
    });
  });

  describe('update', () => {
    it('should update existing customer', async () => {
      const existing = { id: '1', firstName: 'Jean', lastName: 'Dupont' };
      const updated = { ...existing, firstName: 'Jean-Pierre' };

      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(existing);
      (prisma.customer.update as jest.Mock).mockResolvedValue(updated);

      const result = await CustomersService.update('1', { firstName: 'Jean-Pierre' });

      expect(result.firstName).toBe('Jean-Pierre');
    });

    it('should throw error for non-existent customer', async () => {
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(CustomersService.update('non-existent', { firstName: 'Test' })).rejects.toThrow(
        'Client non trouvé'
      );
    });
  });

  describe('delete', () => {
    it('should delete customer without work orders', async () => {
      const existing = { id: '1', _count: { WorkOrder: 0 } };

      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(existing);
      (prisma.customerBike.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.customer.delete as jest.Mock).mockResolvedValue(existing);

      const result = await CustomersService.delete('1');

      expect(result.success).toBe(true);
      expect(prisma.customerBike.deleteMany).toHaveBeenCalled();
      expect(prisma.customer.delete).toHaveBeenCalled();
    });

    it('should prevent deletion if work orders exist', async () => {
      const existing = { id: '1', _count: { WorkOrder: 3 } };

      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(existing);

      await expect(CustomersService.delete('1')).rejects.toThrow(
        'Impossible de supprimer: 3 ticket(s) associé(s)'
      );
    });

    it('should throw error for non-existent customer', async () => {
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(CustomersService.delete('non-existent')).rejects.toThrow(
        'Client non trouvé'
      );
    });
  });

  describe('getStats', () => {
    it('should return customer statistics', async () => {
      (prisma.customer.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80)  // withEmail
        .mockResolvedValueOnce(60)  // withPhone
        .mockResolvedValueOnce(40); // recentlyActive

      const result = await CustomersService.getStats();

      expect(result.total).toBe(100);
      expect(result.withEmail).toBe(80);
      expect(result.withPhone).toBe(60);
      expect(result.recentlyActive).toBe(40);
      expect(result.emailRate).toBe(80);
      expect(result.phoneRate).toBe(60);
    });

    it('should handle zero customers', async () => {
      (prisma.customer.count as jest.Mock).mockResolvedValue(0);

      const result = await CustomersService.getStats();

      expect(result.total).toBe(0);
      expect(result.emailRate).toBe(0);
      expect(result.phoneRate).toBe(0);
    });
  });
});
