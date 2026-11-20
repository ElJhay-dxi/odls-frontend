import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, IconButton,
  FormControlLabel, InputLabel, MenuItem, Paper, Select, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { Edit, Delete, Refresh, DeleteSweep } from '@mui/icons-material';
import { DataGrid, type GridColDef, type GridRowSelectionModel } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import VgifImporter from '../../components/vgif/VgifImporter';
import VgifChecklist from '../../components/vgif/VgifChecklist';
import { useVgif } from '../../components/vgif/useVgif';
import VgifDeleteDialog, { selectedIds } from '../../components/vgif/VgifDeleteDialog';
import { usePermission } from '../../hooks/usePermission';
import { vgifApi, vgifDeleteApi, apiError, btuPerScf, fmt, AG15_FIELDS, type VgifAg15Row } from '../../api/vgif/vgifApi';

export default function VgifAg15Page() {
  const v = useVgif('ag15');
  const canCreate = usePermission('vgif.ag15.create');
  const canEdit = usePermission('vgif.ag15.edit');
  const canDelete = usePermission('vgif.ag15.delete');
  const canHistory = usePermission('vgif.import_history');
  const [tab, setTab] = useState(0);
  const mayRecord = canCreate && (v.settings?.canRecord ?? false);

  useEffect(() => { if (v.settings && !mayRecord) setTab(1); }, [v.settings, mayRecord]);

  return (
    <Box>
      <PageHeader title="AG15 Daily Readings" subtitle="Flow computer readings frozen at 05:00 each day, for every VGIF metering point"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'VGIF Master Readings' }, { label: 'AG15' }]} />
      {v.loadError && <Alert severity="error" sx={{ mb: 2 }}>{v.loadError}</Alert>}
      {v.settings && !v.settings.canRecord && canCreate && (
        <Alert severity="info" sx={{ mb: 2 }}>
          VGIF readings are recorded by {v.settings.responsiblePlantName || v.settings.responsiblePlantCode}. You can view them here.
        </Alert>
      )}
      <Tabs value={tab} onChange={(_, t) => setTab(t)} sx={{ mb: 2 }}>
        <Tab label="Record" disabled={!mayRecord} />
        <Tab label="Stored readings" />
      </Tabs>

      {tab === 0 && mayRecord && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 8.5 }}>
            <VgifImporter kind="ag15" points={v.points} pointId={v.pointId} onPointChange={v.setPointId}
              date={v.date} onDateChange={v.setDate} canCreate={canCreate} canOverwrite={canEdit}
              canImportHistory={canHistory} onImported={v.refresh} />
          </Grid>
          <Grid size={{ xs: 12, lg: 3.5 }}>
            <VgifChecklist date={v.date} refreshKey={v.refreshKey} focus="ag15" onPick={v.setPointId} selectedPointId={v.pointId} />
          </Grid>
        </Grid>
      )}
      {tab === 1 && <StoredAg15 points={v.points} refreshKey={v.refreshKey} canEdit={canEdit} canDelete={canDelete} onChanged={v.refresh} />}
    </Box>
  );
}

function StoredAg15({ points, refreshKey, canEdit, canDelete, onChanged }: {
  points: ReturnType<typeof useVgif>['points']; refreshKey: number; canEdit: boolean; canDelete: boolean; onChanged: () => void;
}) {
  const [pointId, setPointId] = useState('');
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [rows, setRows] = useState<VgifAg15Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<VgifAg15Row | null>(null);
  const [deleting, setDeleting] = useState<VgifAg15Row | null>(null);
  const [selection, setSelection] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set() });
  const [bulk, setBulk] = useState<'selected' | 'all' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [allDates, setAllDates] = useState(false);
  const picked = selectedIds(selection as { type: 'include' | 'exclude'; ids: Set<string | number> }, rows.map((r) => r.id));
  const pointLabel = points.find((p) => p.id === pointId)?.code ?? 'all points';

  const runBulk = async () => {
    try {
      const r = await vgifDeleteApi.bulk('ag15', bulk === 'selected'
        ? { ids: picked }
        : { all: true, pointId: pointId || null, from: allDates ? null : from, to: allDates ? null : to });
      setNotice(r.data.message); setBulk(null); setSelection({ type: 'include', ids: new Set() }); onChanged();
    } catch (e) { throw new Error(apiError(e, 'Could not delete the readings.')); }
  };

  const load = () => {
    setLoading(true); setError(null);
    vgifApi.getAg15({ pointId: pointId || undefined, from, to })
      .then((r) => setRows(r.data))
      .catch((e) => setError(apiError(e, 'Could not load the readings.')))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [pointId, from, to, refreshKey]);

  const total = useMemo(() => rows.reduce((s, r) => s + (r.consumption ?? 0), 0), [rows]);
  const val = (r: VgifAg15Row, k: string) => r.values[k] ?? null;

  const columns: GridColDef<VgifAg15Row>[] = [
    { field: 'readingDate', headerName: 'Date', width: 115, valueFormatter: (x: string) => dayjs(x).format('DD MMM YYYY') },
    { field: 'pointCode', headerName: 'Point', width: 80 },
    { field: 'consumption', headerName: 'Consumption (MMBtu)', width: 165, type: 'number', valueFormatter: (x: number | null) => fmt(x, 0) },
    { field: 'meter', headerName: 'Meter daily (MMBtu)', width: 155, type: 'number', valueGetter: (_: unknown, r) => val(r, 'DailyEnergyYesterday'), valueFormatter: (x: number | null) => fmt(x, 0) },
    { field: 'variance', headerName: 'Variance', width: 90, type: 'number', valueFormatter: (x: number | null) => fmt(x, 0) },
    { field: 'dailyVolume', headerName: 'Daily volume (Sm³)', width: 150, type: 'number', valueFormatter: (x: number | null) => fmt(x, 0) },
    { field: 'energy', headerName: 'Energy totalizer', width: 140, type: 'number', valueGetter: (_: unknown, r) => val(r, 'EnergyTotalizer'), valueFormatter: (x: number | null) => fmt(x, 0) },
    { field: 'volume', headerName: 'Volume totalizer', width: 140, type: 'number', valueGetter: (_: unknown, r) => val(r, 'VolumeTotalizer'), valueFormatter: (x: number | null) => fmt(x, 0) },
    { field: 'cv', headerName: 'CV (kWh/Sm³)', width: 115, type: 'number', valueGetter: (_: unknown, r) => val(r, 'CalorificDailyMean'), valueFormatter: (x: number | null) => fmt(x, 4) },
    { field: 'btu', headerName: 'Btu/SCF', width: 95, type: 'number', valueGetter: (_: unknown, r) => btuPerScf(val(r, 'CalorificDailyMean')), valueFormatter: (x: number | null) => fmt(x, 2) },
    { field: 'density', headerName: 'Density', width: 90, type: 'number', valueGetter: (_: unknown, r) => val(r, 'Density'), valueFormatter: (x: number | null) => fmt(x, 4) },
    {
      field: 'flags', headerName: 'Notes', width: 200, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%' }}>
          {row.totalizerFlag === 'rollover' && <Chip size="small" variant="outlined" label="Rollover" />}
          {row.totalizerFlag === 'reset' && <Chip size="small" color="error" variant="outlined" label="Totalizer reset" />}
          {row.variance != null && Math.abs(row.variance) > 1 && <Chip size="small" color="warning" variant="outlined" label="Variance" />}
          {row.isCorrected && (
            <Tooltip title={`Corrected by ${row.correctedByName ?? ''} ${row.correctedOn ? dayjs(row.correctedOn).format('DD MMM YYYY HH:mm') : ''}${row.correctionReason ? `: ${row.correctionReason}` : ''}`}>
              <Chip size="small" color="info" label="Corrected" />
            </Tooltip>
          )}
        </Stack>
      ),
    },
    ...(canEdit || canDelete ? [{
      field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: ({ row }: { row: VgifAg15Row }) => (
        <>
          {canEdit && <IconButton size="small" onClick={() => setEditing(row)}><Edit fontSize="small" /></IconButton>}
          {canDelete && <IconButton size="small" color="error" onClick={() => setDeleting(row)}><Delete fontSize="small" /></IconButton>}
        </>
      ),
    } as GridColDef<VgifAg15Row>] : []),
  ];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' }, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Metering point</InputLabel>
          <Select label="Metering point" value={pointId} onChange={(e) => setPointId(String(e.target.value))}>
            <MenuItem value="">All points</MenuItem>
            {points.filter((p) => p.hasAg15).map((p) => <MenuItem key={p.id} value={p.id}>{p.code} · {p.name}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField size="small" type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <IconButton onClick={load}><Refresh /></IconButton>
        <Box sx={{ flex: 1 }} />
        {pointId && <Typography variant="body2">Total consumption: <b>{fmt(total, 0)} MMBtu</b></Typography>}
        {canDelete && (
          <>
            <Button size="small" color="error" startIcon={<Delete />} disabled={picked.length === 0} onClick={() => setBulk('selected')}>
              Delete selected{picked.length ? ` (${picked.length})` : ''}
            </Button>
            <Button size="small" color="error" variant="outlined" startIcon={<DeleteSweep />} disabled={rows.length === 0 || !from || !to} onClick={() => { setAllDates(false); setBulk('all'); }}>
              Delete all
            </Button>
          </>
        )}
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}
      <Box sx={{ height: 560 }}>
        <DataGrid rows={rows} columns={columns} loading={loading} density="compact" disableRowSelectionOnClick
          checkboxSelection={canDelete} rowSelectionModel={selection} onRowSelectionModelChange={setSelection}
          initialState={{ sorting: { sortModel: [{ field: 'readingDate', sort: 'desc' }] } }} />
      </Box>
      {bulk && (
        <VgifDeleteDialog title={bulk === 'selected' ? `Delete ${picked.length} AG15 reading(s)?` : 'Delete all AG15 readings shown?'}
          requireTyping={bulk === 'all'} onClose={() => setBulk(null)} onConfirm={runBulk}>
          <Typography>
            {bulk === 'selected'
              ? `The ${picked.length} selected daily reading(s) will be removed.`
              : allDates
                ? `Every AG15 reading for ${pointLabel}, on every date, will be removed.`
                : `Every AG15 reading for ${pointLabel} from ${dayjs(from).format('DD MMM YYYY')} to ${dayjs(to).format('DD MMM YYYY')} will be removed (${rows.length} shown).`}
          </Typography>
          {bulk === 'all' && (
            <FormControlLabel sx={{ mt: 1 }} control={<Checkbox checked={allDates} onChange={(e) => setAllDates(e.target.checked)} />}
              label={`All dates, not just the range shown`} />
          )}
        </VgifDeleteDialog>
      )}
      {editing && <CorrectDialog row={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
      {deleting && (
        <Dialog open onClose={() => setDeleting(null)}>
          <DialogTitle>Delete reading?</DialogTitle>
          <DialogContent>
            <Typography>
              {deleting.pointCode} reading for {dayjs(deleting.readingDate).format('DD MMM YYYY')} will be removed. You can bring it back by importing the export again.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
            <Button color="error" variant="contained" onClick={async () => {
              try { await vgifApi.deleteAg15(deleting.id); setDeleting(null); onChanged(); }
              catch (e) { setError(apiError(e, 'Could not delete the reading.')); setDeleting(null); }
            }}>Delete</Button>
          </DialogActions>
        </Dialog>
      )}
    </Paper>
  );
}

function CorrectDialog({ row, onClose, onSaved }: { row: VgifAg15Row; onClose: () => void; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(AG15_FIELDS.map((f) => [f.key, row.values[f.key] == null ? '' : String(row.values[f.key])])));
  const [reason, setReason] = useState(row.correctionReason ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const groups = [...new Set(AG15_FIELDS.map((f) => f.group))];

  const save = async () => {
    const out: Record<string, number | null> = {};
    for (const f of AG15_FIELDS) {
      const t = values[f.key].trim().replace(',', '.');
      if (t === '') { out[f.key] = null; continue; }
      const n = Number(t);
      if (Number.isNaN(n)) { setError(`${f.label} is not a number.`); return; }
      out[f.key] = n;
    }
    setBusy(true);
    try { await vgifApi.correctAg15(row.id, out, reason.trim() || undefined); onSaved(); }
    catch (e) { setError(apiError(e, 'Could not save the correction.')); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Correct {row.pointCode} reading for {dayjs(row.readingDate).format('DD MMM YYYY')}</DialogTitle>
      <DialogContent dividers>
        {groups.map((g) => (
          <Box key={g} sx={{ mb: 2 }}>
            <Typography variant="overline" color="text.secondary">{g}</Typography>
            <Grid container spacing={1.5}>
              {AG15_FIELDS.filter((f) => f.group === g).map((f) => (
                <Grid key={f.key} size={{ xs: 12, sm: 6, md: 4 }}>
                  <TextField size="small" fullWidth label={f.unit ? `${f.label} (${f.unit})` : f.label} value={values[f.key]}
                    onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))} />
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}
        <TextField fullWidth size="small" label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={busy} onClick={save}>Save correction</Button>
      </DialogActions>
    </Dialog>
  );
}
