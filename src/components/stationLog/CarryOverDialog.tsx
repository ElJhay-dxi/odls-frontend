import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, InputLabel, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  MenuItem, Select, Typography,
} from '@mui/material';
import type { CarryOverOptions } from '../../types/stationLogCarryOver';

interface Props {
  open: boolean;
  /** Date of the log being started, yyyy-MM-dd */
  date: string;
  plantName: string;
  load: (sourceDate?: string) => Promise<CarryOverOptions>;
  busy: boolean;
  onClose: () => void;
  /** sourceDate is null for a blank log */
  onStart: (sourceDate: string | null, sections: string[]) => void;
}

const day = (iso: string) => iso.slice(0, 10);
const pretty = (iso: string) =>
  new Date(day(iso) + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

/** "Start with the previous day's data?" - pick the earlier log and the sections to copy. */
export default function CarryOverDialog({ open, date, plantName, load, busy, onClose, onStart }: Props) {
  const [options, setOptions] = useState<CarryOverOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchOptions = async (sourceDate?: string) => {
    setLoading(true); setError(null);
    try {
      const res = await load(sourceDate);
      setOptions(res);
      setSelected(new Set(res.sections.filter((s) => s.defaultSelected).map((s) => s.key)));
    } catch {
      setError('Could not check for earlier logs. You can still start a blank log.');
      setOptions(null);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (open) { setOptions(null); fetchOptions(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date]);

  const yesterday = (() => {
    const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const toggle = (key: string) =>
    setSelected((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });

  const hasSource = !!options?.sourceDate;
  const picked = (options?.sections ?? []).filter((s) => selected.has(s.key) && s.count > 0).map((s) => s.key);

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Start station log - {plantName}</DialogTitle>
      <DialogContent dividers>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>}
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

        {!loading && options && !hasSource && (
          <Alert severity="info">There is no earlier log for this plant, so there is nothing to carry over. A blank log will be started.</Alert>
        )}

        {!loading && options && hasSource && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Copy data from an earlier log into the new one, then edit it for today. Tick the sections to carry over.
            </Typography>

            <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
              <InputLabel>Copy from</InputLabel>
              <Select label="Copy from" value={day(options.sourceDate!)} onChange={(e) => fetchOptions(e.target.value)}>
                {options.recentDates.map((d) => (
                  <MenuItem key={d} value={day(d)}>
                    {pretty(d)}{day(d) === yesterday ? ' (yesterday)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {!options.isYesterday && (
              <Alert severity="warning" sx={{ mb: 1.5 }}>
                There is no log for yesterday. The data below comes from <b>{pretty(options.sourceDate!)}</b>, not yesterday.
              </Alert>
            )}

            <List dense disablePadding>
              {options.sections.map((s) => (
                <ListItem key={s.key} disablePadding secondaryAction={<Chip size="small" label={s.count} variant="outlined" />}>
                  <ListItemButton disabled={s.count === 0} onClick={() => toggle(s.key)} sx={{ pr: 7 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox edge="start" size="small" checked={selected.has(s.key) && s.count > 0} disableRipple tabIndex={-1} />
                    </ListItemIcon>
                    <ListItemText primary={s.label} secondary={s.count === 0 ? 'Nothing recorded on that day' : s.note} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button onClick={() => onStart(null, [])} disabled={busy || loading}>Start blank</Button>
        {hasSource && (
          <Button variant="contained" disabled={busy || loading || picked.length === 0}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={() => onStart(day(options!.sourceDate!), picked)}>
            {busy ? 'Starting...' : `Start with ${picked.length} section${picked.length === 1 ? '' : 's'}`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
