#!/usr/bin/env node
/**
 * Publie une release Electron sur Cloudflare R2 pour l'auto-update.
 *
 * Pré-requis :
 *   1. Build effectué : `npm run build:electron` (produit dist-electron/).
 *   2. Variables d'environnement R2 :
 *        R2_ACCOUNT_ID
 *        R2_ACCESS_KEY_ID
 *        R2_SECRET_ACCESS_KEY
 *        R2_BUCKET            (ex: atelier-velo-updates)
 *        R2_PUBLIC_BASE_URL   (ex: https://pub-xxx.r2.dev/)
 *
 * Upload :
 *   - dist-electron/latest.yml
 *   - dist-electron/<Atelier Velo+>-<version>-win-x64.zip (et .exe si NSIS actif)
 *   - dist-electron/<*>.blockmap si présent
 */
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'];
for (const v of required) {
  if (!process.env[v]) {
    console.error(`Manque ${v}`);
    process.exit(1);
  }
}

const distDir = path.join(process.cwd(), 'dist-electron');
if (!fs.existsSync(distDir)) {
  console.error(`Dossier ${distDir} introuvable — fais d'abord npm run build:electron`);
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const candidates = fs.readdirSync(distDir).filter((f) => {
  return /\.(yml|yaml|zip|exe|blockmap)$/i.test(f);
});

if (candidates.length === 0) {
  console.error('Aucun artefact à publier dans dist-electron/');
  process.exit(1);
}

const contentTypes = {
  '.yml': 'text/yaml',
  '.yaml': 'text/yaml',
  '.zip': 'application/zip',
  '.exe': 'application/vnd.microsoft.portable-executable',
  '.blockmap': 'application/octet-stream',
};

for (const file of candidates) {
  const full = path.join(distDir, file);
  const ext = path.extname(file).toLowerCase();
  const body = fs.readFileSync(full);
  console.log(`→ upload ${file} (${(body.length / (1024 * 1024)).toFixed(1)} Mo)`);
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: file,
    Body: body,
    ContentType: contentTypes[ext] || 'application/octet-stream',
    CacheControl: ext === '.yml' || ext === '.yaml' ? 'no-cache' : 'public, max-age=3600',
  }));
}

console.log('\n✅ Upload terminé');
if (process.env.R2_PUBLIC_BASE_URL) {
  console.log(`Feed URL à utiliser : ${process.env.R2_PUBLIC_BASE_URL}latest.yml`);
}
