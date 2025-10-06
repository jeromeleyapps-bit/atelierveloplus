import Stripe from "stripe";
import { Injectable } from "@nestjs/common";
import {
  PaymentConfirmRequest,
  PaymentConfirmResponse,
  PaymentInitRequest,
  PaymentInitResponse,
  PaymentProvider,
} from "./payment.provider";

@Injectable()
export class StripeTerminalProvider implements PaymentProvider {
  private stripe: Stripe;

  constructor() {
    const key = process.env.STRIPE_API_KEY || "";
    this.stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  }

  name() {
    return "stripe_terminal";
  }

  async init(req: PaymentInitRequest): Promise<PaymentInitResponse> {
    // Placeholder: in real flow, create a PaymentIntent and attach to Terminal
    // Keeping it minimal to avoid runtime errors without configuration
    return {
      provider: "stripe_terminal",
      sessionId: undefined,
    };
  }

  async confirm(_req: PaymentConfirmRequest): Promise<PaymentConfirmResponse> {
    // Placeholder confirmation
    return { status: "pending" };
  }
}
