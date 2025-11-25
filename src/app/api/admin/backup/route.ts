import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Exporter toutes les données
export async function GET() {
  try {
    // Removed getPrisma() - using direct import
    if (!prisma) {
      return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
    }

    // Récupérer toutes les données (BACKUP COMPLET - 16 nov 2025)
    // Priorité: Protection données complète + Conformité RGPD
    const [
      users,
      customers,
      customerBikes,
      bikes,
      workOrders,
      workOrderLines,
      invoices,
      invoiceLines,
      invoicePayments,
      invoiceSequences,
      catalogItems,
      stockMovements,
      suppliers,
      supplierItems,
      supplierOffers,
      supplierProducts,
      supplierCredentials,
      bookings,
      communications,
      cashRegisters,
      serviceRates,
      pricingMargins,
      appSettings,
      systemSettings,
      emailTemplates,
      smsTemplates,
      calendarEvents,
      calendarBlocks,
      calendarConfigs,
      globalSettings,
      licenses,
      licenseVerifications,
    ] = await Promise.all([
      prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, active: true, createdAt: true } }),
      prisma.customer.findMany(),
      prisma.customerBike.findMany(),
      prisma.bike.findMany(),
      prisma.workOrder.findMany(),
      prisma.workOrderLine.findMany(),
      prisma.invoice.findMany(),
      prisma.invoiceLine.findMany(),
      prisma.invoicePayment.findMany(),
      prisma.invoiceSequence.findMany(),
      prisma.catalogItem.findMany(),
      prisma.stockMovement.findMany(),
      prisma.supplier.findMany(),
      prisma.supplierItem.findMany(),
      prisma.supplierOffer.findMany(),
      prisma.supplierProduct.findMany(),
      prisma.supplierCredential.findMany(),
      prisma.booking.findMany(),
      prisma.communication.findMany(),
      prisma.cashRegister.findMany(),
      prisma.serviceRate.findMany(),
      prisma.pricingMargin.findMany(),
      prisma.appSetting.findMany(),
      prisma.systemSettings.findMany(),
      prisma.emailTemplate.findMany(),
      prisma.sMSTemplate.findMany(),
      prisma.calendarEvent.findMany(),
      prisma.calendarBlock.findMany(),
      prisma.calendarConfig.findMany(),
      prisma.globalSetting.findMany(),
      prisma.license.findMany(),
      prisma.licenseVerification.findMany(),
    ]);

    const backup = {
      exportDate: new Date().toISOString(),
      version: "2.0", // Version 2.0 = Backup complet
      data: {
        users,
        customers,
        customerBikes,
        bikes,
        workOrders,
        workOrderLines,
        invoices,
        invoiceLines,
        invoicePayments,
        invoiceSequences,
        catalogItems,
        stockMovements,
        suppliers,
        supplierItems,
        supplierOffers,
        supplierProducts,
        supplierCredentials,
        bookings,
        communications,
        cashRegisters,
        serviceRates,
        pricingMargins,
        appSettings,
        systemSettings,
        emailTemplates,
        smsTemplates,
        calendarEvents,
        calendarBlocks,
        calendarConfigs,
        globalSettings,
        licenses,
        licenseVerifications,
      },
      metadata: {
        totalUsers: users.length,
        totalCustomers: customers.length,
        totalCustomerBikes: customerBikes.length,
        totalBikes: bikes.length,
        totalWorkOrders: workOrders.length,
        totalWorkOrderLines: workOrderLines.length,
        totalInvoices: invoices.length,
        totalInvoiceLines: invoiceLines.length,
        totalInvoicePayments: invoicePayments.length,
        totalCatalogItems: catalogItems.length,
        totalStockMovements: stockMovements.length,
        totalSuppliers: suppliers.length,
        totalBookings: bookings.length,
        totalCommunications: communications.length,
        totalCashRegisters: cashRegisters.length,
        totalServiceRates: serviceRates.length,
        totalSystemSettings: systemSettings.length,
        totalLicenses: licenses.length,
      }
    };

    // Créer un nom de fichier avec la date
    const filename = `atelier-velo-backup-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error("Error creating backup:", error);
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 }
    );
  }
}

// Restaurer depuis un backup (RESTAURATION COMPLÈTE - 16 nov 2025)
// Priorité: Protection données complète + Conformité RGPD
export async function POST(req: NextRequest) {
  try {
    if (!prisma) {
      return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
    }

    const body = await req.json();
    const { data, confirmRestore } = body;

    if (!confirmRestore) {
      return NextResponse.json(
        { error: "Confirmation requise pour la restauration" },
        { status: 400 }
      );
    }

    // Valider format backup (version 2.0 = complet)
    if (!data || !data.users || !data.customers) {
      return NextResponse.json(
        { error: "Format de backup invalide. Version 2.0 requise (backup complet)." },
        { status: 400 }
      );
    }

    // ATTENTION: Cette opération est destructive
    // Restauration complète avec gestion ordre FK (contraintes référentielles)

    const restored: Record<string, number> = {};
    const errors: Record<string, string[]> = {};

    // Fonction helper pour restaurer une table
    // Note: any est utilisé pour item car les données proviennent de JSON parsé
    // et peuvent avoir différentes structures selon la table
        const restoreTable = async (
      tableName: string,
            items: any[],
            restoreFn: (item: any) => Promise<void>
    ) => {
      restored[tableName] = 0;
      errors[tableName] = [];
      
      for (const item of items || []) {
        try {
          await restoreFn(item);
          restored[tableName]++;
        } catch (error) {
          const itemId = item?.id || 'unknown';
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          const fullMsg = `Failed to restore ${tableName} ${itemId}: ${errorMsg}`;
          logger.error(fullMsg);
          errors[tableName].push(fullMsg);
        }
      }
    };

    // ORDRE DE RESTAURATION (respect contraintes FK)
    // 1. Tables sans FK (ou FK optionnelles)
    await restoreTable('users', data.users, async (user) => {
      await prisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: user,
      });
    });

    await restoreTable('globalSettings', data.globalSettings, async (setting) => {
      await prisma.globalSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting,
      });
    });

    await restoreTable('calendarConfigs', data.calendarConfigs, async (config) => {
      await prisma.calendarConfig.upsert({
        where: { id: config.id },
        update: config,
        create: config,
      });
    });

    await restoreTable('serviceRates', data.serviceRates, async (rate) => {
      await prisma.serviceRate.upsert({
        where: { id: rate.id },
        update: rate,
        create: rate,
      });
    });

    await restoreTable('pricingMargins', data.pricingMargins, async (margin) => {
      await prisma.pricingMargin.upsert({
        where: { id: margin.id },
        update: margin,
        create: margin,
      });
    });

    await restoreTable('suppliers', data.suppliers, async (supplier) => {
      await prisma.supplier.upsert({
        where: { id: supplier.id },
        update: supplier,
        create: supplier,
      });
    });

    await restoreTable('catalogItems', data.catalogItems, async (item) => {
      await prisma.catalogItem.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    });

    // 2. Tables avec FK vers User
    await restoreTable('appSettings', data.appSettings, async (setting) => {
      await prisma.appSetting.upsert({
        where: { userId: setting.userId },
        update: setting,
        create: setting,
      });
    });

    await restoreTable('systemSettings', data.systemSettings, async (setting) => {
      await prisma.systemSettings.upsert({
        where: { userId: setting.userId },
        update: setting,
        create: setting,
      });
    });

    await restoreTable('bikes', data.bikes, async (bike) => {
      await prisma.bike.upsert({
        where: { id: bike.id },
        update: bike,
        create: bike,
      });
    });

    await restoreTable('supplierProducts', data.supplierProducts, async (product) => {
      // Contrainte unique composite: userId + reference
      const existing = await prisma.supplierProduct.findUnique({
        where: { userId_reference: { userId: product.userId, reference: product.reference } }
      });
      if (existing) {
        await prisma.supplierProduct.update({
          where: { id: existing.id },
          data: product,
        });
      } else {
        await prisma.supplierProduct.create({ data: product });
      }
    });

    // 3. Tables avec FK vers Customer
    await restoreTable('customers', data.customers, async (customer) => {
      await prisma.customer.upsert({
        where: { id: customer.id },
        update: customer,
        create: customer,
      });
    });

    await restoreTable('customerBikes', data.customerBikes, async (bike) => {
      await prisma.customerBike.upsert({
        where: { customerId_index: { customerId: bike.customerId, index: bike.index } },
        update: bike,
        create: bike,
      });
    });

    await restoreTable('bookings', data.bookings, async (booking) => {
      await prisma.booking.upsert({
        where: { id: booking.id },
        update: booking,
        create: booking,
      });
    });

    // 4. Tables avec FK vers CatalogItem/Supplier
    await restoreTable('supplierItems', data.supplierItems, async (item) => {
      await prisma.supplierItem.upsert({
        where: { id: item.id },
        update: item,
        create: item,
      });
    });

    await restoreTable('supplierOffers', data.supplierOffers, async (offer) => {
      await prisma.supplierOffer.upsert({
        where: { id: offer.id },
        update: offer,
        create: offer,
      });
    });

    await restoreTable('supplierCredentials', data.supplierCredentials, async (cred) => {
      await prisma.supplierCredential.upsert({
        where: { id: cred.id },
        update: cred,
        create: cred,
      });
    });

    await restoreTable('stockMovements', data.stockMovements, async (movement) => {
      await prisma.stockMovement.upsert({
        where: { id: movement.id },
        update: movement,
        create: movement,
      });
    });

    // 5. Tables avec FK vers CustomerBike/Customer
    await restoreTable('workOrders', data.workOrders, async (wo) => {
      await prisma.workOrder.upsert({
        where: { id: wo.id },
        update: wo,
        create: wo,
      });
    });

    await restoreTable('workOrderLines', data.workOrderLines, async (line) => {
      await prisma.workOrderLine.upsert({
        where: { id: line.id },
        update: line,
        create: line,
      });
    });

    // 6. Tables avec FK vers WorkOrder
    await restoreTable('invoices', data.invoices, async (invoice) => {
      await prisma.invoice.upsert({
        where: { id: invoice.id },
        update: invoice,
        create: invoice,
      });
    });

    await restoreTable('communications', data.communications, async (comm) => {
      await prisma.communication.upsert({
        where: { id: comm.id },
        update: comm,
        create: comm,
      });
    });

    // 7. Tables avec FK vers Invoice
    await restoreTable('invoiceLines', data.invoiceLines, async (line) => {
      await prisma.invoiceLine.upsert({
        where: { id: line.id },
        update: line,
        create: line,
      });
    });

    await restoreTable('invoicePayments', data.invoicePayments, async (payment) => {
      await prisma.invoicePayment.upsert({
        where: { id: payment.id },
        update: payment,
        create: payment,
      });
    });

    await restoreTable('cashRegisters', data.cashRegisters, async (register) => {
      await prisma.cashRegister.upsert({
        where: { id: register.id },
        update: register,
        create: register,
      });
    });

    // 8. Tables séquentielles
    await restoreTable('invoiceSequences', data.invoiceSequences, async (seq) => {
      await prisma.invoiceSequence.upsert({
        where: { year: seq.year },
        update: seq,
        create: seq,
      });
    });

    // 9. Tables calendrier
    await restoreTable('calendarEvents', data.calendarEvents, async (event) => {
      await prisma.calendarEvent.upsert({
        where: { id: event.id },
        update: event,
        create: event,
      });
    });

    await restoreTable('calendarBlocks', data.calendarBlocks, async (block) => {
      await prisma.calendarBlock.upsert({
        where: { id: block.id },
        update: block,
        create: block,
      });
    });

    // 10. Templates
    await restoreTable('emailTemplates', data.emailTemplates, async (template) => {
      await prisma.emailTemplate.upsert({
        where: { name: template.name },
        update: template,
        create: template,
      });
    });

    await restoreTable('smsTemplates', data.smsTemplates, async (template) => {
      await prisma.sMSTemplate.upsert({
        where: { name: template.name },
        update: template,
        create: template,
      });
    });

    // 11. Licences
    await restoreTable('licenses', data.licenses, async (license) => {
      await prisma.license.upsert({
        where: { key: license.key },
        update: license,
        create: license,
      });
    });

    await restoreTable('licenseVerifications', data.licenseVerifications, async (verif) => {
      await prisma.licenseVerification.upsert({
        where: { id: verif.id },
        update: verif,
        create: verif,
      });
    });

    // Résumé restauration
    const totalRestored = Object.values(restored).reduce((sum, count) => sum + count, 0);
    const totalErrors = Object.values(errors).reduce((sum, errs) => sum + errs.length, 0);

    return NextResponse.json({
      success: true,
      restored,
      errors: totalErrors > 0 ? errors : undefined,
      summary: {
        totalRestored,
        totalErrors,
        tablesRestored: Object.keys(restored).length,
      },
      message: totalErrors > 0
        ? `Restauration partielle effectuée. ${totalRestored} éléments restaurés, ${totalErrors} erreurs. Vérifiez les logs pour les détails.`
        : `Restauration complète réussie. ${totalRestored} éléments restaurés.`
    });
  } catch (error) {
    logger.error("Error restoring backup:", error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: "Failed to restore backup", detail: errorMsg },
      { status: 500 }
    );
  }
}
