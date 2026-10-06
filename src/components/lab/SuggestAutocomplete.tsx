import { Autocomplete, TextField } from '@mui/material';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Built-in suggestions. */
  defaults?: string[];
  /** Values people have entered before (from the server); merged with the defaults. */
  learned?: string[];
  helperText?: string;
  disabled?: boolean;
}

/** Suggestion dropdown that also accepts new text. New entries become suggestions once saved (via `learned`). */
export function mergeSuggestions(defaults: string[] = [], learned: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  [...defaults, ...learned].forEach((v) => {
    const t = v?.trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(t); }
  });
  return out;
}

export default function SuggestAutocomplete({ label, value, onChange, defaults, learned, helperText, disabled }: Props) {
  return (
    <Autocomplete
      freeSolo size="small" fullWidth disabled={disabled}
      options={mergeSuggestions(defaults, learned)}
      value={value}
      onChange={(_, v) => onChange(v ?? '')}
      onInputChange={(_, v, reason) => {
        if (reason === 'input') onChange(v);
        else if (reason === 'clear') onChange('');
      }}
      renderInput={(params) => <TextField {...params} label={label} helperText={helperText} />}
    />
  );
}
