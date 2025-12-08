/**
 * Tests pour le module Prisma
 */

describe('Prisma module', () => {
  it('should export prisma client', () => {
    // Import dynamique pour éviter les effets de bord
    const { prisma } = require('@/lib/prisma');
    expect(prisma).toBeDefined();
    expect(typeof prisma.customer).toBe('object');
    expect(typeof prisma.workOrder).toBe('object');
  });

  it('should have expected models', () => {
    const { prisma } = require('@/lib/prisma');
    
    // Vérifier les modèles principaux
    expect(prisma.customer).toBeDefined();
    expect(prisma.workOrder).toBeDefined();
    expect(prisma.invoice).toBeDefined();
    expect(prisma.catalogItem).toBeDefined();
    expect(prisma.user).toBeDefined();
  });

  it('should have CRUD methods on models', () => {
    const { prisma } = require('@/lib/prisma');
    
    // Vérifier les méthodes CRUD
    expect(typeof prisma.customer.findMany).toBe('function');
    expect(typeof prisma.customer.findUnique).toBe('function');
    expect(typeof prisma.customer.create).toBe('function');
    expect(typeof prisma.customer.update).toBe('function');
    expect(typeof prisma.customer.delete).toBe('function');
  });
});
