const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');

exports.default = async function(context) {
  const webPath = path.join(context.appOutDir, 'resources', 'web');
  const sourceNodeModules = path.join(__dirname, '../web/node_modules');
  const targetNodeModules = path.join(webPath, 'node_modules');
  
  console.log('[afterPack] Copying node_modules from web...');
  console.log('[afterPack] Source:', sourceNodeModules);
  console.log('[afterPack] Target:', targetNodeModules);
  
  if (fs.existsSync(webPath) && fs.existsSync(sourceNodeModules)) {
    try {
      // Copier node_modules (plus rapide que npm install)
      console.log('[afterPack] This may take a few minutes...');
      fse.copySync(sourceNodeModules, targetNodeModules, {
        dereference: true, // Résout les symlinks
        filter: (src) => {
          // Ignorer les fichiers inutiles
          return !src.includes('.cache') && !src.includes('.bin');
        }
      });
      
      console.log('[afterPack] node_modules copied successfully!');
      
      // Générer le client Prisma
      console.log('[afterPack] Generating Prisma client...');
      execSync('npx prisma generate', {
        cwd: webPath,
        stdio: 'inherit'
      });
      
      console.log('[afterPack] Build complete!');
    } catch (error) {
      console.error('[afterPack] Failed:', error.message);
    }
  } else {
    console.warn('[afterPack] Path not found');
  }
};
