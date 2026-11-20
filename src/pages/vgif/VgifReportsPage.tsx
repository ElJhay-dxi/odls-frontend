import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, FormControl, Grid, InputLabel, LinearProgress, MenuItem, Paper, Select, Stack, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { FileDownload } from '@mui/icons-material';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import { usePermission } from '../../hooks/usePermission';
import {
  vgifApi, vgifReportsApi, apiError, fmt, saveBlob, type VgifCost, type VgifGasCell, type VgifGasMonth, type VgifPoint,
} from '../../api/vgif/vgifApi';

export default function VgifReportsPage() {
  const [tab, setTab] = useState(0);
  const [points, setPoints] = useState<VgifPoint[]>([]);
  const canExport = usePermission('vgif.reports.export');
  useEffect(() => { vgifApi.getPoints().then((r) => setPoints(r.data)).catch(() => setPoints([])); }, []);

  return (
    <Box>
      <PageHeader title="VGIF Reports & Summaries" subtitle="Monthly gas figures for every metering point, and the cost of gas and heat rate"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'VGIF Master Readings' }, { label: 'Reports' }]} />
      <Tabs value={tab} onChange={(_, t) => setTab(t)} sx={{ mb: 2 }}>
        <Tab label="Gas sheet (month)" />
        <Tab label="Cost of gas & heat rate" />
      </Tabs>
      {tab === 0 && <GasMonth canExport={canExport} />}
      {tab === 1 && <CostReport points={points} canExport={canExport} />}
    </Box>
  );
}

// ── Gas sheet ──────────────────────────────────────────────────────────────────
type Measure = 'consumption' | 'meterDaily' | 'dailyVolume' | 'density' | 'calorific' | 'btuPerScf';
const MEASURES: { key: Measure; label: string; unit: string; digits: number; avg: boolean }[] = [
  { key: 'consumption', label: 'Consumption', unit: 'MMBtu', digits: 0, avg: false },
  { key: 'meterDaily', label: 'Meter daily quantity', unit: 'MMBtu', digits: 0, avg: false },
  { key: 'dailyVolume', label: 'Daily volume', unit: 'Sm³', digits: 0, avg: false },
  { key: 'density', label: 'Density', unit: 'kg/m³', digits: 4, avg: true },
  { key: 'calorific', label: 'Calorific value', unit: 'kWh/Sm³', digits: 4, avg: true },
  { key: 'btuPerScf', label: 'Btu/SCF', unit: 'Btu/SCF', digits: 2, avg: true },
];

function GasMonth({ canExport }: { canExport: boolean }) {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [measure, setMeasure] = useState<Measure>('consumption');
  const [data, setData] = useState<VgifGasMonth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [y, m] = month.split('-').map(Number);

  useEffect(() => {
    if (!y || !m) return;
    setLoading(true); setError(null);
    vgifReportsApi.gasMonth(y, m).then((r) => setData(r.data))
      .catch((e) => setError(apiError(e, 'Could not load the month.'))).finally(() => setLoading(false));
  }, [y, m]);

  const def = MEASURES.find((x) => x.key === measure)!;
  const showProgressive = measure === 'consumption';
  const totalOf = (code: string) => {
    const t = data?.totals[code]; if (!t) return null;
    switch (measure) {
      case 'consumption': return t.consumption;
      case 'meterDaily': return t.meterDaily;
      case 'dailyVolume': return t.dailyVolume;
      case 'density': return t.avgDensity;
      case 'calorific': return t.avgCalorific;
      default: return t.avgBtuPerScf;
    }
  };
  const days = (data?.days ?? []).filter((d) => !dayjs(d.date).isAfter(dayjs(), 'day'));

  const exportXlsx = async () => {
    try { const r = await vgifReportsApi.gasMonthExport(y, m); saveBlob(r.data, `VGIF_Gas_${month}.xlsx`); }
    catch (e) { setError(apiError(e, 'Could not export.')); }
  };

  const cellNote = (c: VgifGasCell) => [
    c.flag === 'rollover' ? 'Totalizer rolled over' : '', c.flag === 'reset' ? 'Totalizer reset (counted as 0)' : '',
    c.variance != null && Math.abs(c.variance) > 1 ? `Differs from the meter's daily figure by ${fmt(c.variance, 0)}` : '',
    c.isCorrected ? 'Corrected' : '',
  ].filter(Boolean).join('. ');

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2, alignItems: { md: 'center' } }}>
        <TextField size="small" type="month" label="Month" value={month} onChange={(e) => setMonth(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <ToggleButtonGroup size="small" exclusive value={measure} onChange={(_, v) => v && setMeasure(v)} sx={{ flexWrap: 'wrap' }}>
          {MEASURES.map((x) => <ToggleButton key={x.key} value={x.key}>{x.label}</ToggleButton>)}
        </ToggleButtonGroup>
        <Box sx={{ flex: 1 }} />
        {canExport && <Button startIcon={<FileDownload />} onClick={exportXlsx} disabled={!data}>Export Excel</Button>}
      </Stack>
      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {data && (
        <>
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            {data.points.map((p) => {
              const t = data.totals[p.code];
              return (
                <Grid key={p.id} size={{ xs: 6, md: 2 }}>
                  <Card variant="outlined"><CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" color="text.secondary">{p.code}</Typography>
                    <Typography variant="h6">{fmt(t?.consumption, 0)}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>MMBtu this month</Typography>
                    <Typography variant="caption" color={t && t.daysRecorded < t.daysExpected ? 'warning.main' : 'text.secondary'}>
                      {t?.daysRecorded ?? 0}/{t?.daysExpected ?? 0} days · {fmt(t?.avgBtuPerScf, 1)} Btu/SCF
                    </Typography>
                  </CardContent></Card>
                </Grid>
              );
            })}
          </Grid>

          <TableContainer sx={{ maxHeight: 620, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell rowSpan={showProgressive ? 2 : 1}>Date</TableCell>
                  {data.points.map((p) => (
                    <TableCell key={p.id} align="center" colSpan={showProgressive ? 2 : 1}>{p.code}</TableCell>
                  ))}
                </TableRow>
                {showProgressive && (
                  <TableRow>
                    {data.points.map((p) => [
                      <TableCell key={`${p.id}d`} align="right" sx={{ top: 37 }}>Daily</TableCell>,
                      <TableCell key={`${p.id}p`} align="right" sx={{ top: 37 }}>Progressive</TableCell>,
                    ])}
                  </TableRow>
                )}
              </TableHead>
              <TableBody>
                {days.map((d) => (
                  <TableRow key={d.date} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{dayjs(d.date).format('ddd DD MMM')}</TableCell>
                    {data.points.map((p) => {
                      const c = d.cells[p.code];
                      const note = c ? cellNote(c) : '';
                      const value = c ? (c[measure] as number | null) : null;
                      return [
                        <TableCell key={`${p.id}v`} align="right"
                          sx={{ bgcolor: !c ? 'action.hover' : note && measure === 'consumption' ? '#FFF4E5' : undefined, color: note && measure === 'consumption' ? 'warning.dark' : undefined }}>
                          {c ? <Tooltip title={note}><span>{fmt(value, def.digits)}</span></Tooltip> : ''}
                        </TableCell>,
                        showProgressive && <TableCell key={`${p.id}p`} align="right" sx={{ color: 'text.secondary' }}>{c ? fmt(c.progressive, 0) : ''}</TableCell>,
                      ];
                    })}
                  </TableRow>
                ))}
                <TableRow sx={{ '& td': { fontWeight: 700, borderTop: 2, borderColor: 'divider' } }}>
                  <TableCell>{def.avg ? 'Average' : 'Total'}</TableCell>
                  {data.points.map((p) => [
                    <TableCell key={`${p.id}t`} align="right">{fmt(totalOf(p.code), def.digits)}</TableCell>,
                    showProgressive && <TableCell key={`${p.id}tp`} />,
                  ])}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Consumption is the difference between consecutive 05:00 energy totalizer readings. Highlighted days have a note (hover to see it); grey cells have no reading.
          </Typography>
        </>
      )}
    </Paper>
  );
}

// ── Cost of gas and heat rate ──────────────────────────────────────────────────
function CostReport({ points, canExport }: { points: VgifPoint[]; canExport: boolean }) {
  const eligible = points.filter((p) => p.hasAg15);
  const [pointId, setPointId] = useState('');
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().subtract(1, 'day').format('YYYY-MM-DD'));
  const [data, setData] = useState<VgifCost | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pointId && eligible.length) setPointId((eligible.find((p) => p.code === 'TTPC') ?? eligible[0]).id);
  }, [eligible, pointId]);

  useEffect(() => {
    if (!pointId || !from || !to) return;
    setLoading(true); setError(null);
    vgifReportsApi.cost(pointId, from, to).then((r) => setData(r.data))
      .catch((e) => setError(apiError(e, 'Could not load the report.'))).finally(() => setLoading(false));
  }, [pointId, from, to]);

  const exportXlsx = async () => {
    try { const r = await vgifReportsApi.costExport(pointId, from, to); saveBlob(r.data, `VGIF_Cost_${data?.pointCode ?? ''}_${from}_${to}.xlsx`); }
    catch (e) { setError(apiError(e, 'Could not export.')); }
  };

  const cols = useMemo(() => [
    { k: 'gasMmbtu', label: 'Gas consumed (MMBtu)', d: 0 },
    { k: 'generationMwh', label: 'Generation (MWh)', d: 1 },
    { k: 'tariff', label: 'Tariff (US¢/kWh)', d: 4 },
    { k: 'gasPrice', label: 'Gas price ($/MMBtu)', d: 4 },
    { k: 'costOfGas', label: 'Cost of gas ($)', d: 2 },
    { k: 'revenue', label: 'Revenue ($)', d: 2 },
    { k: 'heatRateHhv', label: 'Heat rate HHV (kJ/kWh)', d: 0 },
    { k: 'heatRateLhv', label: 'Heat rate LHV (kJ/kWh)', d: 0 },
    { k: 'capacityFactor', label: 'Capacity factor (%)', d: 1 },
    { k: 'gasCostPerMwh', label: 'Gas cost per MWh ($)', d: 2 },
  ] as const, []);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2, alignItems: { md: 'center' } }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Metering point</InputLabel>
          <Select label="Metering point" value={eligible.some((p) => p.id === pointId) ? pointId : ''} onChange={(e) => setPointId(String(e.target.value))}>
            {eligible.map((p) => <MenuItem key={p.id} value={p.id}>{p.code} · {p.name}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField size="small" type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <Box sx={{ flex: 1 }} />
        {canExport && <Button startIcon={<FileDownload />} onClick={exportXlsx} disabled={!data}>Export Excel</Button>}
      </Stack>
      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {data?.notes.map((n) => <Alert key={n} severity="info" sx={{ mb: 1 }}>{n}</Alert>)}

      {data && (
        <>
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            {[
              { l: 'Gas consumed', v: `${fmt(data.total.gasMmbtu, 0)} MMBtu` },
              { l: 'Generation', v: `${fmt(data.total.generationMwh, 0)} MWh` },
              { l: 'Cost of gas', v: `$${fmt(data.total.costOfGas, 0)}` },
              { l: 'Revenue', v: `$${fmt(data.total.revenue, 0)}` },
              { l: 'Heat rate HHV', v: `${fmt(data.total.heatRateHhv, 0)} kJ/kWh` },
              { l: 'Capacity factor', v: data.total.capacityFactor == null ? '' : `${fmt(data.total.capacityFactor, 1)}%` },
            ].map((s) => (
              <Grid key={s.l} size={{ xs: 6, md: 2 }}>
                <Card variant="outlined"><CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                  <Typography variant="caption" color="text.secondary">{s.l}</Typography>
                  <Typography variant="h6">{s.v}</Typography>
                </CardContent></Card>
              </Grid>
            ))}
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Generation from {data.generationSource ?? 'no linked plant'}{data.capacityMw ? `, capacity ${data.capacityMw} MW` : ''}.
          </Typography>
          <TableContainer sx={{ maxHeight: 560, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  {cols.map((c) => <TableCell key={c.k} align="right">{c.label}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.rows.map((r) => (
                  <TableRow key={r.date} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{dayjs(r.date).format('ddd DD MMM')}</TableCell>
                    {cols.map((c) => <TableCell key={c.k} align="right">{fmt(r[c.k], c.d)}</TableCell>)}
                  </TableRow>
                ))}
                <TableRow sx={{ '& td': { fontWeight: 700, borderTop: 2, borderColor: 'divider' } }}>
                  <TableCell>Total</TableCell>
                  {cols.map((c) => <TableCell key={c.k} align="right">{fmt(data.total[c.k], c.d)}</TableCell>)}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Cost = MMBtu × gas price. Revenue = tariff × MWh × 1000 ÷ 100. Heat rate HHV = MMBtu × 10⁶ ÷ (MWh × 1000) × 1.055; LHV = HHV × 0.9. Capacity factor = MWh ÷ (24 × capacity) × 100.
          </Typography>
        </>
      )}
    </Paper>
  );
}
