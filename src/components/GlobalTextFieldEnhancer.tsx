/**
 * Enhancer global pour tous les TextField
 * Ajoute automatiquement la sélection du texte au focus
 * 
 * Exclut automatiquement les Dialog MUI pour éviter les conflits de focus
 */

"use client";

import { useEffect, useRef } from 'react';

export default function GlobalTextFieldEnhancer() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Fonction pour gérer le focus sur les inputs
    const handleFocus = (event: FocusEvent) => {
      // Vérifier que le composant est toujours monté
      if (!isMountedRef.current) return;

      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      
      // Vérifier que c'est un input ou textarea
      if (
        target.tagName !== 'INPUT' && 
        target.tagName !== 'TEXTAREA'
      ) {
        return;
      }

      // ✅ EXCLUSION 1: Exclure les champs dans des Dialog MUI
      // Les Dialog MUI gèrent leur propre focus et ne doivent pas être interférés
      const isInDialog = target.closest('[role="dialog"]') || 
                        target.closest('[class*="MuiDialog"]') ||
                        target.closest('[class*="MuiModal"]');
      if (isInDialog) {
        return;
      }

      // ✅ EXCLUSION 2: Exclure les champs disabled ou readonly
      if (target.disabled || target.readOnly) {
        return;
      }
      
      // ✅ EXCLUSION 3: Exclure certains types d'input
      const excludedTypes = ['checkbox', 'radio', 'file', 'submit', 'button', 'reset'];
      const inputType = (target as HTMLInputElement).type;
      
      if (excludedTypes.includes(inputType)) {
        return;
      }
      
      // ✅ EXCLUSION 4: Exclure les champs de recherche
      if (
        target.id?.toLowerCase().includes('search') ||
        target.name?.toLowerCase().includes('search') ||
        target.placeholder?.toLowerCase().includes('recherch')
      ) {
        return;
      }
      
      // ✅ EXCLUSION 5: Exclure les champs password
      if (inputType === 'password') {
        return;
      }
      
      // ✅ Sélectionner le texte si le champ a une valeur
      if (target.value && target.value.length > 0) {
        // Utiliser requestAnimationFrame pour éviter les conflits avec les handlers React/MUI
        requestAnimationFrame(() => {
          if (!isMountedRef.current) return;
          try {
            // Vérifier que le champ est toujours actif avant de sélectionner
            if (document.activeElement === target && !target.disabled && !target.readOnly) {
              target.select();
            }
          } catch (_e) {
            // Ignorer les erreurs (certains inputs ne supportent pas select())
          }
        });
      }
    };
    
    // ✅ Utiliser bubble phase (false) au lieu de capture (true) pour respecter l'ordre des handlers
    // Cela permet aux handlers React/MUI de s'exécuter en premier
    document.addEventListener('focusin', handleFocus, false);
    
    // Nettoyer à la destruction
    return () => {
      isMountedRef.current = false;
      document.removeEventListener('focusin', handleFocus, false);
    };
  }, []);
  
  return null; // Ce composant ne rend rien
}
