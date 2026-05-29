-- D1 schema for Atelier Vélo+ billing & activation.
-- Run: `wrangler d1 migrations apply DB --local` (dev) then `--remote --env production`.

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  stripe_checkout_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_mode TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  tier TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending',
  license_id TEXT,
  license_key TEXT,
  email_sent_at TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS purchase_tokens (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  order_id TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  redeemed_at TEXT,
  license_key TEXT,
  hardware_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tokens_email ON purchase_tokens(email);
