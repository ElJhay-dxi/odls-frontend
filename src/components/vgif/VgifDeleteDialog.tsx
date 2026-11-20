import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';

/** Confirms a delete. With requireTyping the user must type DELETE first (for "delete all"). */
export default function VgifDeleteDialog({ title, children, requireTyping, onClose, onConfirm }: {
  title: string; children: React.ReactNode; requireTyping?: boolean; onClose: () => void; onConfirm: () => Promise<void>;
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ok = !requireTyping || typed.trim().toUpperCase() === 'DELETE';
  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {children}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Deleted readings can be brought back by importing the export again.
        </Typography>
        {requireTyping && (
          <TextField size="small" fullWidth sx={{ mt: 2 }} label='Type DELETE to confirm' value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button color="error" variant="contained" disabled={!ok || busy} onClick={async () => {
          setBusy(true); setError(null);
          try { await onConfirm(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete.'); setBusy(false); }
        }}>Delete</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Ids picked in a DataGrid selection model (which can be an "all except" model). */
export const selectedIds = (model: { type: 'include' | 'exclude'; ids: Set<string | number> }, allIds: string[]) =>
  model.type === 'include' ? allIds.filter((id) => model.ids.has(id)) : allIds.filter((id) => !model.ids.has(id));
