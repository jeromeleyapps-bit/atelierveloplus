/**
 * Système d'Activation/Licence - Atelier Vélo+
 * 
 * Protection anti-copie basée sur hardware fingerprint
 * Solution offline-first (pas de serveur requis)
 * 
 * Architecture:
 * - hw-fingerprint: Génère ID unique basé sur hardware machine
 * - Clés d'activation: Format XXXX-XXXX-XXXX-XXXX (HMAC SHA-256)
 * - Stockage: DB SQLite locale (table appSettings)
 * - Validation: Au démarrage + périodique
 */

const crypto = require('crypto');

/**
 * Obtenir l'ID machine unique basé sur hardware
 * @returns {string} Machine ID (128 chars hex)
 */
function getMachineId() {
  try {
    const { getFingerprint } = require('hw-fingerprint');
    return getFingerprint().toString('hex');
  } catch (error) {
    console.error('[LICENSE] hw-fingerprint non disponible:', error);
    // Fallback: utiliser node-machine-id si hw-fingerprint échoue
    try {
      const { machineIdSync } = require('node-machine-id');
      return machineIdSync({ original: true });
    } catch (_fallbackError) {
      throw new Error('Impossible de générer Machine ID');
    }
  }
}

/**
 * Générer une clé d'activation pour une machine spécifique
 * ATTENTION: Cette fonction doit UNIQUEMENT être utilisée côté développeur
 * Le secret ACTIVATION_SECRET ne doit JAMAIS être dans le code client
 * 
 * @param {string} machineId - ID machine obtenu via getMachineId()
 * @param {number} days - Nombre de jours de validité (défaut: 90)
 * @returns {string} Clé d'activation format XXXX-XXXX-XXXX-XXXX
 */
function generateActivationKey(machineId, days = 90) {
  if (!process.env.ACTIVATION_SECRET) {
    throw new Error('ACTIVATION_SECRET non défini');
  }
  
  const expiry = Date.now() + (days * 24 * 60 * 60 * 1000);
  const data = `${machineId}-${expiry}`;
  const secret = process.env.ACTIVATION_SECRET;
  
  // Signature HMAC-SHA256
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex')
    .substring(0, 16); // 16 premiers chars
  
  // Format clé: PREFIX-EXPIRY-SIG1-SIG2
  // Prefix: 4 premiers chars machine ID (vérification rapide)
  // Expiry: Timestamp en base36 (compact)
  // Signature: Split en 2 parties de 4 chars
  const key = [
    machineId.substring(0, 4).toUpperCase(),
    expiry.toString(36).toUpperCase(),
    signature.substring(0, 4).toUpperCase(),
    signature.substring(4, 8).toUpperCase()
  ].join('-');
  
  return key;
}

/**
 * Valider une clé d'activation
 * @param {string} key - Clé format XXXX-XXXX-XXXX-XXXX
 * @param {string} currentMachineId - ID machine actuel
 * @returns {Object} { valid: boolean, reason?: string, expiresAt?: Date, daysRemaining?: number }
 */
function validateActivationKey(key, currentMachineId) {
  try {
    // Vérifier format
    if (!key || typeof key !== 'string') {
      return { valid: false, reason: 'Clé invalide (format incorrect)' };
    }
    
    const parts = key.toUpperCase().split('-');
    if (parts.length !== 4) {
      return { valid: false, reason: 'Clé invalide (format incorrect)' };
    }
    
    const [machinePrefix, expiryBase36, sig1, sig2] = parts;
    
    // Vérifier machine ID
    if (!currentMachineId.toUpperCase().startsWith(machinePrefix)) {
      return { valid: false, reason: 'Cette clé n\'est pas valide pour cette machine' };
    }
    
    // Décoder expiration
    let expiry;
    try {
      expiry = parseInt(expiryBase36, 36);
      if (isNaN(expiry)) {
        return { valid: false, reason: 'Clé invalide (expiration corrompue)' };
      }
    } catch (_e) {
      return { valid: false, reason: 'Clé invalide (expiration illisible)' };
    }
    
    // Vérifier expiration
    const now = Date.now();
    if (now > expiry) {
      const expiredDate = new Date(expiry).toLocaleDateString('fr-FR');
      return { valid: false, reason: `Licence expirée le ${expiredDate}` };
    }
    
    // Vérifier signature HMAC
    if (!process.env.ACTIVATION_SECRET) {
      // En mode client, on ne peut pas vérifier la signature
      // On fait confiance à la clé si machine + expiration OK
      console.warn('[LICENSE] ACTIVATION_SECRET absent, validation partielle');
      
      return {
        valid: true,
        expiresAt: new Date(expiry),
        daysRemaining: Math.floor((expiry - now) / (24 * 60 * 60 * 1000)),
        warning: 'Signature non vérifiable'
      };
    }
    
    const secret = process.env.ACTIVATION_SECRET;
    const data = `${currentMachineId}-${expiry}`;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex')
      .substring(0, 16)
      .toUpperCase();
    
    const providedSignature = (sig1 + sig2).toUpperCase();
    
    if (computedSignature !== providedSignature) {
      return { valid: false, reason: 'Signature invalide (clé falsifiée)' };
    }
    
    // Validation complète réussie
    return {
      valid: true,
      expiresAt: new Date(expiry),
      daysRemaining: Math.floor((expiry - now) / (24 * 60 * 60 * 1000))
    };
    
  } catch (error) {
    console.error('[LICENSE] Erreur validation:', error);
    return { valid: false, reason: `Erreur technique: ${error.message}` };
  }
}

/**
 * Obtenir le statut d'activation depuis la DB
 * @param {PrismaClient} prisma - Instance Prisma
 * @returns {Promise<Object>} Status activation
 */
async function getActivationStatus(prisma) {
  try {
    const machineId = getMachineId();
    
    // Vérifier si activation existe
    const storedKey = await prisma.appSettings.findUnique({
      where: { key: 'activation_key' }
    });
    
    const storedMachineId = await prisma.appSettings.findUnique({
      where: { key: 'machine_id' }
    });
    
    if (!storedKey) {
      return {
        activated: false,
        machineId,
        reason: 'Première utilisation - Activation requise'
      };
    }
    
    // Vérifier si machine a changé
    if (storedMachineId && storedMachineId.value !== machineId) {
      return {
        activated: false,
        machineId,
        oldMachineId: storedMachineId.value,
        reason: 'Hardware modifié - Réactivation requise'
      };
    }
    
    // Valider la clé
    const validation = validateActivationKey(storedKey.value, machineId);
    
    if (!validation.valid) {
      return {
        activated: false,
        machineId,
        reason: validation.reason
      };
    }
    
    return {
      activated: true,
      machineId,
      key: storedKey.value,
      expiresAt: validation.expiresAt,
      daysRemaining: validation.daysRemaining,
      warning: validation.warning
    };
    
  } catch (error) {
    console.error('[LICENSE] Erreur getActivationStatus:', error);
    return {
      activated: false,
      machineId: null,
      reason: `Erreur technique: ${error.message}`
    };
  }
}

/**
 * Sauvegarder une activation dans la DB
 * @param {PrismaClient} prisma - Instance Prisma
 * @param {string} activationKey - Clé d'activation validée
 * @returns {Promise<boolean>} Succès
 */
async function saveActivation(prisma, activationKey) {
  try {
    const machineId = getMachineId();
    
    // Valider avant de sauvegarder
    const validation = validateActivationKey(activationKey, machineId);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }
    
    // Sauvegarder clé
    await prisma.appSettings.upsert({
      where: { key: 'activation_key' },
      update: { value: activationKey },
      create: { key: 'activation_key', value: activationKey }
    });
    
    // Sauvegarder machine ID
    await prisma.appSettings.upsert({
      where: { key: 'machine_id' },
      update: { value: machineId },
      create: { key: 'machine_id', value: machineId }
    });
    
    // Sauvegarder date activation
    await prisma.appSettings.upsert({
      where: { key: 'activation_date' },
      update: { value: new Date().toISOString() },
      create: { key: 'activation_date', value: new Date().toISOString() }
    });
    
    console.log('[LICENSE] Activation sauvegardée avec succès');
    return true;
    
  } catch (error) {
    console.error('[LICENSE] Erreur saveActivation:', error);
    throw error;
  }
}

module.exports = {
  getMachineId,
  generateActivationKey,
  validateActivationKey,
  getActivationStatus,
  saveActivation
};
