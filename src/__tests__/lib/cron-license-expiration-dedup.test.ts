/**
 * Vérifie que le cron des notifications licence ne renvoie pas plusieurs fois
 * le même seuil (7/3/1 jours) sur la fenêtre ±1j.
 */
import { sendExpirationNotifications, sendMaintenanceEndNotifications } from '@/lib/cron-license-expiration';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email-with-db-config';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    license: {
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock('@/lib/email-with-db-config', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/email-template-loader', () => ({
  formatDateForEmail: (d: Date) => d.toISOString(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockFindMany = prisma.license.findMany as jest.Mock;
const mockUpdate = prisma.license.update as jest.Mock;
const mockSendEmail = sendEmail as jest.Mock;

describe('cron-license-expiration dedup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
  });

  it('sendExpirationNotifications: requêtes filtrent les licences déjà notifiées au même seuil', async () => {
    await sendExpirationNotifications();

    // 3 requêtes (7j, 3j, 1j)
    expect(mockFindMany).toHaveBeenCalledTimes(3);

    const filters = mockFindMany.mock.calls.map(c => c[0].where.OR);
    expect(filters[0]).toEqual([{ lastExpirationEmailDays: null }, { lastExpirationEmailDays: { lt: 7 } }]);
    expect(filters[1]).toEqual([{ lastExpirationEmailDays: null }, { lastExpirationEmailDays: { lt: 3 } }]);
    expect(filters[2]).toEqual([{ lastExpirationEmailDays: null }, { lastExpirationEmailDays: { lt: 1 } }]);
  });

  it('sendExpirationNotifications: après envoi, marque lastExpirationEmailDays au seuil', async () => {
    const license = {
      id: 'lic-1',
      customerEmail: 'a@b.com',
      customerName: 'Test',
      tier: 'pro',
      expiresAt: new Date(),
      lastExpirationEmailDays: null,
    };
    mockFindMany.mockResolvedValueOnce([license]).mockResolvedValue([]);

    await sendExpirationNotifications();

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'lic-1' },
      data: { lastExpirationEmailDays: 7 },
    });
  });

  it('sendMaintenanceEndNotifications: filtres dédup maintenance', async () => {
    await sendMaintenanceEndNotifications();

    const filters = mockFindMany.mock.calls.map(c => c[0].where.OR);
    expect(filters[0]).toEqual([{ lastMaintenanceEmailDays: null }, { lastMaintenanceEmailDays: { lt: 7 } }]);
    expect(filters[1]).toEqual([{ lastMaintenanceEmailDays: null }, { lastMaintenanceEmailDays: { lt: 3 } }]);
    expect(filters[2]).toEqual([{ lastMaintenanceEmailDays: null }, { lastMaintenanceEmailDays: { lt: 1 } }]);
  });
});
