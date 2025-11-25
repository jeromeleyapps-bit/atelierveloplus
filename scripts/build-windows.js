const shell = require('shelljs');
const fs = require('fs-extra');
const path = require('path');

// Configuration
const BUILD_DIR = 'dist-electron';
const NEXT_OUT = '.next';
const ELECTRON_RESOURCES = 'electron-resources/web';

console.log('🚀 Démarrage du build Windows optimisé...');

// 1. Nettoyage
console.log('🧹 Nettoyage des anciens fichiers...');
shell.rm('-rf', BUILD_DIR);
shell.rm('-rf', ELECTRON_RESOURCES);

// 2. Build Next.js
console.log('🏗️ Build Next.js...');
// On utilise cross-env pour s'assurer que l'environnement est correct si besoin, mais npm run build suffit souvent
if (shell.exec('npm run build').code !== 0) {
    console.error('❌ Erreur lors du build Next.js');
    process.exit(1);
}

// 3. Préparation des ressources Electron
console.log('📦 Préparation des ressources Electron...');
fs.ensureDirSync(ELECTRON_RESOURCES);

// Copie du build Next.js
if (fs.existsSync(path.join(NEXT_OUT, 'standalone'))) {
    console.log('   - Mode standalone détecté. Copie optimisée...');
    fs.copySync(path.join(NEXT_OUT, 'standalone'), ELECTRON_RESOURCES);
    fs.copySync(path.join(NEXT_OUT, 'static'), path.join(ELECTRON_RESOURCES, '.next/static'));
    fs.copySync('public', path.join(ELECTRON_RESOURCES, 'public'));
} else {
    console.log('   - Mode standard détecté. Copie complète de .next...');
    fs.copySync(NEXT_OUT, path.join(ELECTRON_RESOURCES, '.next'));
    fs.copySync('public', path.join(ELECTRON_RESOURCES, 'public'));
}

// Copie des autres fichiers nécessaires
console.log('   - Copie des fichiers de configuration et Prisma...');
fs.copySync('prisma', path.join(ELECTRON_RESOURCES, 'prisma'));

// Gestion du fichier .env
if (fs.existsSync('.env.production')) {
    fs.copySync('.env.production', path.join(ELECTRON_RESOURCES, '.env.production'));
    console.log('   - .env.production copié');
} else if (fs.existsSync('.env')) {
    fs.copySync('.env', path.join(ELECTRON_RESOURCES, '.env'));
    console.log('   - .env copié (fallback)');
} else {
    console.warn('⚠️ Aucun fichier .env trouvé !');
}

// Copie du package.json pour la prod
console.log('   - Génération du package.json pour la production...');
const packageJson = fs.readJsonSync('package.json');
// On peut nettoyer les devDependencies si on veut, mais ce n'est pas strictement nécessaire pour le build electron-builder qui utilise ses propres règles "files".
// Cependant, pour le dossier "app" final, c'est mieux d'avoir un package.json propre.
// Ici, on copie tel quel car electron-builder va l'utiliser pour lire les métadonnées.
fs.writeJsonSync(path.join(ELECTRON_RESOURCES, 'package.json'), packageJson, { spaces: 2 });


// 4. Build Electron
console.log('🚀 Packaging Electron avec electron-builder...');
// On utilise npx pour être sûr d'utiliser la version locale
if (shell.exec('npx electron-builder --config electron-builder.config.yml').code !== 0) {
    console.error('❌ Erreur lors du packaging Electron');
    process.exit(1);
}

console.log('✅ Build terminé avec succès ! L\'installateur est dans dist-electron.');
