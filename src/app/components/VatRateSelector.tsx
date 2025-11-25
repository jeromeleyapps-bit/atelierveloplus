import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { SelectChangeEvent } from '@mui/material/Select';

interface VatRateSelectorProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  size?: "small" | "medium";
  disabled?: boolean;
  fullWidth?: boolean;
}

/**
 * Composant réutilisable pour sélectionner un taux de TVA
 * Valeurs possibles: 0%, 10%, 20%
 */
export default function VatRateSelector({
  value,
  onChange,
  label = "TVA",
  size = "small",
  disabled = false,
  fullWidth = false,
}: VatRateSelectorProps) {
  const handleChange = (event: SelectChangeEvent<number>) => {
    onChange(Number(event.target.value));
  };

  return (
    <FormControl size={size} disabled={disabled} fullWidth={fullWidth}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        onChange={handleChange}
        label={label}
      >
        <MenuItem value={0}>0% (Exonéré)</MenuItem>
        <MenuItem value={10}>10% (Taux réduit)</MenuItem>
        <MenuItem value={20}>20% (Taux normal)</MenuItem>
      </Select>
    </FormControl>
  );
}
