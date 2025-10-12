const fs = require('fs-extra');
const path = require('path');

exports.default = async function(context) {
  const appOutDir = context.appOutDir;
  const webResourcesPath = path.join(appOutDir, 'resources', 'web');
  const nodeModulesSource = path.join(__dirname, '..', 'web', '.next', 'standalone', 'node_modules');
  const nodeModulesDest = path.join(webResourcesPath, 'node_modules');
  
  console.log('[AfterPack] Copying node_modules...');
  console.log('[AfterPack] From:', nodeModulesSource);
  console.log('[AfterPack] To:', nodeModulesDest);
  
  if (fs.existsSync(nodeModulesSource)) {
    await fs.copy(nodeModulesSource, nodeModulesDest, {
      dereference: true,
      filter: (src) => {
        // Ignorer les fichiers de cache
        return !src.includes('.cache');
      }
    });
    console.log('[AfterPack] node_modules copied successfully');
  } else {
    console.error('[AfterPack] node_modules source not found!');
  }
};
