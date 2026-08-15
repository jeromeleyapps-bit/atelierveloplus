/**
 * @jest-environment node
 *
 * Compatibilité des mots de passe existants.
 *
 * bcryptjs 3 génère des empreintes « 2b » là où la version 2 produisait des « 2a ».
 * Les comptes créés avant la montée de version portent donc des empreintes 2a en base.
 * Si une évolution de la bibliothèque cassait leur vérification, plus personne ne
 * pourrait se connecter — sans erreur visible ailleurs qu'à l'écran de connexion.
 *
 * Ce test fige cette garantie avec une empreinte réellement produite par bcryptjs 2.4.3.
 */

import bcrypt from 'bcryptjs';

// Produite par bcryptjs 2.4.3 pour le mot de passe ci-dessous (facteur de coût 10).
const EMPREINTE_2A = '$2a$10$f12OAoNrv7NZRUvPLntpJ.Vn2p667gn3ESDvESt19a0vX4xLtV.3W';
const MOT_DE_PASSE = 'MotDePasseAtelier2026!';

describe('compatibilité des empreintes de mots de passe', () => {
  it('vérifie une empreinte 2a produite par bcryptjs 2.x', async () => {
    await expect(bcrypt.compare(MOT_DE_PASSE, EMPREINTE_2A)).resolves.toBe(true);
  });

  it('rejette un mauvais mot de passe sur une empreinte 2a', async () => {
    await expect(bcrypt.compare('mauvais', EMPREINTE_2A)).resolves.toBe(false);
  });

  it('produit désormais des empreintes 2b, elles aussi vérifiables', async () => {
    const empreinte = await bcrypt.hash(MOT_DE_PASSE, 10);
    expect(empreinte.startsWith('$2b$')).toBe(true);
    await expect(bcrypt.compare(MOT_DE_PASSE, empreinte)).resolves.toBe(true);
    await expect(bcrypt.compare('mauvais', empreinte)).resolves.toBe(false);
  });
});
