import { Controller, Get, Param, Post, Res, Req } from "@nestjs/common";
import { POSService } from "./pos.service";
import type { Response } from "express";
import type { Request } from "express";

@Controller("pos")
export class POSController {
  constructor(private readonly pos: POSService) {}

  // Devis à partir d'un WorkOrder
  @Get("workorders/:id/quote")
  async quote(@Req() req: Request, @Param("id") id: string) {
    const ownerId = (req as any).user?.id as string | undefined;
    return this.pos.quoteFromWorkOrder(ownerId, id);
  }

  // Créer une vente (Sale) à partir d'un WorkOrder
  @Post("workorders/:id/sale")
  async createSale(@Req() req: Request, @Param("id") id: string) {
    const ownerId = (req as any).user?.id as string | undefined;
    return this.pos.createSaleFromWorkOrder(ownerId, id);
  }

  // Télécharger la facture PDF d'une vente
  @Get("sales/:id/invoice.pdf")
  async invoice(
    @Req() req: Request,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const ownerId = (req as any).user?.id as string | undefined;
    const stream = await this.pos.generateInvoicePdfStream(ownerId, id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice_${id}.pdf"`,
    );
    stream.pipe(res);
  }
}
