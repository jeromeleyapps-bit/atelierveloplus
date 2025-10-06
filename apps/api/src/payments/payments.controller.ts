import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Param,
} from "@nestjs/common";
import { PaymentConfirmRequest, PaymentInitRequest } from "./payment.provider";
import { StripeTerminalProvider } from "./stripe-terminal.provider";
import { SumUpProvider } from "./sumup.provider";
import { PrismaService } from "../prisma.service";

@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly stripeTerminal: StripeTerminalProvider,
    private readonly sumup: SumUpProvider,
    private readonly prisma: PrismaService,
  ) {}

  @Post("init")
  async init(
    @Body()
    body: PaymentInitRequest & { provider: "stripe_terminal" | "sumup" },
  ) {
    if (body.provider === "stripe_terminal") {
      return this.stripeTerminal.init(body);
    }
    if (body.provider === "sumup") {
      return this.sumup.init(body);
    }
    throw new HttpException("Unsupported provider", HttpStatus.BAD_REQUEST);
  }

  @Post("confirm")
  async confirm(
    @Body()
    body: PaymentConfirmRequest & { provider: "stripe_terminal" | "sumup" },
  ) {
    if (body.provider === "stripe_terminal") {
      return this.stripeTerminal.confirm(body);
    }
    if (body.provider === "sumup") {
      return this.sumup.confirm(body);
    }
    throw new HttpException("Unsupported provider", HttpStatus.BAD_REQUEST);
  }

  // Create a SumUp checkout for a sale (placeholder flow)
  @Post("sumup/:saleId/checkout")
  async sumupCheckout(@Param("saleId") saleId: string) {
    // Create Payment record pending
    const sale = await this.prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) throw new HttpException("Sale not found", HttpStatus.NOT_FOUND);
    const amount = Number(sale.totalTTC as any);
    const payment = await this.prisma.payment.create({
      data: {
        saleId,
        method: "card",
        amount: amount,
        provider: "sumup",
        status: "pending",
      },
    });
    // In real integration, request SumUp API to create a checkout and return the URL
    // For now, return a placeholder URL (to be replaced with live SumUp link)
    const checkoutUrl = `${process.env.APP_BASE_URL || "http://localhost:3000"}/payments/sumup/checkout/${payment.id}`;
    return { paymentId: payment.id, checkoutUrl };
  }

  // Webhook to update payment status from SumUp
  @Post("sumup/webhook")
  async sumupWebhook(
    @Body()
    body: {
      paymentId?: string;
      transaction_id?: string;
      status?: "succeeded" | "failed" | "pending";
    },
  ) {
    const { paymentId, transaction_id, status } = body || {};
    if (!paymentId)
      throw new HttpException("paymentId required", HttpStatus.BAD_REQUEST);
    const update: any = {};
    if (transaction_id) update.providerRef = transaction_id;
    if (status) update.status = status;
    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: update,
    });
    return { ok: true, payment: updated };
  }
}
