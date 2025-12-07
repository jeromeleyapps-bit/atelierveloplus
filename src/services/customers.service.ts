/**
 * Service Customers - Logique métier centralisée
 * 
 * Architecture Services Layer:
 * - Sépare la logique métier des routes API
 * - Code réutilisable et testable
 * - Validation centralisée
 * 
 * Usage:
 * - Routes API: import { CustomersService } from '@/services/customers.service'
 * - Tests: Mock facile de CustomersService
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Types - Inféré depuis Prisma
type CustomerRecord = Awaited<ReturnType<typeof prisma.customer.findFirst>>;
export type CustomerWithBikesCount = NonNullable<CustomerRecord> & {
  bikesCount: number;
  _count?: { CustomerBike: number };
};

export type CreateCustomerInput = {
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
};

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export type CustomerSearchParams = {
  query?: string;
  limit?: number;
};

/**
 * Service de gestion des clients
 */
export class CustomersService {
  /**
   * Liste tous les clients avec filtrage optionnel
   */
  static async list(params: CustomerSearchParams = {}): Promise<CustomerWithBikesCount[]> {
    const { query, limit = 200 } = params;
    const q = (query || '').toLowerCase().trim();

    try {
      const rows = await prisma.customer.findMany({
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ],
        include: { _count: { select: { CustomerBike: true } } },
      });

      // Mapper avec bikesCount
      const items = rows.map((r) => ({
        ...r,
        bikesCount: r._count?.CustomerBike ?? 0
      }));

      // Filtrage si query fournie
      const filtered = q
        ? items.filter(c =>
            (c.firstName || '').toLowerCase().includes(q) ||
            (c.lastName || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.phone || '').toLowerCase().includes(q)
          )
        : items;

      return filtered.slice(0, limit);
    } catch (error) {
      logger.error('CustomersService.list error:', { error });
      throw error;
    }
  }

  /**
   * Récupère un client par ID
   */
  static async getById(id: string) {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          CustomerBike: true,
          WorkOrder: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          },
          _count: { select: { CustomerBike: true, WorkOrder: true } }
        }
      });

      if (!customer) {
        return null;
      }

      return {
        ...customer,
        bikesCount: customer._count?.CustomerBike ?? 0,
        workOrdersCount: customer._count?.WorkOrder ?? 0
      };
    } catch (error) {
      logger.error('CustomersService.getById error:', { error, id });
      throw error;
    }
  }

  /**
   * Crée un nouveau client
   */
  static async create(input: CreateCustomerInput) {
    try {
      // Validation basique
      if (!input.email && !input.phone && !input.firstName && !input.lastName) {
        throw new Error('Au moins un identifiant requis (email, téléphone ou nom)');
      }

      const created = await prisma.customer.create({
        data: {
          email: input.email || null,
          firstName: input.firstName || null,
          lastName: input.lastName || null,
          phone: input.phone || null,
          address1: input.address1 || null,
          address2: input.address2 || null,
          zip: input.zip || null,
          city: input.city || null,
          country: input.country || null,
          bikeBrand: input.bikeBrand || null,
          bikeModel: input.bikeModel || null,
          nationalFileId: input.nationalFileId || null,
          shipAddress1: input.shipAddress1 || null,
          shipAddress2: input.shipAddress2 || null,
          shipZip: input.shipZip || null,
          shipCity: input.shipCity || null,
          shipCountry: input.shipCountry || null,
          notes: input.notes || null,
        }
      });

      // Migration automatique: créer Vélo 1 si infos vélo fournies
      if (input.bikeBrand || input.bikeModel || input.nationalFileId) {
        await prisma.customerBike.upsert({
          where: { customerId_index: { customerId: created.id, index: 1 } },
          update: {
            brand: input.bikeBrand || null,
            model: input.bikeModel || null,
            nationalFileId: input.nationalFileId || null,
          },
          create: {
            customerId: created.id,
            index: 1,
            brand: input.bikeBrand || null,
            model: input.bikeModel || null,
            nationalFileId: input.nationalFileId || null,
          },
        });
      }

      logger.info('Customer created', { customerId: created.id });
      return created;
    } catch (error) {
      logger.error('CustomersService.create error:', { error, input });
      throw error;
    }
  }

  /**
   * Met à jour un client existant
   */
  static async update(id: string, input: UpdateCustomerInput) {
    try {
      // Vérifier existence
      const existing = await prisma.customer.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Client non trouvé');
      }

      const updated = await prisma.customer.update({
        where: { id },
        data: {
          ...(input.email !== undefined && { email: input.email }),
          ...(input.firstName !== undefined && { firstName: input.firstName }),
          ...(input.lastName !== undefined && { lastName: input.lastName }),
          ...(input.phone !== undefined && { phone: input.phone }),
          ...(input.address1 !== undefined && { address1: input.address1 }),
          ...(input.address2 !== undefined && { address2: input.address2 }),
          ...(input.zip !== undefined && { zip: input.zip }),
          ...(input.city !== undefined && { city: input.city }),
          ...(input.country !== undefined && { country: input.country }),
          ...(input.notes !== undefined && { notes: input.notes }),
          ...(input.bikeBrand !== undefined && { bikeBrand: input.bikeBrand }),
          ...(input.bikeModel !== undefined && { bikeModel: input.bikeModel }),
          ...(input.nationalFileId !== undefined && { nationalFileId: input.nationalFileId }),
        }
      });

      logger.info('Customer updated', { customerId: id });
      return updated;
    } catch (error) {
      logger.error('CustomersService.update error:', { error, id, input });
      throw error;
    }
  }

  /**
   * Supprime un client
   */
  static async delete(id: string) {
    try {
      // Vérifier existence
      const existing = await prisma.customer.findUnique({
        where: { id },
        include: { _count: { select: { WorkOrder: true } } }
      });

      if (!existing) {
        throw new Error('Client non trouvé');
      }

      // Empêcher suppression si tickets associés
      if (existing._count.WorkOrder > 0) {
        throw new Error(`Impossible de supprimer: ${existing._count.WorkOrder} ticket(s) associé(s)`);
      }

      // Supprimer les vélos d'abord (cascade)
      await prisma.customerBike.deleteMany({ where: { customerId: id } });

      // Supprimer le client
      await prisma.customer.delete({ where: { id } });

      logger.info('Customer deleted', { customerId: id });
      return { success: true };
    } catch (error) {
      logger.error('CustomersService.delete error:', { error, id });
      throw error;
    }
  }

  /**
   * Recherche avancée de clients
   */
  static async search(query: string, options: { limit?: number } = {}) {
    const { limit = 50 } = options;
    const q = query.toLowerCase().trim();

    if (!q) {
      return this.list({ limit });
    }

    try {
      // Recherche simple (SQLite ne supporte pas mode: 'insensitive')
      // Le filtrage case-insensitive est fait côté JavaScript
      const results = await prisma.customer.findMany({
        include: { _count: { select: { CustomerBike: true } } },
        take: limit * 2, // Prendre plus pour compenser le filtrage
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      });

      // Filtrage case-insensitive côté JavaScript
      const filtered = results.filter(r =>
        (r.email || '').toLowerCase().includes(q) ||
        (r.firstName || '').toLowerCase().includes(q) ||
        (r.lastName || '').toLowerCase().includes(q) ||
        (r.phone || '').includes(q)
      );

      return filtered.slice(0, limit).map(r => ({
        ...r,
        bikesCount: r._count?.CustomerBike ?? 0
      }));
    } catch (error) {
      logger.error('CustomersService.search error:', { error, query });
      throw error;
    }
  }

  /**
   * Statistiques clients
   */
  static async getStats() {
    try {
      const [total, withEmail, withPhone, recentlyActive] = await Promise.all([
        prisma.customer.count(),
        prisma.customer.count({ where: { email: { not: null } } }),
        prisma.customer.count({ where: { phone: { not: null } } }),
        prisma.customer.count({
          where: {
            WorkOrder: {
              some: {
                createdAt: {
                  gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) // 6 mois
                }
              }
            }
          }
        })
      ]);

      return {
        total,
        withEmail,
        withPhone,
        recentlyActive,
        emailRate: total > 0 ? Math.round((withEmail / total) * 100) : 0,
        phoneRate: total > 0 ? Math.round((withPhone / total) * 100) : 0,
      };
    } catch (error) {
      logger.error('CustomersService.getStats error:', { error });
      throw error;
    }
  }
}

export default CustomersService;
