import axios from "axios";
import { Injectable } from "@nestjs/common";
import {
  PaymentConfirmRequest,
  PaymentConfirmResponse,
  PaymentInitRequest,
  PaymentInitResponse,
  PaymentProvider,
} from "./payment.provider";

// Minimal placeholder for SumUp integration
// Real flow will use OAuth2 or Client Credentials to obtain access token and create transactions
@Injectable()
export class SumUpProvider implements PaymentProvider {
  name() {
    return "sumup";
  }

  async init(req: PaymentInitRequest): Promise<PaymentInitResponse> {
    // Placeholder: in real life, initiate a checkout/transaction with SumUp
    // We only return a stub response to keep the API stable during setup
    return {
      provider: "sumup",
    };
  }

  async confirm(_req: PaymentConfirmRequest): Promise<PaymentConfirmResponse> {
    // Placeholder confirmation until full SumUp flow is implemented
    return { status: "pending" };
  }
}
