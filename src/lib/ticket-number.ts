/**
 * Utilitaires pour le formatage des numéros de tickets
 */

/**
 * Formate un numéro de ticket professionnel
 * Format: TKT-YYYY-NNNN (ex: TKT-2025-0001)
 * 
 * @param ticketId - ID technique du ticket (ex: "cmi9due620001ecjkxpgxran6")
 * @param createdAt - Date de création du ticket
 * @returns Numéro de ticket formaté (ex: "TKT-2025-0077")
 */
export function formatTicketNumber(ticketId: string, createdAt: string | Date): string {
  // Préfixe TKT pour Ticket
  const prefix = 'TKT';
  
  // Année de création
  const year = new Date(createdAt).getFullYear();
  
  // Extraire hash court de l'ID pour numéro unique (4 derniers car alphanum)
  const hash = ticketId.slice(-8).toUpperCase();
  
  // Convertir en nombre pour format 0001, 0002, etc.
  const numericPart = parseInt(hash, 36) % 10000;
  const formattedNum = String(numericPart).padStart(4, '0');
  
  return `${prefix}-${year}-${formattedNum}`;
}

/**
 * Formate un numéro de ticket court (sans année)
 * Format: TKT-NNNN (ex: TKT-0077)
 * 
 * @param ticketId - ID technique du ticket
 * @returns Numéro de ticket court
 */
export function formatTicketNumberShort(ticketId: string): string {
  const hash = ticketId.slice(-8).toUpperCase();
  const numericPart = parseInt(hash, 36) % 10000;
  const formattedNum = String(numericPart).padStart(4, '0');
  return `TKT-${formattedNum}`;
}

/**
 * Formate un numéro de client professionnel
 * Format: CLT-NNNN (ex: CLT-0042)
 * 
 * @param customerId - ID technique du client
 * @returns Numéro de client formaté
 */
export function formatCustomerNumber(customerId: string): string {
  const hash = customerId.slice(-8).toUpperCase();
  const numericPart = parseInt(hash, 36) % 10000;
  const formattedNum = String(numericPart).padStart(4, '0');
  return `CLT-${formattedNum}`;
}

