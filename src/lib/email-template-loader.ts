/**
 * Email Template Loader - Phase 2.1 Grace Period
 * 
 * Charge et remplit les templates HTML emails grace period
 * Templates: trial-ended-grace-start, grace-special-offer, grace-last-chance
 */

import fs from 'fs';
import path from 'path';

interface TemplateVariables {
  customerName?: string;
  customerEmail?: string;
  gracePeriodEndsAt?: string;
  daysRemaining?: number;
  upgradeUrl?: string;
  year?: number;
  [key: string]: unknown;
}

/**
 * Charge un template HTML depuis le dossier email-templates
 */
export function loadTemplate(templateName: string): string {
  const templatePath = path.join(
    process.cwd(),
    'src',
    'lib',
    'email-templates',
    `${templateName}.html`
  );

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Email template not found: ${templateName}`);
  }

  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Remplace les variables {{variable}} dans le template
 */
export function fillTemplate(template: string, variables: TemplateVariables): string {
  let filled = template;

  // Ajouter automatiquement l'année si non fournie
  if (!variables.year) {
    variables.year = new Date().getFullYear();
  }

  // Remplacer toutes les variables {{...}}
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    const value = variables[key];
    
    // Convertir la valeur en string, gérer null/undefined
    const stringValue = value !== null && value !== undefined ? String(value) : '';
    
    filled = filled.replace(regex, stringValue);
  });

  return filled;
}

/**
 * Charge et remplit un template en une seule opération
 */
export function renderEmailTemplate(
  templateName: string,
  variables: TemplateVariables
): string {
  const template = loadTemplate(templateName);
  return fillTemplate(template, variables);
}

/**
 * Helper: Formate une date pour affichage email
 */
export function formatDateForEmail(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Templates disponibles
 */
export const TEMPLATES = {
  TRIAL_ENDED: 'trial-ended-grace-start',
  GRACE_OFFER: 'grace-special-offer',
  LAST_CHANCE: 'grace-last-chance',
} as const;
