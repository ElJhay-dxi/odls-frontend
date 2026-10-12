import { Autocomplete, Chip, TextField } from '@mui/material';
import { mergeSuggestions } from './SuggestAutocomplete';

interface Props {
  label: string;
  /** Selected values joined with "; ". */
  value: string;
  onChange: (v: string) => void;
  defaults?: string[];
  learned?: string[];
  helperText?: string;
  disabled?: boolean;
}

const SEP = '; ';
export const splitMulti = (v: string) => v.split(';').map((x) => x.trim()).filter(Boolean);

/** Pick one or more suggestions, or type new ones (Enter adds). Stored as a single "; "-joined string. */
export default function SuggestMultiAutocomplete({ label, value, onChange, defaults, learned, helperText, disabled }: Props) {
  return (
    <Autocomplete
      multiple freeSolo size="small" fullWidth disabled={disabled}
      options={mergeSuggestions(defaults, learned)}
      value={splitMulti(value)}
      onChange={(_, v) => onChange(v.map((x) => x.trim()).filter(Boolean).join(SEP))}
      renderTags={(tags, getTagProps) => tags.map((t, i) => {
        const { key, ...rest } = getTagProps({ index: i });
        return <Chip key={key} label={t} size="small" {...rest} />;
      })}
      renderInput={(params) => <TextField {...params} label={label} helperText={helperText} />}
    />
  );
}
