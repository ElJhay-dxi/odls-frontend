import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, FormControlLabel, Grid, InputAdornment, InputLabel, MenuItem, Paper, Select,
  ListSubheader, Stack, Switch, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { ViewColumn, FileDownload, TableRows, CompareArrows, ShowChart, Search, OpenInNew } from '@mui/icons-material';
import { DataGrid, type GridColDef, type GridColumnGroupingModel, type GridPaginationModel } from '@mui/x-data-grid';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend,
} from 'recharts';
import dayjs from 'dayjs';
import PageHeader from '../shared/PageHeader';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import type { PowerPlant } from '../../types/masterData';
import { usePermission, usePlantFilter } from '../../hooks/usePermission';
import {
  summaryApi, type SummaryApi, type SummaryKind, type CompareRow, type CompareStat, type SummaryColumn, type SummaryDataset, type SummaryFilters,
  type SummaryRow, type SummaryUnit, type TrendBucket, type TrendSeries,
} from '../../api/summaries/summaryApi';

// ── Small helpers ──────────────────────────────────────────────────────────────
const STORE = 'odls.hourlySummary';
const load = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(`${STORE}.${key}`); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
const save = (key: string, value: unknown) => {
  try { localStorage.setItem(`${STORE}.${key}`, JSON.stringify(value)); } catch { /* storage unavailable */ }
};

const today = () => dayjs().format('YYYY-MM-DD');
const fmtDate = (d: string) => dayjs(d.slice(0, 10)).format('DD MMM YYYY');
const fmtTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const fmtNum = (v: unknown) =>
  typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 3 }) : v == null ? '' : String(v);
const colTitle = (c: SummaryColumn) => (c.unit ? `${c.label} (${c.unit})` : c.label);
const errorText = (e: unknown, fallback: string) => {
  const r = (e as { response?: { data?: unknown; status?: number } })?.response;
  if (r?.status === 403) return 'You don’t have permission to view this.';
  return typeof r?.data === 'string' && r.data ? r.data : fallback;
};

const QUICK_RANGES: { label: string; from: () => string; to?: () => string }[] = [
  { label: 'Today', from: today },
  { label: 'Last 7 days', from: () => dayjs().subtract(6, 'day').format('YYYY-MM-DD') },
  { label: 'Last 30 days', from: () => dayjs().subtract(29, 'day').format('YYYY-MM-DD') },
  { label: 'This month', from: () => dayjs().startOf('month').format('YYYY-MM-DD') },
  { label: 'Last month', from: () => dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
    to: () => dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD') },
  { label: 'Last 90 days', from: () => dayjs().subtract(89, 'day').format('YYYY-MM-DD') },
  { label: 'This year', from: () => dayjs().startOf('year').format('YYYY-MM-DD') },
  { label: 'Last 12 months', from: () => dayjs().subtract(1, 'year').add(1, 'day').format('YYYY-MM-DD') },
];

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const COLORS = ['#1565c0', '#e65100', '#2e7d32', '#6a1b9a', '#c62828', '#00838f', '#f9a825', '#4e342e', '#ad1457', '#283593', '#558b2f', '#37474f'];

// ── Page ───────────────────────────────────────────────────────────────────────
interface RecordSummaryProps {
  kind: SummaryKind;
  title: string;
  subtitle: string;
}

/** Record Summaries → Hourly / Daily Summary: one screen, fed by /api/summaries/{kind}. */
export default function RecordSummary({ kind, title, subtitle }: RecordSummaryProps) {
  const navigate = useNavigate();
  const canExport = usePermission(`summaries.${kind}.export`);
  const api = useMemo(() => summaryApi(kind), [kind]);

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);
  const [plantCode, setPlantCode] = useState<string>(() => load('plant', ''));

  const [datasets, setDatasets] = useState<SummaryDataset[]>([]);
  const [datasetKey, setDatasetKey] = useState<string>(() => load(`${kind}.dataset`, ''));
  const dataset = datasets.find((d) => d.key === datasetKey) ?? null;

  const [columns, setColumns] = useState<SummaryColumn[]>([]);
  // Which plant + dataset the loaded columns belong to — views wait until it matches the current choice
  const [columnsFor, setColumnsFor] = useState('');
  const [units, setUnits] = useState<SummaryUnit[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [columnsOpen, setColumnsOpen] = useState(false);

  const [from, setFrom] = useState(() => dayjs().subtract(6, 'day').format('YYYY-MM-DD'));
  const [to, setTo] = useState(today);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [hourFrom, setHourFrom] = useState<number | ''>('');
  const [hourTo, setHourTo] = useState<number | ''>('');
  const [newestFirst, setNewestFirst] = useState(true);
  // Daily logs with a reading time (00:00 / 05:00…): the times recorded at the plant, and the one picked
  const [times, setTimes] = useState<number[]>([]);
  const [time, setTime] = useState<number | ''>('');

  const [view, setView] = useState<'records' | 'compare' | 'trend'>(() => load(`${kind}.view`, 'records'));
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Plants (only the user's own); remember the last one
  useEffect(() => { powerPlantApi.getAll().then((r) => setPlants(r.data)).catch(() => setError('Could not load plants.')); }, []);
  useEffect(() => { if (autoPlantCode) setPlantCode(autoPlantCode); }, [autoPlantCode]);
  useEffect(() => {
    if (plants.length && plantCode && !availablePlants.some((p) => p.plantCode === plantCode)) setPlantCode('');
  }, [plants, availablePlants, plantCode]);
  useEffect(() => { if (plantCode) save('plant', plantCode); }, [plantCode]);
  useEffect(() => { save(`${kind}.view`, view); }, [view, kind]);

  // Datasets this user can see at the plant
  useEffect(() => {
    setDatasets([]); setColumns([]); setUnits([]); setColumnsFor(''); setError(null);
    if (!plantCode) return;
    api.getDatasets(plantCode).then((r) => {
      setDatasets(r.data);
      setDatasetKey((k) => (r.data.some((d) => d.key === k) ? k : r.data[0]?.key ?? ''));
    }).catch((e) => setError(errorText(e, 'Could not load the datasets.')));
  }, [plantCode, api]);

  // Columns + units for the dataset; hidden columns remembered per dataset and plant
  useEffect(() => {
    setColumns([]); setUnits([]); setSelectedUnits([]); setColumnsFor(''); setError(null);
    if (!plantCode || !dataset) return;
    save(`${kind}.dataset`, dataset.key);
    setHidden(load(`hidden.${dataset.key}.${plantCode}`, [] as string[]));
    setTimes([]); setTime('');
    api.getColumns(dataset.key, plantCode).then((r) => {
      setColumns(r.data.columns); setUnits(r.data.units); setTimes(r.data.times ?? []); setColumnsFor(`${plantCode}|${dataset.key}`);
    }).catch((e) => setError(errorText(e, 'Could not load the columns.')));
  }, [plantCode, dataset, api, kind]);

  const updateHidden = (next: string[]) => {
    setHidden(next);
    if (dataset) save(`hidden.${dataset.key}.${plantCode}`, next);
  };

  const visibleColumns = useMemo(() => columns.filter((c) => !hidden.includes(c.key)), [columns, hidden]);
  const numericColumns = useMemo(() => columns.filter((c) => c.numeric), [columns]);

  const rangeError = from && to && to < from ? 'The end date is before the start date.'
    : hourFrom !== '' && hourTo !== '' && hourTo < hourFrom ? 'The end hour is before the start hour.' : null;

  const filters: SummaryFilters | null = useMemo(() => (plantCode && from && to && !rangeError ? {
    plantCode, from, to, units: selectedUnits,
    hourFrom: kind === 'hourly' && hourFrom !== '' ? hourFrom : null, hourTo: kind === 'hourly' && hourTo !== '' ? hourTo : null,
    time: kind === 'daily' && time !== '' ? time : null,
  } : null), [plantCode, from, to, selectedUnits, hourFrom, hourTo, time, kind, rangeError]);

  const compareMode = dataset ? dataset.compare ?? (dataset.hasUnits ? 'units' : 'columns') : 'none';
  const shownView = view === 'compare' && compareMode === 'none' ? 'records' : view;
  const ready = !!(filters && dataset && columns.length && columnsFor === `${plantCode}|${dataset.key}`);

  const handleExport = async () => {
    if (!filters || !dataset) return;
    setExporting(true); setError(null);
    try {
      const res = await api.exportExcel(dataset.key, filters, visibleColumns.map((c) => c.key), newestFirst);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `${dataset.key}-${plantCode}-${from}-to-${to}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(errorText(e, 'Could not export to Excel.'));
    } finally { setExporting(false); }
  };

  const openEntry = (date: string) => {
    if (dataset) navigate(`${dataset.entryPath}?plant=${encodeURIComponent(plantCode)}&date=${date.slice(0, 10)}`);
  };

  return (
    <Box>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={[{ label: 'Record Summaries' }, { label: title }]}
        extra={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ViewColumn />} disabled={!columns.length} onClick={() => setColumnsOpen(true)}>
              Columns {columns.length > 0 && `(${visibleColumns.length}/${columns.length})`}
            </Button>
            {canExport && (
              <Button variant="contained" startIcon={<FileDownload />} disabled={!ready || exporting || !visibleColumns.length}
                onClick={handleExport}>
                {exporting ? 'Exporting…' : 'Export to Excel'}
              </Button>
            )}
          </Stack>
        }
      />

      {/* ── Filters ── */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Power Plant</InputLabel>
                <Select label="Power Plant" value={plantCode} disabled={plantLocked} onChange={(e) => setPlantCode(e.target.value)}>
                  {availablePlants.map((p) => <MenuItem key={p.plantCode} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small" disabled={!datasets.length}>
                <InputLabel>Dataset</InputLabel>
                <Select label="Dataset" value={dataset ? datasetKey : ''} onChange={(e) => setDatasetKey(e.target.value)}>
                  {datasets.flatMap((d, i) => [
                    ...(d.category && d.category !== datasets[i - 1]?.category
                      ? [<ListSubheader key={`h-${d.category}`}>{d.category}</ListSubheader>] : []),
                    <MenuItem key={d.key} value={d.key}>{d.label}</MenuItem>,
                  ])}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 1.5 }}>
              <TextField fullWidth size="small" type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 6, md: 1.5 }}>
              <TextField fullWidth size="small" type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            {kind === 'hourly' ? (<>
            <Grid size={{ xs: 6, md: 1.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel>From hour</InputLabel>
                <Select label="From hour" value={hourFrom} onChange={(e) => setHourFrom(String(e.target.value) === '' ? '' : Number(e.target.value))}>
                  <MenuItem value="">Any</MenuItem>
                  {HOURS.map((h) => <MenuItem key={h} value={h}>{fmtTime(h * 60)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 1.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel>To hour</InputLabel>
                <Select label="To hour" value={hourTo} onChange={(e) => setHourTo(String(e.target.value) === '' ? '' : Number(e.target.value))}>
                  <MenuItem value="">Any</MenuItem>
                  {HOURS.map((h) => <MenuItem key={h} value={h}>{fmtTime(h * 60)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            </>) : times.length > 0 && (
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Reading time</InputLabel>
                  <Select label="Reading time" value={time} onChange={(e) => setTime(String(e.target.value) === '' ? '' : Number(e.target.value))}>
                    <MenuItem value="">All times</MenuItem>
                    {times.map((m) => <MenuItem key={m} value={m}>{fmtTime(m)}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            )}
            {dataset?.hasUnits && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Autocomplete multiple size="small" options={units.map((u) => u.unitCode)}
                  value={selectedUnits} onChange={(_, v) => setSelectedUnits(v)}
                  getOptionLabel={(code) => { const u = units.find((x) => x.unitCode === code); return u ? `${u.unitName} (${u.unitCode})` : code; }}
                  renderInput={(p) => <TextField {...p} label={`${dataset.unitLabel ?? 'Unit'}s`}
                    placeholder={selectedUnits.length ? '' : `All ${(dataset.unitLabel ?? 'unit').toLowerCase()}s`} />} />
              </Grid>
            )}
            <Grid size={{ xs: 12, md: dataset?.hasUnits ? 6 : 12 }}>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', height: '100%' }}>
                {QUICK_RANGES.map((r) => (
                  <Chip key={r.label} size="small" label={r.label} variant="outlined" clickable
                    onClick={() => { setFrom(r.from()); setTo(r.to ? r.to() : today()); }} />
                ))}
              </Stack>
            </Grid>
          </Grid>
          {rangeError && <Alert severity="warning" sx={{ mt: 2 }}>{rangeError}</Alert>}
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {plantCode && plants.length > 0 && datasets.length === 0 && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>There are no hourly datasets you can view for this plant.</Alert>
      )}
      {!plantCode && <Alert severity="info" sx={{ mb: 2 }}>Choose a plant to begin.</Alert>}

      {/* ── Views ── */}
      {ready && (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Stack direction="row" sx={{ alignItems: 'center', borderBottom: 1, borderColor: 'divider', px: 1, flexWrap: 'wrap' }}>
            <Tabs value={shownView} onChange={(_, v) => setView(v)} sx={{ flex: 1 }}>
              <Tab value="records" icon={<TableRows fontSize="small" />} iconPosition="start" label="Records" />
              {compareMode !== 'none' && (
                <Tab value="compare" icon={<CompareArrows fontSize="small" />} iconPosition="start"
                  label={compareMode === 'units' ? `Compare ${(dataset!.unitLabel ?? 'unit').toLowerCase()}s` : 'Compare buses'} />
              )}
              <Tab value="trend" icon={<ShowChart fontSize="small" />} iconPosition="start" label="Trend" />
            </Tabs>
            {shownView !== 'trend' && (
              <FormControlLabel sx={{ mr: 1 }} label={<Typography variant="body2">Newest first</Typography>}
                control={<Switch size="small" checked={newestFirst} onChange={(e) => setNewestFirst(e.target.checked)} />} />
            )}
          </Stack>
          <Box sx={{ p: 2 }}>
            {shownView === 'records' && (
              <RecordsView api={api} dataset={dataset!} filters={filters!} columns={visibleColumns} newestFirst={newestFirst}
                onOpen={openEntry} onError={setError} />
            )}
            {shownView === 'compare' && (
              <CompareView api={api} dataset={dataset!} filters={filters!} columns={numericColumns} units={units}
                newestFirst={newestFirst} onError={setError} />
            )}
            {shownView === 'trend' && (
              <TrendView api={api} dataset={dataset!} filters={filters!} columns={numericColumns} units={units} onError={setError} />
            )}
          </Box>
        </Paper>
      )}

      <ColumnsDialog open={columnsOpen} columns={columns} hidden={hidden}
        onClose={() => setColumnsOpen(false)} onChange={updateHidden} />
    </Box>
  );
}

// ── Records ────────────────────────────────────────────────────────────────────
interface ViewProps { api: SummaryApi; dataset: SummaryDataset; filters: SummaryFilters; onError: (m: string) => void }

function RecordsView({ api, dataset, filters, columns, newestFirst, onOpen, onError }:
  ViewProps & { columns: SummaryColumn[]; newestFirst: boolean; onOpen: (date: string) => void }) {
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 50 });
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const filterKey = JSON.stringify([dataset.key, filters, newestFirst]);

  useEffect(() => { setPagination((p) => ({ ...p, page: 0 })); }, [filterKey]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    api.getRecords(dataset.key, filters, pagination.page, pagination.pageSize, newestFirst)
      .then((r) => { if (live) { setRows(r.data.rows); setTotal(r.data.total); } })
      .catch((e) => live && onError(errorText(e, 'Could not load the records.')))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, pagination.page, pagination.pageSize]);

  const gridRows = useMemo(() => rows.map((r) => ({
    ...r.values,
    __id: `${r.id}-${r.minutes}-${r.unitCode}`, __date: r.date, __time: r.minutes, __unit: r.unitName ? `${r.unitName}` : r.unitCode,
  })), [rows]);

  const gridColumns = useMemo<GridColDef[]>(() => {
    const lead: GridColDef[] = [
      { field: '__date', headerName: 'Date', width: 120, sortable: false, valueFormatter: (v: string) => fmtDate(v) },
    ];
    if (dataset.timeLabel) lead.push({ field: '__time', headerName: dataset.timeLabel, width: 80, sortable: false, valueFormatter: (v: number) => fmtTime(v) });
    if (dataset.hasUnits) lead.push({ field: '__unit', headerName: dataset.unitLabel ?? 'Unit', width: 150, sortable: false });
    return [
      ...lead,
      ...columns.map<GridColDef>((c) => ({
        field: c.key, headerName: colTitle(c), description: `${c.group} · ${colTitle(c)}`, sortable: false,
        type: c.numeric ? 'number' : 'string', width: c.numeric ? 120 : 220,
        valueFormatter: (v: unknown) => fmtNum(v),
      })),
      {
        field: '__open', headerName: '', width: 52, sortable: false, filterable: false, disableColumnMenu: true,
        renderCell: () => <Tooltip title="Open this day's entry page"><OpenInNew fontSize="small" color="action" /></Tooltip>,
      },
    ];
  }, [columns, dataset]);

  // Group headers by section (Generator, Turbine…)
  const groups = useMemo<GridColumnGroupingModel>(() => {
    const byGroup = new Map<string, string[]>();
    columns.forEach((c) => byGroup.set(c.group, [...(byGroup.get(c.group) ?? []), c.key]));
    return [...byGroup.entries()].map(([g, keys]) => ({ groupId: g, headerName: g, children: keys.map((field) => ({ field })) }));
  }, [columns]);

  return (
    <Box sx={{ height: 'calc(100vh - 420px)', minHeight: 420 }}>
      <DataGrid
        rows={gridRows}
        columns={gridColumns}
        columnGroupingModel={groups}
        getRowId={(r) => r.__id as string}
        rowCount={total}
        loading={loading}
        paginationMode="server"
        paginationModel={pagination}
        onPaginationModelChange={setPagination}
        pageSizeOptions={[25, 50, 100, 250, 500]}
        density="compact"
        disableRowSelectionOnClick
        onCellClick={(p) => { if (p.field === '__open') onOpen(p.row.__date as string); }}
        localeText={{ noRowsLabel: 'No readings for these filters' }}
        sx={{ bgcolor: 'background.paper', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 } }}
      />
    </Box>
  );
}

// ── Compare (one field across units / buses) ──────────────────────────────────
function CompareView({ api, dataset, filters, columns, units, newestFirst, onError }:
  ViewProps & { columns: SummaryColumn[]; units: SummaryUnit[]; newestFirst: boolean }) {
  const [field, setField] = useState<string>(() => load(`compare.${dataset.key}`, ''));
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 50 });
  const [data, setData] = useState<{ total: number; units: string[]; stats: CompareStat[]; rows: CompareRow[] } | null>(null);
  const [loading, setLoading] = useState(false);

  // Bus voltages compare every bus on one value, so there is no field to choose
  const isBus = (dataset.compare ?? (dataset.hasUnits ? 'units' : 'columns')) === 'columns';
  const selected = isBus ? null : columns.find((c) => c.key === field) ?? null;
  const filterKey = JSON.stringify([dataset.key, filters, newestFirst, field]);

  useEffect(() => { if (!isBus && !selected && columns.length) setField(columns[0].key); }, [columns, selected, isBus]);
  useEffect(() => { if (field) save(`compare.${dataset.key}`, field); }, [field, dataset.key]);
  useEffect(() => { setPagination((p) => ({ ...p, page: 0 })); }, [filterKey]);

  useEffect(() => {
    if (!isBus && !selected) return;
    let live = true;
    setLoading(true);
    api.compare(dataset.key, filters, selected?.key ?? '', pagination.page, pagination.pageSize, newestFirst)
      .then((r) => live && setData(r.data))
      .catch((e) => live && onError(errorText(e, isBus ? 'Could not compare the buses.' : 'Could not compare the units.')))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, pagination.page, pagination.pageSize]);

  const unitName = (code: string) => {
    if (isBus) return columns.find((c) => c.key === `bus:${code}`)?.label ?? code;
    const u = units.find((x) => x.unitCode === code);
    return u ? u.unitName || code : code;
  };

  const gridColumns = useMemo<GridColDef[]>(() => [
    { field: 'date', headerName: 'Date', width: 120, sortable: false, valueFormatter: (v: string) => fmtDate(v) },
    ...(dataset.timeLabel ? [{ field: 'minutes', headerName: dataset.timeLabel, width: 80, sortable: false,
      valueFormatter: (v: number) => fmtTime(v) } as GridColDef] : []),
    ...(data?.units ?? []).map<GridColDef>((u) => ({
      field: `u:${u}`, headerName: unitName(u), type: 'number', width: 140, sortable: false,
      valueGetter: (_v: unknown, row: CompareRow) => row.values[u] ?? null,
      valueFormatter: (v: unknown) => fmtNum(v),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [data?.units, dataset.timeLabel, units, columns]);

  const shownRows = data?.rows ?? [];
  const unitLabel = isBus ? 'kV' : selected?.unit;

  return (
    <Stack spacing={2}>
      {!isBus && (
        <Autocomplete size="small" sx={{ maxWidth: 480 }} options={columns} value={selected} disableClearable={!!selected}
          groupBy={(c) => c.group} getOptionLabel={colTitle} isOptionEqualToValue={(a, b) => a.key === b.key}
          onChange={(_, v) => v && setField(v.key)}
          renderInput={(p) => <TextField {...p} label="Field to compare" />} />
      )}
      {data && data.stats.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {data.stats.map((s) => (
            <Paper key={s.unitCode} variant="outlined" sx={{ px: 1.5, py: 1, minWidth: 170 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{unitName(s.unitCode)}</Typography>
              <Typography variant="body2">
                Avg <b>{fmtNum(s.avg != null ? Math.round(s.avg * 1000) / 1000 : null)}</b>
                {unitLabel ? ` ${unitLabel}` : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Min {fmtNum(s.min)} · Max {fmtNum(s.max)} · {s.count.toLocaleString()} readings
              </Typography>
            </Paper>
          ))}
        </Stack>
      )}
      <Box sx={{ height: 'calc(100vh - 520px)', minHeight: 380 }}>
        <DataGrid
          rows={shownRows}
          columns={gridColumns}
          getRowId={(r) => `${r.date}|${r.minutes}`}
          rowCount={data?.total ?? 0}
          loading={loading}
          paginationMode="server"
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[25, 50, 100, 250, 500]}
          density="compact"
          disableRowSelectionOnClick
          localeText={{ noRowsLabel: 'No readings for these filters' }}
          sx={{ bgcolor: 'background.paper', '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 } }}
        />
      </Box>
    </Stack>
  );
}

// ── Trend ──────────────────────────────────────────────────────────────────────
const BUCKET_LABEL: Record<TrendBucket, string> = {
  auto: 'Auto', raw: 'Every reading', day: 'Daily average', week: 'Weekly average', month: 'Monthly average',
};

function TrendView({ api, dataset, filters, columns, units, onError }:
  ViewProps & { columns: SummaryColumn[]; units: SummaryUnit[] }) {
  const [fields, setFields] = useState<string[]>(() => load(`trend.${dataset.key}`, [] as string[]));
  const [bucket, setBucket] = useState<TrendBucket>('auto');
  const [result, setResult] = useState<{ bucket: TrendBucket; series: TrendSeries[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const chosen = columns.filter((c) => fields.includes(c.key));
  useEffect(() => {
    const valid = fields.filter((f) => columns.some((c) => c.key === f));
    if (valid.length !== fields.length) setFields(valid);
    else if (!valid.length && columns.length) setFields([columns[0].key]);
  }, [columns, fields]);
  useEffect(() => { save(`trend.${dataset.key}`, fields); }, [fields, dataset.key]);

  const filterKey = JSON.stringify([dataset.key, filters, fields, bucket]);
  useEffect(() => {
    if (!fields.length) { setResult(null); return; }
    let live = true;
    setLoading(true); setMessage(null);
    api.trend(dataset.key, filters, fields, bucket)
      .then((r) => live && setResult(r.data))
      .catch((e) => {
        if (!live) return;
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 400) setMessage(errorText(e, 'Pick fewer fields or units.'));
        else onError(errorText(e, 'Could not load the trend.'));
      })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const unitName = (code: string) => {
    if (!dataset.hasUnits) return columns.find((c) => c.key === `bus:${code}`)?.label ?? code;
    return units.find((u) => u.unitCode === code)?.unitName || code;
  };
  const seriesKey = (s: TrendSeries) => `${s.field}|${s.unitCode}`;
  const seriesName = (s: TrendSeries) =>
    !s.unitCode ? s.label : !dataset.hasUnits ? unitName(s.unitCode) : fields.length > 1 ? `${s.label} — ${unitName(s.unitCode)}` : unitName(s.unitCode);

  // Measurement units → left axis for the first, right axis for the second
  const measures = [...new Set((result?.series ?? []).map((s) => s.unit ?? ''))];
  const axisOf = (s: TrendSeries) => (measures.length > 1 && (s.unit ?? '') === measures[1] ? 'R' : 'L');

  const chartData = useMemo(() => {
    const map = new Map<number, Record<string, number>>();
    (result?.series ?? []).forEach((s) => s.points.forEach((p) => {
      const t = dayjs(p.t).valueOf();
      const row = map.get(t) ?? { t };
      row[seriesKey(s)] = p.v;
      map.set(t, row);
    }));
    return [...map.values()].sort((a, b) => a.t - b.t);
  }, [result]);

  const raw = result?.bucket === 'raw';
  const tickFmt = (t: number) => dayjs(t).format(raw ? 'DD MMM HH:mm' : result?.bucket === 'month' ? 'MMM YYYY' : 'DD MMM YY');

  const stats = (result?.series ?? []).map((s) => {
    const vals = s.points.map((p) => p.v);
    const mins = s.points.map((p) => p.min ?? p.v);
    const maxs = s.points.map((p) => p.max ?? p.v);
    const n = s.points.reduce((a, p) => a + p.n, 0);
    const avg = n ? s.points.reduce((a, p) => a + p.v * p.n, 0) / n : null;
    return { s, n, avg, min: mins.length ? Math.min(...mins) : null, max: maxs.length ? Math.max(...maxs) : null, last: vals.at(-1) ?? null };
  });

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
        <Autocomplete multiple size="small" sx={{ flex: 1 }} options={columns} value={chosen}
          groupBy={(c) => c.group} getOptionLabel={colTitle} isOptionEqualToValue={(a, b) => a.key === b.key}
          getOptionDisabled={(o) => fields.length >= 8 && !fields.includes(o.key)}
          onChange={(_, v) => setFields(v.map((c) => c.key))}
          renderInput={(p) => <TextField {...p} label="Fields to trend (up to 8)" />} />
        <ToggleButtonGroup size="small" exclusive value={bucket} onChange={(_, v) => v && setBucket(v)}>
          {(Object.keys(BUCKET_LABEL) as TrendBucket[]).map((b) => (
            <ToggleButton key={b} value={b} sx={{ textTransform: 'none', px: 1.5 }}>{BUCKET_LABEL[b]}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
      {dataset.hasUnits && !filters.units?.length && dataset.compare !== 'none' && (
        <Typography variant="caption" color="text.secondary">Showing every {(dataset.unitLabel ?? 'unit').toLowerCase()} — narrow the filter above to show fewer lines.</Typography>
      )}
      {message && <Alert severity="warning">{message}</Alert>}
      {result && result.bucket !== 'raw' && (
        <Alert severity="info" sx={{ py: 0 }}>
          {bucket === 'auto' ? 'This range has a lot of readings, so it is shown as a ' : 'Shown as a '}
          {BUCKET_LABEL[result.bucket].toLowerCase()} — the table below has the true min and max.
        </Alert>
      )}
      <Paper variant="outlined" sx={{ p: 1, height: 440, position: 'relative' }}>
        {loading && <Typography variant="body2" color="text.secondary" sx={{ position: 'absolute', top: 12, right: 16 }}>Loading…</Typography>}
        {chartData.length === 0 && !loading ? (
          <Stack sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">No readings to plot for these filters.</Typography>
          </Stack>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={tickFmt} minTickGap={40} fontSize={12} />
              <YAxis yAxisId="L" fontSize={12} width={64} label={measures[0] ? { value: measures[0], angle: -90, position: 'insideLeft', fontSize: 12 } : undefined} />
              {measures.length > 1 && (
                <YAxis yAxisId="R" orientation="right" fontSize={12} width={64}
                  label={measures[1] ? { value: measures[1], angle: 90, position: 'insideRight', fontSize: 12 } : undefined} />
              )}
              <ChartTooltip labelFormatter={(t) => dayjs(Number(t)).format(raw ? 'DD MMM YYYY HH:mm' : 'DD MMM YYYY')}
                formatter={(v) => fmtNum(v)} />
              <Legend />
              {(result?.series ?? []).map((s, i) => (
                <Line key={seriesKey(s)} yAxisId={axisOf(s)} dataKey={seriesKey(s)} name={seriesName(s)} type="monotone"
                  stroke={COLORS[i % COLORS.length]} dot={chartData.length < 60} strokeWidth={1.8} connectNulls isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Paper>
      {stats.length > 0 && (
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%', fontSize: 13,
            '& th, & td': { borderBottom: 1, borderColor: 'divider', px: 1.5, py: 0.75, textAlign: 'right' },
            '& th:first-of-type, & td:first-of-type': { textAlign: 'left' }, '& th': { color: 'text.secondary', fontWeight: 600 } }}>
            <thead><tr><th>Series</th><th>Readings</th><th>Average</th><th>Min</th><th>Max</th><th>Latest</th></tr></thead>
            <tbody>
              {stats.map(({ s, n, avg, min, max, last }, i) => (
                <tr key={seriesKey(s)}>
                  <td><Box component="span" sx={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS[i % COLORS.length], mr: 1 }} />
                    {seriesName(s)}{s.unit ? ` (${s.unit})` : ''}</td>
                  <td>{n.toLocaleString()}</td>
                  <td>{fmtNum(avg != null ? Math.round(avg * 1000) / 1000 : null)}</td>
                  <td>{fmtNum(min)}</td><td>{fmtNum(max)}</td><td>{fmtNum(last)}</td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}
    </Stack>
  );
}

// ── Column picker ──────────────────────────────────────────────────────────────
function ColumnsDialog({ open, columns, hidden, onClose, onChange }: {
  open: boolean; columns: SummaryColumn[]; hidden: string[]; onClose: () => void; onChange: (hidden: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const groups = useMemo(() => {
    const map = new Map<string, SummaryColumn[]>();
    columns.filter((c) => !q || `${c.group} ${c.label}`.toLowerCase().includes(q))
      .forEach((c) => map.set(c.group, [...(map.get(c.group) ?? []), c]));
    return [...map.entries()];
  }, [columns, q]);

  const toggle = (key: string) => onChange(hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key]);
  const setGroup = (cols: SummaryColumn[], show: boolean) => {
    const keys = cols.map((c) => c.key);
    onChange(show ? hidden.filter((k) => !keys.includes(k)) : [...new Set([...hidden, ...keys])]);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Columns</DialogTitle>
      <DialogContent dividers>
        <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
          <TextField size="small" fullWidth placeholder="Search columns…" value={search} onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} />
          <Button size="small" onClick={() => onChange([])}>All</Button>
          <Button size="small" onClick={() => onChange(columns.map((c) => c.key))}>None</Button>
        </Stack>
        {groups.map(([group, cols], gi) => {
          const shown = cols.filter((c) => !hidden.includes(c.key)).length;
          return (
            <Box key={group} sx={{ mb: 1.5 }}>
              {gi > 0 && <Divider sx={{ mb: 1.5 }} />}
              <FormControlLabel
                label={<Typography sx={{ fontWeight: 700 }}>{group} <Typography component="span" variant="caption" color="text.secondary">({shown}/{cols.length})</Typography></Typography>}
                control={<Checkbox size="small" checked={shown === cols.length} indeterminate={shown > 0 && shown < cols.length}
                  onChange={(e) => setGroup(cols, e.target.checked)} />} />
              <Grid container sx={{ pl: 3.5 }}>
                {cols.map((c) => (
                  <Grid key={c.key} size={{ xs: 12, sm: 6, md: 4 }}>
                    <FormControlLabel label={<Typography variant="body2">{colTitle(c)}</Typography>}
                      control={<Checkbox size="small" checked={!hidden.includes(c.key)} onChange={() => toggle(c.key)} />} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          );
        })}
        {groups.length === 0 && <Typography color="text.secondary">No columns match “{search}”.</Typography>}
      </DialogContent>
      <DialogActions><Button variant="contained" onClick={onClose}>Done</Button></DialogActions>
    </Dialog>
  );
}
