/**
 * TextField qui s'efface automatiquement à la première saisie
 * Utilisé pour les champs avec valeurs par défaut
 */

"use client";

import TextField, { TextFieldProps } from '@mui/material/TextField';
import { useState, useCallback } from "react";

type ClearableTextFieldProps = Omit<TextFieldProps, 'onFocus' | 'onChange'> & {
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  clearOnFirstFocus?: boolean; // Si true, efface à la première saisie
};

export default function ClearableTextField({
  value,
  defaultValue,
  onChange,
  onFocus,
  clearOnFirstFocus = true,
  ...props
}: ClearableTextFieldProps) {
  const [hasBeenCleared, setHasBeenCleared] = useState(false);
  const [internalValue, setInternalValue] = useState(value || defaultValue || '');

  const handleFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    // Si clearOnFirstFocus et pas encore effacé, sélectionner tout le texte
    if (clearOnFirstFocus && !hasBeenCleared && event.target.value) {
      event.target.select();
    }
    
    onFocus?.(event);
  }, [clearOnFirstFocus, hasBeenCleared, onFocus]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasBeenCleared) {
      setHasBeenCleared(true);
    }
    
    setInternalValue(event.target.value);
    onChange?.(event);
  }, [hasBeenCleared, onChange]);

  return (
    <TextField
      {...props}
      value={value !== undefined ? value : internalValue}
      onFocus={handleFocus}
      onChange={handleChange}
    />
  );
}
