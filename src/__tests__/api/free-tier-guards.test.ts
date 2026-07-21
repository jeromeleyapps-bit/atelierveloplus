/**
 * Tests des gardes du tier GRATUIT (freemium)
 * src/lib/free-tier-guards.ts
 */

import {
  isFreeTier,
  checkCanCreateCustomer,
  checkCanCreateWorkOrder,
  getFreeTierUsage,
} from '@/lib/free-tier-guards';
import { prisma } from '@/lib/prisma';
import { getLicenseInfo, FREE_LIMITS } from '@/lib/license-manager';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    customer: { count: jest.fn() },
    workOrder: { count: jest.fn() },
  },
}));

jest.mock('@/lib/license-manager', () => ({
  ...jest.requireActual('@/lib/license-manager'),
  getLicenseInfo: jest.fn(),
}));

const mockGetLicenseInfo = getLicenseInfo as jest.Mock;
const mockCustomerCount = prisma.customer.count as jest.Mock;
const mockWorkOrderCount = prisma.workOrder.count as jest.Mock;

const asTier = (tier: string) => mockGetLicenseInfo.mockResolvedValue({ tier });

describe('free-tier-guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isFreeTier', () => {
    it('retourne true pour le tier free', async () => {
      asTier('free');
      expect(await isFreeTier()).toBe(true);
    });

    it.each(['trial', 'basique', 'pro', 'pro_lifetime'])(
      'retourne false pour le tier %s',
      async (tier) => {
        asTier(tier);
        expect(await isFreeTier()).toBe(false);
      }
    );

    it('fail-open : retourne false si la licence est illisible', async () => {
      mockGetLicenseInfo.mockRejectedValue(new Error('db down'));
      expect(await isFreeTier()).toBe(false);
    });
  });

  describe('checkCanCreateCustomer', () => {
    it('autorise sans compter pour un tier payant', async () => {
      asTier('pro');
      const res = await checkCanCreateCustomer();
      expect(res.allowed).toBe(true);
      expect(mockCustomerCount).not.toHaveBeenCalled();
    });

    it('autorise sous la limite en tier free', async () => {
      asTier('free');
      mockCustomerCount.mockResolvedValue(FREE_LIMITS.maxCustomers - 1);
      const res = await checkCanCreateCustomer();
      expect(res.allowed).toBe(true);
      expect(res.current).toBe(FREE_LIMITS.maxCustomers - 1);
      expect(res.limit).toBe(FREE_LIMITS.maxCustomers);
    });

    it('bloque à la limite en tier free', async () => {
      asTier('free');
      mockCustomerCount.mockResolvedValue(FREE_LIMITS.maxCustomers);
      const res = await checkCanCreateCustomer();
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('free_limit_customers');
      expect(res.message).toContain(String(FREE_LIMITS.maxCustomers));
    });
  });

  describe('checkCanCreateWorkOrder', () => {
    it('autorise sans compter pour un tier payant', async () => {
      asTier('basique');
      const res = await checkCanCreateWorkOrder();
      expect(res.allowed).toBe(true);
      expect(mockWorkOrderCount).not.toHaveBeenCalled();
    });

    it('autorise sous la limite mensuelle en tier free', async () => {
      asTier('free');
      mockWorkOrderCount.mockResolvedValue(FREE_LIMITS.maxTicketsPerMonth - 1);
      const res = await checkCanCreateWorkOrder();
      expect(res.allowed).toBe(true);
    });

    it('bloque à la limite mensuelle en tier free', async () => {
      asTier('free');
      mockWorkOrderCount.mockResolvedValue(FREE_LIMITS.maxTicketsPerMonth);
      const res = await checkCanCreateWorkOrder();
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('free_limit_tickets');
    });

    it('compte uniquement les tickets du mois calendaire courant', async () => {
      asTier('free');
      mockWorkOrderCount.mockResolvedValue(0);
      await checkCanCreateWorkOrder();
      const arg = mockWorkOrderCount.mock.calls[0][0];
      const gte: Date = arg.where.createdAt.gte;
      const now = new Date();
      expect(gte.getFullYear()).toBe(now.getFullYear());
      expect(gte.getMonth()).toBe(now.getMonth());
      expect(gte.getDate()).toBe(1);
    });
  });

  describe('getFreeTierUsage', () => {
    it('retourne isFree=false pour un tier payant', async () => {
      asTier('pro_lifetime');
      expect(await getFreeTierUsage()).toEqual({ isFree: false });
    });

    it('retourne les jauges pour le tier free', async () => {
      asTier('free');
      mockCustomerCount.mockResolvedValue(12);
      mockWorkOrderCount.mockResolvedValue(4);
      const usage = await getFreeTierUsage();
      expect(usage).toEqual({
        isFree: true,
        customers: { current: 12, limit: FREE_LIMITS.maxCustomers },
        ticketsThisMonth: { current: 4, limit: FREE_LIMITS.maxTicketsPerMonth },
      });
    });
  });
});
