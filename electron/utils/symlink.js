/**
 * Symlink Management - node_modules ↔ npm_modules
 * 
 * CAUSE: electron-builder renomme node_modules → npm_modules (workaround bug)
 * Prisma requiert node_modules/ pour résolution modules (@prisma/client → .prisma/client)
 * 
 * SOLUTION: Symlink relatif (optimal, 0 overhead) OU copie physique (fallback +220MB)
 * 
 * HISTORIQUE:
 * - Phase 1 (10 nov 2025): Migration fs natif → fs-extra + fallback + dialogues
 * - Commit: 1d39134
 */

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const { dialog } = require('electron');

/**
 * Crée symlink node_modules → npm_modules avec fallback copie physique
 * 
 * @param {string} webPath - Chemin vers resources/web
 * @param {Object} logger - Logger optionnel (console par défaut)
 * @returns {boolean} - true si succès (symlink OU copie), false si échec critique
 * 
 * @example
 * const success = ensureNodeModulesSymlink('/path/to/web');
 * if (!success) {
 *   // Échec critique - app ne peut pas démarrer
 * }
 */
function ensureNodeModulesSymlink(webPath, logger = console) {
  const nmPath = path.join(webPath, 'node_modules');
  const npmPath = path.join(webPath, 'npm_modules');
  
  // ===== VÉRIFICATION PRÉ-REQUIS =====
  // CAUSE: Build corrompu si npm_modules absent
  // CONSÉQUENCE: Prisma ne peut pas charger → Crash application
  if (!fs.existsSync(npmPath)) {
    logger.error('[SYMLINK] ❌ npm_modules introuvable:', npmPath);
    logger.error('[SYMLINK] Build corrompu - Prisma ne fonctionnera pas');
    
    // FEEDBACK UTILISATEUR: Dialogue clair avec action recommandée
    dialog.showErrorBox(
      'Erreur Configuration',
      'Le dossier npm_modules est manquant.\n\n' +
      'Le build de l\'application est corrompu.\n' +
      'Veuillez réinstaller l\'application.'
    );
    
    return false; // Échec critique - Pas de solution
  }
  
  // CAUSE: node_modules existe déjà (symlink ou copie précédente)
  // CONSÉQUENCE: Pas besoin de recréer (optimisation)
  if (fs.existsSync(nmPath)) {
    logger.log('[SYMLINK] ℹ️  node_modules existe déjà');
    return true; // Succès - Déjà configuré
  }
  
  // ===== TENTATIVE 1: SYMLINK RELATIF =====
  // AVANTAGES: 0 overhead, portable, standard Windows junction
  // CAUSE ÉCHEC POTENTIEL: Permissions Program Files, NTFS readonly
  try {
    // ✅ fs-extra.ensureSymlinkSync: Auto-création dossiers parents + retry
    // CRITIQUE: Chemin relatif 'npm_modules' (pas absolu npmPath)
    // RAISON: Portabilité (symlink fonctionne si app déplacée)
    fse.ensureSymlinkSync('npm_modules', nmPath, 'junction');
    logger.log('[SYMLINK] ✅ Symlink créé avec succès (fs-extra, relatif)');
    return true; // Succès optimal
    
  } catch (symlinkErr) {
    // CAUSE: Permissions insuffisantes (Program Files) OU NTFS readonly
    logger.error('[SYMLINK] ❌ Échec symlink:', symlinkErr.code, symlinkErr.message);
    logger.warn('[SYMLINK] ⚠️  FALLBACK: Tentative copie physique...');
    
    // ===== TENTATIVE 2: COPIE PHYSIQUE =====
    // DÉSAVANTAGES: +220MB disque, +10s temps copie
    // AVANTAGES: 100% fiable, fonctionne TOUJOURS
    try {
      // ✅ fs-extra.copySync: Copie récursive robuste avec retry automatique
      // OPTIONS:
      // - overwrite: false (ne pas écraser si existe par miracle)
      // - errorOnExist: false (pas d'erreur si existe)
      // - dereference: true (suivre symlinks sources si présents)
      fse.copySync(npmPath, nmPath, {
        overwrite: false,
        errorOnExist: false,
        dereference: true
      });
      
      logger.log('[SYMLINK] ✅ Copie physique réussie (~220MB)');
      logger.warn('[SYMLINK] ⚠️  Note: Build plus volumineux mais stable');
      return true; // Succès fallback
      
    } catch (copyErr) {
      // CAUSE: Disque plein, permissions système, corruption filesystem
      // CONSÉQUENCE: Application INUTILISABLE
      logger.error('[SYMLINK] ❌❌ FALLBACK échoué:', copyErr.message);
      logger.error('[SYMLINK] Stack:', copyErr.stack);
      logger.error('[SYMLINK] ❌❌ CRITIQUE: Prisma ne fonctionnera pas!');
      
      // FEEDBACK UTILISATEUR: Dialogue détaillé avec contexte technique
      dialog.showErrorBox(
        'Erreur Critique',
        'Impossible de configurer Prisma Client.\n\n' +
        'Erreur technique:\n' + copyErr.message + '\n\n' +
        'L\'application ne peut pas démarrer correctement.\n' +
        'Veuillez contacter le support technique.'
      );
      
      return false; // Échec total
    }
  }
}

module.exports = {
  ensureNodeModulesSymlink
};
