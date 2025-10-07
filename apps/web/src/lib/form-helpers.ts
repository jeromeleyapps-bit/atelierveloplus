/**
 * Props à ajouter aux TextField de type number pour sélectionner automatiquement le contenu au focus
 */
export const numericFieldProps = {
  type: "number" as const,
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  },
};

/**
 * Fonction helper pour créer des props de TextField numérique avec gestion du focus
 */
export function createNumericFieldProps(additionalProps?: {
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
}) {
  return {
    type: "number" as const,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
      additionalProps?.onFocus?.(e);
    },
  };
}
