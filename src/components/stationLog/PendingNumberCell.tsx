import { useState } from 'react';
import { Chip, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { Check, Close } from '@mui/icons-material';

interface Props {
  value?: string | null;
  /** e.g. "WO" or "EAM" - shown as "WO pending" while the number is not yet known */
  label: string;
  canEdit: boolean;
  /** Save the number the user typed. Rejects if the server refuses. */
  onSave: (value: string) => Promise<void>;
}

/** A reference number that may not exist yet: shows the number, or a "pending" chip that can be clicked to type it in. */
export default function PendingNumberCell({ value, label, canEdit, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  if (value && value.trim()) return <>{value}</>;

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true); setFailed(false);
    try { await onSave(text.trim()); setEditing(false); setText(''); }
    catch { setFailed(true); }
    finally { setSaving(false); }
  };

  if (!editing) {
    return (
      <Tooltip title={canEdit ? `Click to enter the ${label} number` : `${label} number not entered yet`}>
        <Chip size="small" color="warning" variant="outlined" label={`${label} pending`}
          onClick={canEdit ? () => setEditing(true) : undefined} sx={{ fontSize: 11, cursor: canEdit ? 'pointer' : 'default' }} />
      </Tooltip>
    );
  }

  return (
    <Stack direction="row" spacing={0.25} alignItems="center">
      <TextField size="small" autoFocus value={text} error={failed} disabled={saving}
        placeholder={`${label} #`} sx={{ minWidth: 110 }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') { setEditing(false); setText(''); } }} />
      <IconButton size="small" color="success" disabled={saving || !text.trim()} onClick={() => void save()}><Check fontSize="small" /></IconButton>
      <IconButton size="small" disabled={saving} onClick={() => { setEditing(false); setText(''); setFailed(false); }}><Close fontSize="small" /></IconButton>
      {failed && <Typography variant="caption" color="error">Not saved</Typography>}
    </Stack>
  );
}
