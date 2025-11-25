/**
 * init-database.js
 * Initialise la base de données SQLite au premier lancement Electron
 * Exécute le schéma SQL directement (pas de migrations CLI)
 */

const fs = require('fs');
const path = require('path');

/**
 * SUPPRIMÉ - loadPrismaClient() n'est plus nécessaire
 * 
 * FIX PC2 FINAL: Pattern IPC Handlers (florianbepunkt/electron-prisma)
 * PrismaClient est maintenant instancié dans electron/main.js et passé en paramètre
 * Cela évite le problème de module resolution depuis app.asar
 * 
 * Voir: https://github.com/florianbepunkt/electron-prisma
 */

/**
 * Vérifie si la DB existe et est valide
 * Pattern validé: awohletz/electron-prisma-trpc-example (2022)
 * Vérifie que tables Prisma existent (pas juste taille fichier)
 * 
 * @param {string} dbPath - Chemin vers la DB
 * @param {Object} prismaClient - Instance PrismaClient (optionnel)
 * @returns {Promise<boolean>} - true si DB valide avec tables
 */
async function isDatabaseValid(dbPath, prismaClient = null) {
  if (!fs.existsSync(dbPath)) {
    return false;
  }
  
  // Vérifier que le fichier n'est pas vide
  const stats = fs.statSync(dbPath);
  if (stats.size < 1024) { // DB SQLite minimum ~4KB
    return false;
  }
  
  // Vérifier que tables Prisma existent
  // Pattern awohletz: Query _prisma_migrations pour détection DB corrompue/vierge
  if (prismaClient) {
    try {
      // Tester si table _prisma_migrations existe
      await prismaClient.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'`;
      return true; // Tables existent → DB valide
    } catch (_error) {
      // Erreur query → DB corrompue ou tables absentes
      return false;
    }
  }
  
  // Fallback: Si pas de Prisma client, considérer valide (ancien comportement)
  return true;
}

/**
 * Applique le schéma SQL à la base de données
 * Utilise SQL direct au lieu de migrations CLI Prisma
 * 
 * @param {string} dbPath - Chemin vers la base de données
 * @param {boolean} isDev - Mode développement
 * @param {Object} log - Logger
 * @param {Object} prismaClient - Instance PrismaClient fournie par main.js
 */
async function applySchema(dbPath, isDev, log, prismaClient) {
  log.info('[DB] Application du schéma SQL...');
  
  // Localiser schema.sql
  const schemaPath = isDev
    ? path.join(process.cwd(), 'electron-resources', 'schema.sql')
    : path.join(process.resourcesPath, 'schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Fichier schema.sql introuvable: ${schemaPath}`);
  }
  
  // Lire SQL
  const sql = fs.readFileSync(schemaPath, 'utf8');
  log.info(`[DB] SQL chargé (${sql.length} chars)`);
  
  // Utiliser PrismaClient fourni par main.js (déjà connecté au bon dbPath)
  const prisma = prismaClient;
  
  try {
    // FIX 12/11/2025: Nettoyer SQL de TOUTE pollution stdout (dotenv, npm, etc.)
    // Pattern défensif: Supprimer TOUT avant premier "-- CreateTable"
    // Cause: schema.sql peut contenir logs dotenv en première ligne
    // Référence: GitHub prisma/prisma #10649
    let cleanedSql = sql;
    
    // Trouver le premier "-- CreateTable" ou "CREATE TABLE"
    const firstCreateIndex = Math.min(
      sql.indexOf('-- CreateTable') !== -1 ? sql.indexOf('-- CreateTable') : Infinity,
      sql.indexOf('CREATE TABLE') !== -1 ? sql.indexOf('CREATE TABLE') : Infinity
    );
    
    if (firstCreateIndex > 0 && firstCreateIndex !== Infinity) {
      // Supprimer tout avant le premier CREATE
      cleanedSql = sql.substring(firstCreateIndex);
      log.info(`[DB] Pollution détectée et supprimée (${sql.length} → ${cleanedSql.length} chars)`);
    }
    
    log.info(`[DB] SQL nettoyé - ${cleanedSql.length} chars`);
    
    // Exécuter le schéma complet
    // Prisma Client nécessite d'exécuter chaque statement séparément
    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        // Ignorer lignes vides
        if (s.length === 0) return false;
        
        // FIX 13/11/2025: NE PAS filtrer statements avec commentaires si contiennent CREATE
        // Bug: Les statements Prisma ont format "-- CreateTable\nCREATE TABLE..."
        // Le filtre ^-- éliminait TOUS les CREATE TABLE!
        // Solution: Garder SEULEMENT statements avec mots-clés SQL valides
        if (!s.match(/CREATE|INSERT|ALTER|Pragma/i)) {
          // Pas de mot-clé SQL → commentaire pur ou vide
          return false;
        }
        
        // Ignorer PRAGMA standalone sans CREATE (non-standard)
        if (s.match(/^Pragma\s+writable_schema/i)) return false;
        
        return true;
      })
    
    log.info(`[DB] Exécution de ${statements.length} statements SQL...`);
    
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }
    
    // Créer table de versioning si pas existe
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS _schema_version (
        version INTEGER PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Marquer version initiale
    await prisma.$executeRawUnsafe(`INSERT OR IGNORE INTO _schema_version (version) VALUES (1)`);
    
    // Note: Ne pas déconnecter prisma ici, géré par main.js
    log.info('[DB] ✅ Schéma appliqué avec succès');
    return true;
  } catch (err) {
    log.error('[DB] ❌ Erreur application schéma:', err.message);
    throw err;
  }
}

/**
 * Initialise la base de données
 * 
 * @param {string} dbPath - Chemin vers la base de données
 * @param {boolean} isDev - Mode développement
 * @param {Object} log - Logger
 * @param {Object} prismaClient - Instance PrismaClient fournie par main.js
 */
async function initDatabase(dbPath, isDev, log, prismaClient) {
  try {
    log.info('[DB] Initialisation base de données...');
    log.info('[DB] Chemin:', dbPath);
    
    // Créer le dossier si nécessaire
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      log.info('[DB] Création dossier:', dbDir);
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Vérifier si la DB existe déjà ET si tables valides
    // Pattern awohletz: Vérifier _prisma_migrations pour détecter DB corrompue
    const isValid = await isDatabaseValid(dbPath, prismaClient);
    if (isValid) {
      log.info('[DB] Base de données existante détectée avec tables valides');
      // TODO: Future - vérifier version et appliquer migrations si nécessaire
      return true;
    }
    
    log.info('[DB] Nouvelle base de données - création...');
    
    // Appliquer schéma SQL
    await applySchema(dbPath, isDev, log, prismaClient);
    
    log.info('[DB] ✅ Initialisation terminée');
    return true;
    
  } catch (error) {
    log.error('[DB] ❌ Erreur initialisation:', error);
    throw error;
  }
}

module.exports = {
  initDatabase,
  isDatabaseValid,
};
