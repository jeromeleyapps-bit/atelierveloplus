import TextField, { TextFieldProps } from '@mui/material/TextField';
import { forwardRef } from "react";

/**
 * TextField optimisé pour la saisie numérique
 * Sélectionne automatiquement tout le contenu au focus
 */
const NumericTextField = forwardRef<HTMLDivElement, TextFieldProps>((props, ref) => {
  return (
    <TextField
      {...props}
      ref={ref}
      type="number"
      onFocus={(e) => {
        e.target.select();
        props.onFocus?.(e);
      }}
    />
  );
});

NumericTextField.displayName = "NumericTextField";

export default NumericTextField;
