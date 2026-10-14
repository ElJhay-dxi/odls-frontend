import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, InputAdornment, Table,
  TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Clear, Close, Delete, Edit, Search, Visibility } from '@mui/icons-material';
import ConfirmDialog from '../shared/ConfirmDialog';
import type { StationLogHistoryItem, StationLogHistoryFilters } from '../../types/stationLogCarryOver';

interface Props {
  open: boolean;
  plantName: string;
  /** Date of the log currently on screen (yyyy-MM-dd), highlighted in the list */
  currentDate: string;
  load: (filters: StationLogHistoryFilters) => Promise<StationLogHistoryItem[]>;
  onClose: () => void;
  /** Open that day's log; edit = also switch it into edit mode */
  onOpenLog: (date: string, edit: boolean) => void;
  /** Delete the log. Rejects if the server refuses. */
  onDelete: (item: StationLogHistoryItem) => Promise<void>;
}

const fmtDate = (iso: string) =>
  new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
const fmtStamp = (iso: string) =>
  new Date(iso.endsWith('Z') ? iso : iso + 'Z').toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Past station logs for the selected plant. Edit/Delete show only where the server says the user may. */
export default function StationLogHistoryDialog({ open, plantName, currentDate, load, onClose, onOpenLog, onDelete }: Props) {
  const [items, setItems] = useState<StationLogHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<StationLogHistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // always call the latest `load` (it captures the page's current plant), not the one from the first render
  const loadRef = useRef(load);
  loadRef.current = load;

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');   // searchText after a short pause in typing

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchText.trim()), 400);
    return () => clearTimeout(t);
  }, [searchText]);

  const filtered = !!(from || to || search);
  const invalidRange = !!from && !!to && from > to;

  const refresh = useCallback(async () => {
    if (invalidRange) return;
    setLoading(true); setError(null);
    try { setItems(await loadRef.current({ from, to, search })); }
    catch { setError('Could not load the station log history.'); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, search, invalidRange]);

  useEffect(() => { if (open) refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, from, to, search]);

  const clearFilters = () => { setFrom(''); setTo(''); setSearchText(''); setSearch(''); };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try { await onDelete(toDelete); setToDelete(null); await refresh(); }
    catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to delete the station log.'); setToDelete(null);
    } finally { setDeleting(false); }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          Station log history - {plantName}
          <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', px: 3, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField size="small" type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} error={invalidRange} />
          <TextField size="small" type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} error={invalidRange} />
          <TextField size="small" label="Search" placeholder="Keyword in notes, entries, permits…" value={searchText}
            onChange={(e) => setSearchText(e.target.value)} sx={{ flex: 1, minWidth: 220 }}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                endAdornment: searchText ? (
                  <InputAdornment position="end"><IconButton size="small" onClick={() => { setSearchText(''); setSearch(''); }}><Clear fontSize="small" /></IconButton></InputAdornment>
                ) : undefined,
              },
            }} />
          {filtered && <Button size="small" onClick={clearFilters}>Clear filters</Button>}
        </Box>
        {invalidRange && <Alert severity="warning" sx={{ mx: 3, mt: 1.5 }}>The "From" date is after the "To" date.</Alert>}
        <DialogContent dividers sx={{ p: 0 }}>
          {error && <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>{error}</Alert>}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={28} /></Box>
          ) : items.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 3 }}>
              {filtered ? 'No station logs match these filters.' : 'No station logs recorded for this plant yet.'}
            </Typography>
          ) : (
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Started by</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Last updated</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Entries</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((it) => {
                  const current = it.logDate.slice(0, 10) === currentDate;
                  return (
                    <TableRow key={it.id} hover selected={current}>
                      <TableCell sx={{ fontWeight: current ? 700 : 400 }}>{fmtDate(it.logDate)}{current ? ' (open)' : ''}</TableCell>
                      <TableCell>
                        {it.createdByName}
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{fmtStamp(it.createdOn)}</Typography>
                      </TableCell>
                      <TableCell>
                        {it.updatedOn ? (
                          <>
                            {it.updatedByName ?? '-'}
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{fmtStamp(it.updatedOn)}</Typography>
                          </>
                        ) : '-'}
                      </TableCell>
                      <TableCell align="center">{it.entryCount}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Open"><IconButton size="small" onClick={() => onOpenLog(it.logDate.slice(0, 10), false)}><Visibility fontSize="small" /></IconButton></Tooltip>
                        {it.canEdit && <Tooltip title="Edit"><IconButton size="small" onClick={() => onOpenLog(it.logDate.slice(0, 10), true)}><Edit fontSize="small" /></IconButton></Tooltip>}
                        {it.canDelete && <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setToDelete(it)}><Delete fontSize="small" /></IconButton></Tooltip>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        {!loading && items.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ px: 3, py: 1 }}>
            {items.length} log{items.length === 1 ? '' : 's'}
            {!filtered && items.length >= 90 ? ' - showing the latest 90. Use the date range or search to find older logs.' : ''}
            {filtered && items.length >= 366 ? ' - showing the first 366 matches. Narrow the filters to see fewer.' : ''}
          </Typography>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!toDelete} title="Delete station log"
        message={toDelete ? `Delete the station log for ${plantName} on ${fmtDate(toDelete.logDate)}? Everything recorded in it will be removed. This cannot be undone.` : ''}
        confirmLabel="Delete" loading={deleting}
        onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
    </>
  );
}
