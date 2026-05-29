/**
 * Accès au compte Stripe de l'atelier (clés saisies + chiffrées via /admin/integrations/stripe).
 *
 * Sert à l'app Electron pour : générer un Payment Link sur une facture, vérifier les paiements.
 */
import Stripe from 'stripe';
import { prisma } from './prisma';
import { decrypt } from './crypto';
import { logger } from './logger';

export interface AtelierStripe {
  stripe: Stripe;
  livemode: boolean;
  publishableKey: string;
}

/**
 * Renvoie un client Stripe configuré avec les clés de l'atelier.
 * Throw si pas configuré ou si déchiffrement échoue.
 */
export async function getAtelierStripeClient(userId: string): Promise<AtelierStripe> {
  const conn = await prisma.stripeConnection.findUnique({ where: { userId } });
  if (!conn || conn.status !== 'active') {
    throw new Error('stripe_not_configured');
  }
  let secret: string;
  try {
    secret = decrypt(conn.secretKeyEncrypted);
  } catch (e) {
    logger.error('[stripe-atelier] decrypt failed', { error: String(e) });
    throw new Error('stripe_decrypt_failed');
  }
  const stripe = new Stripe(secret);
  return { stripe, livemode: conn.livemode, publishableKey: conn.publishableKey };
}
