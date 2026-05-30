export interface Env {
  DB: D1Database;
  APP_NAME: string;

  // Secrets (wrangler secret put)
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_BASIQUE: string;
  STRIPE_PRICE_PRO: string;
  STRIPE_PRICE_PRO_LIFETIME: string;
  LICENSE_PRIVATE_KEY_PEM: string;
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  APP_PUBLIC_URL: string;
  ADMIN_SECRET: string; // protège les endpoints /support/* (éditeur)
}
