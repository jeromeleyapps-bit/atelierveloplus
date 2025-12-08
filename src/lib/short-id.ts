/**
 * Système d'IDs courts et lisibles
 * Format: PREFIX-XXXX (ex: CLI-A3F2, TIC-B7D1, FAC-C9E4)
 * Utilise les 4 derniers caractères hex de l'UUID pour unicité
 */

export type IDPrefix = 
  | 'CLI' // Client
  | 'TIC' // Ticket  
  | 'FAC' // Facture
  | 'DEV' // Devis
  | 'VEL' // Vélo
  | 'USR' // Utilisateur
  | 'FOU' // Fournisseur
  | 'CAT' // Catalogue
  | 'RDV' // Rendez-vous
  | 'CAI'; // Caisse

/**
 * Génère un ID court à partir d'un UUID
 * Utilise les 4 derniers caractères hex de l'UUID (plus compact et unique)
 */
export function generateShortId(prefix: IDPrefix, uuid: string): string {
  // Extraire les 4 derniers caractères hex (sans tirets)
  const cleanUuid = uuid.replace(/-/g, '');
  const last4 = cleanUuid.slice(-4).toUpperCase();
  
  return `${prefix}-${last4}`;
}

/**
 * Génère un ID court séquentiel
 * À utiliser avec un compteur en DB
 */
export function formatShortId(prefix: IDPrefix, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Extrait le préfixe d'un ID court
 */
export function extractPrefix(shortId: string): IDPrefix | null {
  const match = shortId.match(/^([A-Z]{3})-\d{4}$/);
  return match ? (match[1] as IDPrefix) : null;
}

/**
 * Valide un ID court
 */
export function isValidShortId(shortId: string): boolean {
  return /^[A-Z]{3}-\d{4}$/.test(shortId);
}
