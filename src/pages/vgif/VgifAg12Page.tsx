import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, FormControl, Grid, InputLabel, MenuItem, Paper, Select, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { Delete, DeleteSweep, EventBusy } from '@mui/icons-material';
import { DataGrid, type GridColDef, type GridRowSelectionModel } from '@mui/x-data-grid';
import VgifDeleteDialog, { selectedIds } from '../../components/vgif/VgifDeleteDialog';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import VgifImporter from '../../components/vgif/VgifImporter';
import VgifChecklist from '../../components/vgif/VgifChecklist';
import { useVgif } from '../../components/vgif/useVgif';
import { usePermission } from '../../hooks/usePermission';
import axiosInstance from '../../api/axiosInstance';
import { vgifApi, vgifDeleteApi, apiError, fmt, AG12_FIELDS, type VgifAg12Row, type VgifPoint } from '../../api/vgif/vgifApi';

export default function VgifAg12Page() {
  const v = useVgif('ag12');
  const canCreate = usePermission('vgif.ag12.create');
  const canEdit = usePermission('vgif.ag12.edit');
  const canHistory = usePermission('vgif.import_history');
  const canDelete = usePermission('vgif.ag12.delete');
  const [tab, setTab] = useState(0);
  const mayRecord = canCreate && (v.settings?.canRecord ?? false);

  useEffect(() => { if (v.settings && !mayRecord) setTab(1); }, [v.settings, mayRecord]);

  return (
    <Box>
      <PageHeader title="AG12 Gas Composition" subtitle="Chromatograph readings every 5 minutes, imported daily from the rolling 24-hour export"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'VGIF Master Readings' }, { label: 'AG12' }]} />
      {v.loadError && <Alert severity="error" sx={{ mb: 2 }}>{v.loadError}</Alert>}
      {v.settings && !v.settings.canRecord && canCreate && (
        <Alert severity="info" sx={{ mb: 2 }}>
          VGIF readings are recorded by {v.settings.responsiblePlantName || v.settings.responsiblePlantCode}. You can view them here.
        </Alert>
      )}
      <Tabs value={tab} onChange={(_, t) => setTab(t)} sx={{ mb: 2 }}>
        <Tab label="Record" disabled={!mayRecord} />
        <Tab label="Stored readings" />
        <Tab label="Import history" />
      </Tabs>

      {tab === 0 && mayRecord && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 8.5 }}>
            <VgifImporter kind="ag12" points={v.points} pointId={v.pointId} onPointChange={v.setPointId}
              date={v.date} onDateChange={v.setDate} canCreate={canCreate} canOverwrite={canEdit}
              canImportHistory={canHistory} onImported={v.refresh} />
          </Grid>
          <Grid size={{ xs: 12, lg: 3.5 }}>
            <VgifChecklist date={v.date} refreshKey={v.refreshKey} focus="ag12" onPick={v.setPointId} selectedPointId={v.pointId} />
          </Grid>
        </Grid>
      )}
      {tab === 1 && <StoredAg12 points={v.points} initialPoint={v.pointId} refreshKey={v.refreshKey} canDelete={canDelete && (v.settings?.canRecord ?? false)} onChanged={v.refresh} />}
      {tab === 2 && <ImportHistory points={v.points} refreshKey={v.refreshKey} />}
    </Box>
  );
}

function StoredAg12({ points, initialPoint, refreshKey, canDelete, onChanged }: {
  points: VgifPoint[]; initialPoint: string; refreshKey: number; canDelete: boolean; onChanged: () => void;
}) {
  const eligible = points.filter((p) => p.hasAg12);
  const [pointId, setPointId] = useState(initialPoint);
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [rows, setRows] = useState<VgifAg12Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set() });
  const [bulk, setBulk] = useState<'selected' | 'day' | 'range' | null>(null);
  const [range, setRange] = useState({ from: '', to: '' });
  const [notice, setNotice] = useState<string | null>(null);
  const picked = selectedIds(selection as { type: 'include' | 'exclude'; ids: Set<string | number> }, rows.map((r) => r.id));
  const code = eligible.find((p) => p.id === pointId)?.code ?? '';

  const runBulk = async () => {
    const body = bulk === 'selected' ? { ids: picked }
      : bulk === 'day' ? { all: true, pointId, from: date, to: date }
      : { all: true, pointId, from: range.from || null, to: range.to || null };
    try {
      const r = await vgifDeleteApi.bulk('ag12', body);
      setNotice(r.data.message); setBulk(null); setSelection({ type: 'include', ids: new Set() }); onChanged();
    } catch (e) { throw new Error(apiError(e, 'Could not delete the readings.')); }
  };

  useEffect(() => { if (!pointId && eligible[0]) setPointId(eligible[0].id); }, [eligible, pointId]);
  useEffect(() => {
    if (!pointId || !date) return;
    setLoading(true); setError(null);
    vgifApi.getAg12Day(pointId, date)
      .then((r) => setRows(r.data))
      .catch((e) => setError(apiError(e, 'Could not load the readings.')))
      .finally(() => setLoading(false));
  }, [pointId, date, refreshKey]);

  /** Daily mean, min and max of each value across the day's 5-minute readings. */
  const stats = useMemo(() => AG12_FIELDS.slice(0, 6).map((f) => {
    const xs = rows.map((r) => r.values[f.key]).filter((x): x is number => x != null);
    return { f, mean: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null, min: xs.length ? Math.min(...xs) : null, max: xs.length ? Math.max(...xs) : null };
  }), [rows]);

  const columns: GridColDef<VgifAg12Row>[] = [
    { field: 'readingAt', headerName: 'Time', width: 80, valueFormatter: (x: string) => dayjs(x).format('HH:mm') },
    ...AG12_FIELDS.map((f) => ({
      field: f.key, headerName: f.unit && f.unit !== 'mol%' ? `${f.label} (${f.unit})` : f.label, width: f.group === 'Properties' ? 140 : 100,
      type: 'number' as const, valueGetter: (_: unknown, r: VgifAg12Row) => r.values[f.key] ?? null,
      valueFormatter: (x: number | null) => fmt(x, 4),
    })),
    {
      field: 'sum', headerName: 'Sum %', width: 90, type: 'number',
      valueGetter: (_: unknown, r) => AG12_FIELDS.filter((f) => f.group === 'Composition').reduce((s, f) => s + (r.values[f.key] ?? 0), 0),
      valueFormatter: (x: number) => fmt(x, 3),
    },
  ];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' }, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Metering point</InputLabel>
          <Select label="Metering point" value={eligible.some((p) => p.id === pointId) ? pointId : ''} onChange={(e) => setPointId(String(e.target.value))}>
            {eligible.map((p) => <MenuItem key={p.id} value={p.id}>{p.code} · {p.name}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField size="small" type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <Typography variant="body2" color="text.secondary">{rows.length} of 288 readings</Typography>
        <Box sx={{ flex: 1 }} />
        {canDelete && (
          <>
            <Button size="small" color="error" startIcon={<Delete />} disabled={picked.length === 0} onClick={() => setBulk('selected')}>
              Delete selected{picked.length ? ` (${picked.length})` : ''}
            </Button>
            <Button size="small" color="error" startIcon={<EventBusy />} disabled={rows.length === 0} onClick={() => setBulk('day')}>Delete this day</Button>
            <Button size="small" color="error" variant="outlined" startIcon={<DeleteSweep />} disabled={!pointId}
              onClick={() => { setRange({ from: '', to: '' }); setBulk('range'); }}>Delete range or all</Button>
          </>
        )}
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}
      {rows.length > 0 && (
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {stats.map(({ f, mean, min, max }) => (
            <Grid key={f.key} size={{ xs: 6, md: 2 }}>
              <Card variant="outlined"><CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Typography variant="caption" color="text.secondary">{f.label}{f.unit ? ` (${f.unit})` : ''}</Typography>
                <Typography variant="h6">{fmt(mean, 4)}</Typography>
                <Typography variant="caption" color="text.secondary">{fmt(min, 4)} to {fmt(max, 4)}</Typography>
              </CardContent></Card>
            </Grid>
          ))}
        </Grid>
      )}
      <Box sx={{ height: 520 }}>
        <DataGrid rows={rows} columns={columns} loading={loading} density="compact" disableRowSelectionOnClick
          checkboxSelection={canDelete} rowSelectionModel={selection} onRowSelectionModelChange={setSelection} />
      </Box>
      {bulk && (
        <VgifDeleteDialog
          title={bulk === 'selected' ? `Delete ${picked.length} AG12 reading(s)?` : bulk === 'day' ? `Delete ${code} AG12 readings for ${dayjs(date).format('DD MMM YYYY')}?` : `Delete ${code} AG12 readings`}
          requireTyping={bulk === 'range'} onClose={() => setBulk(null)} onConfirm={runBulk}>
          {bulk === 'selected' && <Typography>The {picked.length} selected 5-minute reading(s) will be removed.</Typography>}
          {bulk === 'day' && <Typography>All {rows.length} readings for this day will be removed.</Typography>}
          {bulk === 'range' && (
            <>
              <Typography sx={{ mb: 2 }}>Choose the dates. Leave both empty to delete every {code} AG12 reading.</Typography>
              <Stack direction="row" spacing={2}>
                <TextField size="small" type="date" label="From" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField size="small" type="date" label="To" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
              </Stack>
              {!range.from && !range.to && <Alert severity="warning" sx={{ mt: 2 }}>This deletes all AG12 readings for {code}.</Alert>}
            </>
          )}
        </VgifDeleteDialog>
      )}
    </Paper>
  );
}

interface Batch {
  id: string; pointCode: string; kind: string; fileName?: string | null; rowsInFile: number; rowsAdded: number;
  rowsUnchanged: number; rowsOverwritten: number; rowsIgnored: number; firstReading?: string | null; lastReading?: string | null;
  importedOn: string; importedByName: string;
}

function ImportHistory({ points, refreshKey }: { points: VgifPoint[]; refreshKey: number }) {
  const [kind, setKind] = useState<'AG12' | 'AG15'>('AG12');
  const [pointId, setPointId] = useState('');
  const [rows, setRows] = useState<Batch[]>([]);
  useEffect(() => {
    axiosInstance.get<Batch[]>('/vgif/ag12/imports', { params: { kind, pointId: pointId || undefined } })
      .then((r) => setRows(r.data)).catch(() => setRows([]));
  }, [kind, pointId, refreshKey]);
  const at = (x?: string | null) => (x ? dayjs(x).format('DD MMM YYYY HH:mm') : '');
  const columns: GridColDef<Batch>[] = [
    { field: 'importedOn', headerName: 'Imported', width: 150, valueFormatter: (x: string) => at(x) },
    { field: 'importedByName', headerName: 'By', width: 160 },
    { field: 'pointCode', headerName: 'Point', width: 80 },
    { field: 'fileName', headerName: 'File', width: 220 },
    { field: 'firstReading', headerName: 'From', width: 150, valueFormatter: (x: string | null) => at(x) },
    { field: 'lastReading', headerName: 'To', width: 150, valueFormatter: (x: string | null) => at(x) },
    { field: 'rowsInFile', headerName: 'In file', width: 80, type: 'number' },
    { field: 'rowsAdded', headerName: 'Added', width: 80, type: 'number' },
    { field: 'rowsOverwritten', headerName: 'Replaced', width: 90, type: 'number' },
    { field: 'rowsUnchanged', headerName: 'Already stored', width: 120, type: 'number' },
    { field: 'rowsIgnored', headerName: 'Ignored', width: 80, type: 'number' },
  ];
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Kind</InputLabel>
          <Select label="Kind" value={kind} onChange={(e) => setKind(e.target.value as 'AG12' | 'AG15')}>
            <MenuItem value="AG12">AG12</MenuItem><MenuItem value="AG15">AG15</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Metering point</InputLabel>
          <Select label="Metering point" value={pointId} onChange={(e) => setPointId(String(e.target.value))}>
            <MenuItem value="">All points</MenuItem>
            {points.map((p) => <MenuItem key={p.id} value={p.id}>{p.code}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>
      <Box sx={{ height: 480 }}>
        <DataGrid rows={rows} columns={columns} density="compact" disableRowSelectionOnClick />
      </Box>
    </Paper>
  );
}
