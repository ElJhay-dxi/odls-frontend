import { Autocomplete, TextField } from '@mui/material';

const DESIGNATIONS = [
  'Shift Leader',
  'Lab Technician',
  'Lab Analyst',
  'Senior Lab Technician',
  'Lab Supervisor',
  'Chemical Engineer',
];

interface DesignationAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

export default function DesignationAutocomplete({ label, value, onChange, disabled, size = 'small' }: DesignationAutocompleteProps) {
  return (
    <Autocomplete
      freeSolo
      options={DESIGNATIONS}
      value={value}
      disabled={disabled}
      onInputChange={(_, newValue) => onChange(newValue)}
      renderInput={(params) => (
        <TextField {...params} label={label} size={size} fullWidth />
      )}
    />
  );
}
