/**
 * Enhancer global pour tous les TextField
 * Ajoute automatiquement la sélection du texte au focus
 */

"use client";

import { useEffect } from 'react';

export default function GlobalTextFieldEnhancer() {
  useEffect(() => {
    // Fonction pour gérer le focus sur les inputs
    const handleFocus = (event: FocusEvent) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      
      // Vérifier que c'est un input ou textarea
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA'
      ) {
        // Exclure certains types
        const excludedTypes = ['checkbox', 'radio', 'file', 'submit', 'button', 'reset'];
        const inputType = (target as HTMLInputElement).type;
        
        if (excludedTypes.includes(inputType)) {
          return;
        }
        
        // Exclure les champs de recherche (ont généralement search dans le name/id)
        if (
          target.id?.toLowerCase().includes('search') ||
          target.name?.toLowerCase().includes('search') ||
          target.placeholder?.toLowerCase().includes('recherch')
        ) {
          return;
        }
        
        // Exclure les champs password
        if (inputType === 'password') {
          return;
        }
        
        // Sélectionner le texte si le champ a une valeur
        if (target.value && target.value.length > 0) {
          // Petit délai pour éviter les conflits avec d'autres handlers
          setTimeout(() => {
            try {
              target.select();
            } catch (_e) {
              // Ignorer les erreurs (certains inputs ne supportent pas select())
            }
          }, 0);
        }
      }
    };
    
    // Ajouter l'écouteur global
    document.addEventListener('focusin', handleFocus, true);
    
    // Nettoyer à la destruction
    return () => {
      document.removeEventListener('focusin', handleFocus, true);
    };
  }, []);
  
  return null; // Ce composant ne rend rien
}
