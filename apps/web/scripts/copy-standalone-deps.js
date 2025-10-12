/**
 * Copy missing dependencies to Next.js standalone build
 * Fixes: styled-jsx and other peer dependencies not traced by Next.js
 */

const fs = require('fs');
const path = require('path');

const DEPS_TO_COPY = [
  'styled-jsx',
  '@swc/helpers',
  'react',
  'react-dom',
  'next'
];

const sourceRoot = path.join(__dirname, '..', 'node_modules');
const pnpmRoot = path.join(__dirname, '..', 'node_modules', '.pnpm');
const targetRoot = path.join(__dirname, '..', '.next', 'standalone', 'apps', 'web', 'node_modules');

console.log('[Copy Standalone Deps] Starting...');
console.log('[Copy Standalone Deps] Source:', sourceRoot);
console.log('[Copy Standalone Deps] PNPM Root:', pnpmRoot);
console.log('[Copy Standalone Deps] Target:', targetRoot);

if (!fs.existsSync(targetRoot)) {
  console.error('[Copy Standalone Deps] Target directory does not exist:', targetRoot);
  process.exit(1);
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[Copy Standalone Deps] Source not found: ${src}`);
    return;
  }

  const stat = fs.statSync(src);
  
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      // Skip common directories that don't need to be copied
      if (entry === '.bin' || entry === '.cache') continue;
      
      copyRecursive(
        path.join(src, entry),
        path.join(dest, entry)
      );
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

let copiedCount = 0;
let skippedCount = 0;

for (const dep of DEPS_TO_COPY) {
  const destPath = path.join(targetRoot, dep);
  
  // Check if already exists in target
  if (fs.existsSync(destPath)) {
    console.log(`[Copy Standalone Deps] Already exists, skipping: ${dep}`);
    skippedCount++;
    continue;
  }
  
  // Try standard node_modules first
  let srcPath = path.join(sourceRoot, dep);
  
  // If not found and using pnpm, search in .pnpm store
  if (!fs.existsSync(srcPath) && fs.existsSync(pnpmRoot)) {
    console.log(`[Copy Standalone Deps] Searching in pnpm store for: ${dep}`);
    const pnpmDirs = fs.readdirSync(pnpmRoot);
    
    // pnpm encodes @ and / in package names: @swc/helpers -> @swc+helpers
    const pnpmEncodedDep = dep.replace(/\//g, '+');
    const match = pnpmDirs.find(dir => dir.startsWith(`${pnpmEncodedDep}@`));
    
    if (match) {
      // pnpm structure: .pnpm/styled-jsx@5.1.x/node_modules/styled-jsx
      const pnpmPackagePath = path.join(pnpmRoot, match, 'node_modules', dep);
      if (fs.existsSync(pnpmPackagePath)) {
        srcPath = pnpmPackagePath;
        console.log(`[Copy Standalone Deps] Found in pnpm: ${match}`);
      }
    }
  }
  
  if (!fs.existsSync(srcPath)) {
    console.warn(`[Copy Standalone Deps] Dependency not found: ${dep}`);
    skippedCount++;
    continue;
  }
  
  console.log(`[Copy Standalone Deps] Copying: ${dep}`);
  console.log(`[Copy Standalone Deps]   From: ${srcPath}`);
  console.log(`[Copy Standalone Deps]   To: ${destPath}`);
  
  try {
    copyRecursive(srcPath, destPath);
    copiedCount++;
    console.log(`[Copy Standalone Deps] ✓ Copied: ${dep}`);
  } catch (err) {
    console.error(`[Copy Standalone Deps] ✗ Failed to copy ${dep}:`, err.message);
  }
}

console.log(`[Copy Standalone Deps] Done. Copied: ${copiedCount}, Skipped: ${skippedCount}`);
