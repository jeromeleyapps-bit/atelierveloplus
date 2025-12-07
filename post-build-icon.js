/**
 * Post-Build Icon Integration
 * Utilise rcedit pour intégrer l'icône dans l'exe Windows
 * Car signAndEditExecutable: false est nécessaire pour éviter ENAMETOOLONG
 */

const rcedit = require('rcedit');
const path = require('path');
const fs = require('fs');

const exePath = path.join(__dirname, 'dist-electron', 'win-unpacked', 'Atelier Velo+.exe');
const iconPath = path.join(__dirname, 'resources', 'icon.ico');

console.log('🎨 Intégration icône post-build...');
console.log(`   Exe: ${exePath}`);
console.log(`   Icône: ${iconPath}`);

// Vérifier que les fichiers existent
if (!fs.existsSync(exePath)) {
  console.error('❌ Exécutable non trouvé:', exePath);
  process.exit(1);
}

if (!fs.existsSync(iconPath)) {
  console.error('❌ Icône non trouvée:', iconPath);
  process.exit(1);
}

// Lire package.json pour les métadonnées
const pkg = require('./package.json');

rcedit(exePath, {
  icon: iconPath,
  'version-string': {
    ProductName: 'Atelier Vélo+',
    FileDescription: 'Atelier Vélo+ - Gestion Atelier Vélo',
    CompanyName: 'Upgraded Bikes',
    LegalCopyright: '© 2025 Jérôme Leyssard - Upgraded Bikes',
    OriginalFilename: 'Atelier Velo+.exe',
  },
  'file-version': pkg.version,
  'product-version': pkg.version,
})
  .then(() => {
    console.log('✅ Icône intégrée avec succès!');
    console.log(`   Version: ${pkg.version}`);
  })
  .catch((err) => {
    console.error('❌ Erreur intégration icône:', err);
    process.exit(1);
  });
