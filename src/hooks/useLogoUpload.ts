/**
 * Hook useLogoUpload - Logo file upload
 * 
 * Pattern: Simple file upload with validation
 * - Max 100KB
 * - .ico format only
 * - Returns upload function + loading state
 */

import { useState } from 'react';
import { logger } from '@/lib/logger';

interface UseLogoUploadCallbacks {
  onSuccess?: (path: string) => void;
  onError?: (error: Error) => void;
}

export function useLogoUpload(callbacks?: UseLogoUploadCallbacks) {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File | null | undefined) {
    if (!file) return null;

    // Validate file size - Allow PNG/JPG up to 5MB
    if (file.size > 5 * 1024 * 1024) {
      const error = new Error('Fichier trop volumineux. Maximum: 5MB');
      callbacks?.onError?.(error);
      throw error;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const token = localStorage.getItem('jwt_token');
      const res = await fetch('/api/account/upload-logo', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Erreur upload');
      }

      const data = await res.json();
      callbacks?.onSuccess?.(data.path);
      return data.path; // Retourner seulement le path, pas l'objet complet
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Upload error:', { error: errorMessage });
      callbacks?.onError?.(error as Error);
      throw error;
    } finally {
      setUploading(false);
    }
  }

  return {
    upload,
    uploading,
  };
}
