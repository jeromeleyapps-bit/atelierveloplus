#!/usr/bin/env node
/**
 * Uploade l'installateur Atelier Vélo+ sur le bucket R2 « downloads » via l'API S3.
 *
 * Pourquoi un script S3 et pas le dashboard / wrangler :
 *   - dashboard web R2 et `wrangler r2 object put` plafonnent à ~315 Mo.
 *   - notre installateur fait ~396 Mo → on passe par l'API S3 (single PUT jusqu'à 5 Go).
 *
 * Pré-requis (variables d'environnement) :
 *   R2_ACCOUNT_ID         (compte Cloudflare qui héberge le bucket downloads)
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_DOWNLOADS_BUCKET   (défaut: atelier-velo-downloads)
 *
 * Usage :
 *   node scripts/publish-installer-r2.mjs [chemin-vers-exe] [nom-objet-cible]
 *   Défaut source  : dist-electron/Atelier Velo+-<version>-win-x64.exe (auto-détecté)
 *   Défaut cible   : AtelierVeloPlus-Setup.exe
 *
 * Après upload, le fichier est servi à :
 *   https://downloads.upgradedbikes.com/AtelierVeloPlus-Setup.exe
 *   (une fois le custom domain configuré sur le bucket).
 */
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
for (const v of required) {
  if (!process.env[v]) {
    console.error(`❌ Variable d'environnement manquante : ${v}`);
    process.exit(1);
  }
}

const BUCKET = process.env.R2_DOWNLOADS_BUCKET || 'atelier-velo-downloads';
const TARGET_NAME = process.argv[3] || 'AtelierVeloPlus-Setup.exe';

// Détecter le .exe source
let source = process.argv[2];
if (!source) {
  const distDir = path.join(process.cwd(), 'dist-electron');
  if (!fs.existsSync(distDir)) {
    console.error('❌ dist-electron/ introuvable. Lance d\'abord : npm run build && npm run build:electron');
    process.exit(1);
  }
  const exe = fs.readdirSync(distDir).find((f) => f.endsWith('.exe') && /Setup|win-x64/i.test(f));
  if (!exe) {
    console.error('❌ Aucun installateur .exe trouvé dans dist-electron/');
    process.exit(1);
  }
  source = path.join(distDir, exe);
}

if (!fs.existsSync(source)) {
  console.error(`❌ Fichier introuvable : ${source}`);
  process.exit(1);
}

const stat = fs.statSync(source);
const sizeMB = (stat.size / (1024 * 1024)).toFixed(0);

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

console.log(`📦 Upload installateur sur R2`);
console.log(`   Source : ${source} (${sizeMB} Mo)`);
console.log(`   Bucket : ${BUCKET}`);
console.log(`   Objet  : ${TARGET_NAME}`);
console.log('   … (peut prendre 1-3 min selon la connexion)');

const body = fs.readFileSync(source);
await s3.send(new PutObjectCommand({
  Bucket: BUCKET,
  Key: TARGET_NAME,
  Body: body,
  ContentType: 'application/vnd.microsoft.portable-executable',
  ContentDisposition: `attachment; filename="${TARGET_NAME}"`,
  CacheControl: 'public, max-age=3600',
}));

console.log('\n✅ Installateur publié.');
console.log(`   URL publique (une fois custom domain actif) :`);
console.log(`   https://downloads.upgradedbikes.com/${TARGET_NAME}`);
