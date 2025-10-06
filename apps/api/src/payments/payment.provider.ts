export type PaymentInitRequest = {
  amount: number; // in cents
  currency: string; // e.g. EUR
  reference: string; // internal reference (sale/workorder)
};

export type PaymentInitResponse = {
  provider: "stripe_terminal" | "sumup";
  sessionId?: string; // Stripe Terminal or equivalent
  redirectUrl?: string; // If flow requires redirect (SumUp OAuth etc.)
};

export type PaymentConfirmRequest = {
  sessionId?: string;
  providerRef?: string; // provider transaction id
};

export type PaymentConfirmResponse = {
  status: "succeeded" | "failed" | "pending";
  providerRef?: string;
  failureReason?: string;
};

export interface PaymentProvider {
  name(): string;
  init(req: PaymentInitRequest): Promise<PaymentInitResponse>;
  confirm(req: PaymentConfirmRequest): Promise<PaymentConfirmResponse>;
}
