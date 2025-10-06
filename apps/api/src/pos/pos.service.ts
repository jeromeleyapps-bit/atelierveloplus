import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import PDFDocument from "pdfkit";
import * as stream from "stream";

export type QuoteResult = {
  workOrderId: string;
  partsHT: number;
  laborHT: number;
  totalHT: number;
  tvaRate: number;
  totalTVA: number;
  totalTTC: number;
  currency: string;
  lines: Array<{
    type: "part" | "labor";
    description: string;
    qty: number;
    priceHT: number;
    lineTotalHT: number;
  }>;
};

@Injectable()
export class POSService {
  constructor(private readonly prisma: PrismaService) {}

  private toNumber(d: any): number {
    if (d == null) return 0;
    const n = typeof d === "string" ? parseFloat(d) : Number(d);
    return isNaN(n) ? 0 : n;
  }

  async quoteFromWorkOrder(
    ownerId: string | undefined,
    workOrderId: string,
  ): Promise<QuoteResult> {
    if (!ownerId) throw new UnauthorizedException("Missing owner");
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, ownerId },
      include: { items: true },
    });
    if (!wo) throw new NotFoundException("WorkOrder not found");

    const currency = "EUR";
    const defaultTaxRate = 20; // simple assumption per item; refine per product later

    const lines: QuoteResult["lines"] = [];

    // Parts and labor from items
    for (const it of wo.items) {
      const qty = it.qty ?? 1;
      const price = this.toNumber(it.priceHT);
      const type = (it.type as "part" | "labor") || "part";
      lines.push({
        type,
        description:
          it.description || (type === "part" ? "Pièce" : "Main d'œuvre"),
        qty,
        priceHT: price,
        lineTotalHT: price * qty,
      });
    }

    // If no explicit labor item, compute labor from estimate
    const hasLabor = lines.some((l) => l.type === "labor");
    if (!hasLabor && wo.estimatedMinutes && wo.hourlyRate) {
      const hours = wo.estimatedMinutes / 60;
      const price = this.toNumber(wo.hourlyRate);
      const lineTotalHT = hours * price;
      lines.push({
        type: "labor",
        description: `Main d'œuvre estimée (${wo.estimatedMinutes} min @ ${price.toFixed(2)}€/h)`,
        qty: 1,
        priceHT: Number(lineTotalHT.toFixed(2)),
        lineTotalHT: Number(lineTotalHT.toFixed(2)),
      });
    }

    const partsHT = lines
      .filter((l) => l.type === "part")
      .reduce((s, l) => s + l.lineTotalHT, 0);
    const laborHT = lines
      .filter((l) => l.type === "labor")
      .reduce((s, l) => s + l.lineTotalHT, 0);
    const totalHT = partsHT + laborHT;
    const totalTVA = (totalHT * defaultTaxRate) / 100;
    const totalTTC = totalHT + totalTVA;

    return {
      workOrderId,
      partsHT: Number(partsHT.toFixed(2)),
      laborHT: Number(laborHT.toFixed(2)),
      totalHT: Number(totalHT.toFixed(2)),
      tvaRate: defaultTaxRate,
      totalTVA: Number(totalTVA.toFixed(2)),
      totalTTC: Number(totalTTC.toFixed(2)),
      currency,
      lines,
    };
  }

  async createSaleFromWorkOrder(
    ownerId: string | undefined,
    workOrderId: string,
  ) {
    if (!ownerId) throw new UnauthorizedException("Missing owner");
    const quote = await this.quoteFromWorkOrder(ownerId, workOrderId);
    const sale = await this.prisma.sale.create({
      data: {
        ownerId,
        customerId:
          (
            await this.prisma.workOrder.findUnique({
              where: { id: workOrderId },
            })
          )?.customerId || null,
        totalHT: quote.totalHT,
        totalTVA: quote.totalTVA,
        totalTTC: quote.totalTTC,
        payments: { create: [] },
      },
    });

    // Insert lines as SaleLine records
    for (const l of quote.lines) {
      await (this.prisma as any).saleLine.create({
        data: {
          saleId: sale.id,
          productId: null, // free lines for now; bind to products later
          description: l.description,
          qty: l.qty,
          priceHT: l.priceHT,
          discount: 0,
        },
      } as any);
    }

    return { saleId: sale.id, totals: quote };
  }

  async getSaleWithLines(ownerId: string | undefined, saleId: string) {
    if (!ownerId) throw new UnauthorizedException("Missing owner");
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, ownerId },
      include: { lines: true, customer: true },
    });
    if (!sale) throw new NotFoundException("Sale not found");
    return sale;
  }

  async generateInvoicePdfStream(
    ownerId: string | undefined,
    saleId: string,
  ): Promise<NodeJS.ReadableStream> {
    const sale = await this.getSaleWithLines(ownerId, saleId);
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const pass = new stream.PassThrough();
    doc.pipe(pass);

    // Header
    doc.fontSize(18).text("Facture", { align: "right" });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Facture pour vente #${sale.id}`);
    if (sale.customer) {
      doc.text(
        `Client: ${sale.customer.firstName || ""} ${sale.customer.lastName || ""}`,
      );
      if (sale.customer.email) doc.text(`Email: ${sale.customer.email}`);
    }
    doc.moveDown(1);

    // Table header
    doc.fontSize(12).text("Description", 50, doc.y);
    doc.text("Qté", 300, doc.y, { width: 50, align: "right" });
    doc.text("PU HT", 360, doc.y, { width: 80, align: "right" });
    doc.text("Total HT", 450, doc.y, { width: 100, align: "right" });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    // Lines
    doc.moveDown(0.5);
    for (const line of sale.lines) {
      const qty = line.qty || 1;
      const price = Number(line.priceHT as any);
      const total = price * qty;
      doc.text(line.description || "-", 50, doc.y);
      doc.text(String(qty), 300, doc.y, { width: 50, align: "right" });
      doc.text(price.toFixed(2) + " €", 360, doc.y, {
        width: 80,
        align: "right",
      });
      doc.text(total.toFixed(2) + " €", 450, doc.y, {
        width: 100,
        align: "right",
      });
      doc.moveDown(0.2);
    }

    doc.moveDown(1);
    doc.moveTo(350, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.text("Total HT:", 350, doc.y, { width: 100, align: "right" });
    doc.text(Number(sale.totalHT as any).toFixed(2) + " €", 450, doc.y, {
      width: 100,
      align: "right",
    });
    doc.moveDown(0.2);
    doc.text("Total TVA:", 350, doc.y, { width: 100, align: "right" });
    doc.text(Number(sale.totalTVA as any).toFixed(2) + " €", 450, doc.y, {
      width: 100,
      align: "right",
    });
    doc.moveDown(0.2);
    doc.text("Total TTC:", 350, doc.y, { width: 100, align: "right" });
    doc.text(Number(sale.totalTTC as any).toFixed(2) + " €", 450, doc.y, {
      width: 100,
      align: "right",
    });

    doc.end();
    return pass;
  }
}
