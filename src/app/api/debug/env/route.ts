import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

/**
 * Route de debug pour vérifier l'environnement
 * GET /api/debug/env
 */
export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  
  const dbInfo = {
    DATABASE_URL: dbUrl || 'NON DEFINIE',
    NODE_ENV: process.env.NODE_ENV,
    cwd: process.cwd(),
    resolvedPath: null as string | null,
    fileExists: false,
    fileSize: null as number | null,
  };
  
  if (dbUrl && dbUrl.startsWith('file:')) {
    const relativePath = dbUrl.replace('file:', '');
    const absolutePath = path.resolve(process.cwd(), relativePath);
    dbInfo.resolvedPath = absolutePath;
    
    try {
      if (fs.existsSync(absolutePath)) {
        dbInfo.fileExists = true;
        const stats = fs.statSync(absolutePath);
        dbInfo.fileSize = Math.round(stats.size / 1024); // KB
      }
    } catch (_error) {
      // ignore
    }
  }
  
  // Trouver tous les fichiers .db
  const findDbFiles = (dir: string, results: Array<{path: string, size: number}> = []) => {
    if (!fs.existsSync(dir)) return results;
    
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filepath = path.join(dir, file);
        try {
          const stat = fs.statSync(filepath);
          if (stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
              findDbFiles(filepath, results);
            }
          } else if (file.endsWith('.db') && !filepath.includes('backups')) {
            results.push({ path: filepath, size: Math.round(stat.size / 1024) });
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
    
    return results;
  };
  
  const dbFiles = findDbFiles(process.cwd());
  
  return NextResponse.json({
    status: 'ok',
    dbInfo,
    dbFiles,
    allEnvVars: {
      DATABASE_URL: process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      DATABASE_PROVIDER: process.env.DATABASE_PROVIDER,
    }
  }, { status: 200 });
}
