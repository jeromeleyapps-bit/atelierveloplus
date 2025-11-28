/**
 * License Middleware - Vérifications licences centralisées
 * 
 * Ce fichier centralise toutes les vérifications de licence
 * pour éviter la duplication et garantir la cohérence
 */

import { NextResponse } from 'next/server';
import { canSendEmail, incrementEmailCount, checkFeatureAccess, getActiveLicense, getLicenseInfo } from './license-manager';
import { logger } from './logger';

/**
 * Vérifie si l'utilisateur peut envoyer un email
 * Retourne une réponse d'erreur si limite atteinte ou pas de licence, sinon null
 */
export async function checkEmailLicense(): Promise<NextResponse | null> {
  try {
    const license = await getActiveLicense();
    
    // ⚠️ CRITIQUE: Vérifier d'abord si une licence existe
    if (!license) {
      return NextResponse.json({
        error: "license_required",
        message: "❌ Aucune licence active. Veuillez activer une licence pour envoyer des emails.",
        details: "Pour utiliser cette fonctionnalité, vous devez activer une licence Basique, Pro ou Pro Lifetime.",
        upgradeUrl: "/admin/license"
      }, { status: 403 });
    }
    
    // Vérifier le status de la licence
    const licenseInfo = await getLicenseInfo();
    
    if (licenseInfo.status === 'expired') {
      return NextResponse.json({
        error: "license_expired",
        message: "❌ Votre licence a expiré. Renouvelez votre licence pour continuer à envoyer des emails.",
        details: "Votre période d'essai et votre grace period sont terminées. Choisissez une licence pour débloquer l'application.",
        upgradeUrl: "/admin/license/upgrade"
      }, { status: 403 });
    }
    
    if (licenseInfo.status === 'grace') {
      const daysRemaining = licenseInfo.gracePeriod?.daysRemaining || 0;
      return NextResponse.json({
        error: "license_grace_period",
        message: `⚠️ Grace period active - ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}. Activez une licence pour éviter le blocage.`,
        details: "Votre période d'essai est terminée. Choisissez une licence maintenant pour éviter l'interruption de service.",
        daysRemaining,
        upgradeUrl: "/admin/license/upgrade"
      }, { status: 403 });
    }
    
    if (licenseInfo.status === 'suspended') {
      return NextResponse.json({
        error: "license_suspended",
        message: "❌ Votre licence est suspendue. Cette licence est liée à une autre machine.",
        details: "Contactez le support si vous avez changé d'ordinateur ou si vous pensez qu'il s'agit d'une erreur.",
        upgradeUrl: "/admin/license"
      }, { status: 403 });
    }
    
    // Vérifier si l'utilisateur peut envoyer un email
    const canSend = await canSendEmail();
    
    if (!canSend) {
      // Vérifier si c'est une limite atteinte ou autre chose
      if (licenseInfo.limits.emailsRemaining === 0 && licenseInfo.tier === 'basique') {
        const resetDate = new Date(licenseInfo.limits.emailResetDate);
        const resetDateStr = resetDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        
        return NextResponse.json({
          error: "license_limit_reached",
          message: "❌ Limite d'emails mensuelle atteinte (30 emails/mois pour licence Basique)",
          details: `Vous avez atteint votre quota de ${licenseInfo.limits.emailsPerMonth} emails ce mois-ci. Le compteur sera réinitialisé le ${resetDateStr}. Passez à Pro pour des emails illimités.`,
          emailsUsed: licenseInfo.limits.emailsPerMonth - licenseInfo.limits.emailsRemaining,
          emailsLimit: licenseInfo.limits.emailsPerMonth,
          resetDate: resetDateStr,
          upgradeUrl: "/admin/license/upgrade"
        }, { status: 403 });
      }
      
      // Autre cas (ne devrait pas arriver normalement)
      return NextResponse.json({
        error: "email_sending_blocked",
        message: "❌ L'envoi d'emails est temporairement bloqué.",
        details: "Contactez le support si le problème persiste.",
        upgradeUrl: "/admin/license"
      }, { status: 403 });
    }
    
    return null;
  } catch (error: unknown) {
    // ⚠️ CRITIQUE: En cas d'erreur, BLOQUER l'envoi par sécurité
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[License Guards] Error checking email license - BLOCKING', { error: errorMessage });
    return NextResponse.json({
      error: "license_check_failed",
      message: "❌ Erreur lors de la vérification de la licence. L'envoi d'emails est bloqué par sécurité.",
      details: "Une erreur technique empêche la vérification de votre licence. Contactez le support si le problème persiste.",
      upgradeUrl: "/admin/license"
    }, { status: 403 });
  }
}

/**
 * Vérifie l'accès à l'envoi PDF direct (feature Pro)
 * Retourne une réponse d'erreur si non autorisé, sinon null
 */
export async function checkPdfDirectSendAccess(): Promise<NextResponse | null> {
  try {
    // ⚠️ CRITIQUE: Vérifier d'abord si une licence existe
    const license = await getActiveLicense();
    if (!license) {
      return NextResponse.json({
        error: "license_required",
        message: "❌ Aucune licence active. L'envoi direct de PDF par email nécessite une licence.",
        details: "Activez une licence Basique (création PDF uniquement) ou Pro/Pro Lifetime (création + envoi direct) pour utiliser cette fonctionnalité.",
        upgradeUrl: "/admin/license",
        featureRequired: "pdfDirectSend"
      }, { status: 403 });
    }
    
    // Vérifier le status de la licence
    const licenseInfo = await getLicenseInfo();
    
    if (licenseInfo.status === 'expired') {
      return NextResponse.json({
        error: "license_expired",
        message: "❌ Votre licence a expiré. Renouvelez pour utiliser l'envoi de PDF par email.",
        details: "Votre période d'essai et votre grace period sont terminées. Activez une licence Pro ou Pro Lifetime pour débloquer cette fonctionnalité.",
        upgradeUrl: "/admin/license/upgrade",
        featureRequired: "pdfDirectSend"
      }, { status: 403 });
    }
    
    if (licenseInfo.status === 'suspended') {
      return NextResponse.json({
        error: "license_suspended",
        message: "❌ Votre licence est suspendue. Cette licence est liée à une autre machine.",
        details: "Contactez le support si vous avez changé d'ordinateur.",
        upgradeUrl: "/admin/license",
        featureRequired: "pdfDirectSend"
      }, { status: 403 });
    }
    
    const hasAccess = await checkFeatureAccess('pdfDirectSend');
    
    if (!hasAccess) {
      // Vérifier si c'est une licence Basique
      if (licenseInfo.tier === 'basique') {
        return NextResponse.json({
          error: "feature_not_available_basique",
          message: "❌ L'envoi direct de PDF nécessite une licence Pro ou Pro Lifetime",
          details: `Avec la licence Basique (199€/an), vous pouvez créer des PDF mais pas les envoyer directement par email depuis l'application. Passez à Pro (359€/an) ou Pro Lifetime (599€) pour activer cette fonctionnalité.`,
          currentTier: licenseInfo.tier,
          upgradeUrl: "/admin/license/upgrade",
          featureRequired: "pdfDirectSend",
          pricing: {
            pro: "359€/an TTC",
            pro_lifetime: "599€ (paiement unique)"
          }
        }, { status: 403 });
      }
      
      // Autre cas
      return NextResponse.json({
        error: "feature_not_available",
        message: "❌ L'envoi direct de PDF nécessite une licence Pro ou Pro Lifetime",
        details: "Cette fonctionnalité n'est pas disponible avec votre type de licence actuel.",
        currentTier: licenseInfo.tier,
        upgradeUrl: "/admin/license/upgrade",
        featureRequired: "pdfDirectSend"
      }, { status: 403 });
    }
    
    return null;
  } catch (error: unknown) {
    // ⚠️ CRITIQUE: En cas d'erreur, BLOQUER l'accès par sécurité
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[License Guards] Error checking PDF direct send access - BLOCKING', { error: errorMessage });
    return NextResponse.json({
      error: "license_check_failed",
      message: "❌ Erreur lors de la vérification de la licence. L'envoi de PDF est bloqué par sécurité.",
      details: "Une erreur technique empêche la vérification de votre licence. Contactez le support si le problème persiste.",
      upgradeUrl: "/admin/license",
      featureRequired: "pdfDirectSend"
    }, { status: 403 });
  }
}

/**
 * Vérifie l'accès aux campagnes marketing
 * Retourne une réponse d'erreur si non autorisé, sinon null
 */
export async function checkMarketingAccess(): Promise<NextResponse | null> {
  try {
    const license = await getActiveLicense();
    if (!license) {
      return NextResponse.json({
        error: "license_required",
        message: "❌ Aucune licence active. Les campagnes marketing nécessitent une licence Pro ou Pro Lifetime",
        details: "Activez une licence Pro (359€/an) ou Pro Lifetime (599€) pour utiliser les campagnes marketing.",
        upgradeUrl: "/admin/license",
        featureRequired: "marketing"
      }, { status: 403 });
    }
    
    const licenseInfo = await getLicenseInfo();
    
    if (licenseInfo.status === 'expired' || licenseInfo.status === 'suspended') {
      return NextResponse.json({
        error: `license_${licenseInfo.status}`,
        message: `❌ Votre licence est ${licenseInfo.status === 'expired' ? 'expirée' : 'suspendue'}. Renouvelez pour utiliser les campagnes marketing.`,
        details: licenseInfo.status === 'expired' 
          ? "Votre période d'essai est terminée. Activez une licence Pro ou Pro Lifetime pour continuer."
          : "Cette licence est liée à une autre machine. Contactez le support.",
        upgradeUrl: "/admin/license/upgrade",
        featureRequired: "marketing"
      }, { status: 403 });
    }
    
    const hasAccess = await checkFeatureAccess('marketing');
    
    if (!hasAccess) {
      return NextResponse.json({
        error: "feature_not_available",
        message: "❌ Les campagnes marketing nécessitent une licence Pro ou Pro Lifetime",
        details: `Avec la licence ${licenseInfo.tier === 'basique' ? 'Basique (199€/an)' : licenseInfo.tier}, cette fonctionnalité n'est pas disponible. Passez à Pro (359€/an) ou Pro Lifetime (599€) pour activer les campagnes marketing.`,
        currentTier: licenseInfo.tier,
        upgradeUrl: "/admin/license/upgrade",
        featureRequired: "marketing",
        pricing: {
          pro: "359€/an TTC",
          pro_lifetime: "599€ (paiement unique)"
        }
      }, { status: 403 });
    }
    
    return null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[License Guards] Error checking marketing access', { error: errorMessage });
    return NextResponse.json({
      error: "license_check_failed",
      message: "❌ Erreur lors de la vérification de la licence. L'accès aux campagnes marketing est bloqué.",
      details: "Contactez le support si le problème persiste.",
      upgradeUrl: "/admin/license",
      featureRequired: "marketing"
    }, { status: 403 });
  }
}

/**
 * Vérifie l'accès aux statistiques avancées
 * Retourne une réponse d'erreur si non autorisé, sinon null
 */
export async function checkAdvancedStatsAccess(): Promise<NextResponse | null> {
  try {
    const license = await getActiveLicense();
    if (!license) {
      return NextResponse.json({
        error: "license_required",
        message: "❌ Aucune licence active. Les statistiques avancées nécessitent une licence Pro ou Pro Lifetime",
        details: "Activez une licence Pro (359€/an) ou Pro Lifetime (599€) pour accéder aux statistiques avancées.",
        upgradeUrl: "/admin/license",
        featureRequired: "advancedStats"
      }, { status: 403 });
    }
    
    const licenseInfo = await getLicenseInfo();
    
    if (licenseInfo.status === 'expired' || licenseInfo.status === 'suspended') {
      return NextResponse.json({
        error: `license_${licenseInfo.status}`,
        message: `❌ Votre licence est ${licenseInfo.status === 'expired' ? 'expirée' : 'suspendue'}. Renouvelez pour utiliser les statistiques avancées.`,
        details: licenseInfo.status === 'expired' 
          ? "Votre période d'essai est terminée. Activez une licence Pro ou Pro Lifetime pour continuer."
          : "Cette licence est liée à une autre machine. Contactez le support.",
        upgradeUrl: "/admin/license/upgrade",
        featureRequired: "advancedStats"
      }, { status: 403 });
    }
    
    const hasAccess = await checkFeatureAccess('advancedStats');
    
    if (!hasAccess) {
      return NextResponse.json({
        error: "feature_not_available",
        message: "❌ Les statistiques avancées nécessitent une licence Pro ou Pro Lifetime",
        details: `Avec la licence ${licenseInfo.tier === 'basique' ? 'Basique (199€/an)' : licenseInfo.tier}, cette fonctionnalité n'est pas disponible. Passez à Pro (359€/an) ou Pro Lifetime (599€) pour activer les statistiques avancées.`,
        currentTier: licenseInfo.tier,
        upgradeUrl: "/admin/license/upgrade",
        featureRequired: "advancedStats",
        pricing: {
          pro: "359€/an TTC",
          pro_lifetime: "599€ (paiement unique)"
        }
      }, { status: 403 });
    }
    
    return null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[License Guards] Error checking advanced stats access:', { error: errorMessage });
    return NextResponse.json({
      error: "license_check_failed",
      message: "❌ Erreur lors de la vérification de la licence. L'accès aux statistiques avancées est bloqué.",
      details: "Contactez le support si le problème persiste.",
      upgradeUrl: "/admin/license",
      featureRequired: "advancedStats"
    }, { status: 403 });
  }
}

/**
 * Vérifie l'accès aux réservations en ligne
 * Retourne une réponse d'erreur si non autorisé, sinon null
 */
export async function checkBookingAccess(): Promise<NextResponse | null> {
  try {
    const license = await getActiveLicense();
    if (!license) {
      return NextResponse.json({
        error: "license_required",
        message: "❌ Aucune licence active. Les réservations en ligne nécessitent une licence Pro ou Pro Lifetime",
        details: "Activez une licence Pro (359€/an) ou Pro Lifetime (599€) pour permettre à vos clients de réserver en ligne.",
        upgradeUrl: "/admin/license",
        featureRequired: "booking"
      }, { status: 403 });
    }
    
    const licenseInfo = await getLicenseInfo();
    
    if (licenseInfo.status === 'expired' || licenseInfo.status === 'suspended') {
      return NextResponse.json({
        error: `license_${licenseInfo.status}`,
        message: `❌ Votre licence est ${licenseInfo.status === 'expired' ? 'expirée' : 'suspendue'}. Renouvelez pour utiliser les réservations en ligne.`,
        details: licenseInfo.status === 'expired' 
          ? "Votre période d'essai est terminée. Activez une licence Pro ou Pro Lifetime pour continuer."
          : "Cette licence est liée à une autre machine. Contactez le support.",
        upgradeUrl: "/admin/license/upgrade",
        featureRequired: "booking"
      }, { status: 403 });
    }
    
    const hasAccess = await checkFeatureAccess('booking');
    
    if (!hasAccess) {
      return NextResponse.json({
        error: "feature_not_available",
        message: "❌ Les réservations en ligne nécessitent une licence Pro ou Pro Lifetime",
        details: `Avec la licence ${licenseInfo.tier === 'basique' ? 'Basique (199€/an)' : licenseInfo.tier}, cette fonctionnalité n'est pas disponible. Passez à Pro (359€/an) ou Pro Lifetime (599€) pour permettre à vos clients de réserver directement en ligne.`,
        currentTier: licenseInfo.tier,
        upgradeUrl: "/admin/license/upgrade",
        featureRequired: "booking",
        pricing: {
          pro: "359€/an TTC",
          pro_lifetime: "599€ (paiement unique)"
        }
      }, { status: 403 });
    }
    
    return null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[License Guards] Error checking booking access:', { error: errorMessage });
    return NextResponse.json({
      error: "license_check_failed",
      message: "❌ Erreur lors de la vérification de la licence. L'accès aux réservations en ligne est bloqué.",
      details: "Contactez le support si le problème persiste.",
      upgradeUrl: "/admin/license",
      featureRequired: "booking"
    }, { status: 403 });
  }
}

/**
 * Wrapper complet pour envoi d'email avec PDF
 * Vérifie limite emails + feature pdfDirectSend
 * Incrémente le compteur automatiquement en cas de succès
 * 
 * Usage:
 * ```ts
 * const licenseError = await checkEmailWithPdfLicense();
 * if (licenseError) return licenseError;
 * 
 * // ... envoyer email ...
 * 
 * await incrementEmailAfterSend();
 * ```
 * 
 * ⚠️ CRITIQUE: Cette fonction BLOQUE si pas de licence active
 */
export async function checkEmailWithPdfLicense(): Promise<NextResponse | null> {
  try {
    // ⚠️ CRITIQUE: Vérifier d'abord si une licence existe
    const license = await getActiveLicense();
    if (!license) {
      return NextResponse.json({
        error: "license_required",
        message: "❌ Aucune licence active. Veuillez activer une licence pour envoyer des emails avec PDF.",
        details: "Pour envoyer des factures par email, vous devez activer une licence Pro ou Pro Lifetime.",
        upgradeUrl: "/admin/license"
      }, { status: 403 });
    }
    
    // Vérifier le status de la licence
    const licenseInfo = await getLicenseInfo();
    
    if (licenseInfo.status === 'expired') {
      return NextResponse.json({
        error: "license_expired",
        message: "❌ Votre licence a expiré. Renouvelez votre licence pour envoyer des factures par email.",
        details: "Votre période d'essai et votre grace period sont terminées. Choisissez une licence Pro ou Pro Lifetime pour débloquer cette fonctionnalité.",
        upgradeUrl: "/admin/license/upgrade"
      }, { status: 403 });
    }
    
    if (licenseInfo.status === 'suspended') {
      return NextResponse.json({
        error: "license_suspended",
        message: "❌ Votre licence est suspendue. Cette licence est liée à une autre machine.",
        details: "Contactez le support si vous avez changé d'ordinateur.",
        upgradeUrl: "/admin/license"
      }, { status: 403 });
    }
    
    // Vérifier limite emails
    const emailCheck = await checkEmailLicense();
    if (emailCheck) return emailCheck;
    
    // Vérifier feature PDF direct send
    const pdfCheck = await checkPdfDirectSendAccess();
    if (pdfCheck) return pdfCheck;
    
    return null;
  } catch (error: unknown) {
    // ⚠️ CRITIQUE: En cas d'erreur, BLOQUER l'envoi par sécurité
    const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[License Guards] Error checking email+PDF license - BLOCKING:', { error: errorMessage });
    return NextResponse.json({
      error: "license_check_failed",
      message: "❌ Erreur lors de la vérification de la licence. L'envoi d'emails est bloqué par sécurité.",
      details: "Une erreur technique empêche la vérification de votre licence. Contactez le support si le problème persiste.",
      upgradeUrl: "/admin/license"
    }, { status: 403 });
  }
}

/**
 * Incrémente le compteur d'emails après envoi réussi
 * À appeler APRÈS l'envoi réussi de l'email
 */
export async function incrementEmailAfterSend(): Promise<void> {
  await incrementEmailCount();
}
