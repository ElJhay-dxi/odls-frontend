import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Checkbox, FormControl, InputLabel, LinearProgress, ListItemText, MenuItem, OutlinedInput, Paper, Select, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import { vgifApi, vgifAnalysisApi, apiError, fmt, AG12_FIELDS, type VgifAg12Series, type VgifPoint } from '../../api/vgif/vgifApi';

const COLORS = ['#1565c0', '#e65100', '#2e7d32', '#6a1b9a', '#c62828', '#00838f'];
const RANGES = [
  { label: '7 days', days: 7 }, { label: '30 days', days: 30 }, { label: '90 days', days: 90 }, { label: '1 year', days: 365 },
];

export default function VgifAg12AnalysisPage() {
  const [points, setPoints] = useState<VgifPoint[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [field, setField] = useState('CalorificValue');
  const [band, setBand] = useState<'mean' | 'range'>('mean');
  const [from, setFrom] = useState(dayjs().subtract(29, 'day').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [data, setData] = useState<VgifAg12Series[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    vgifApi.getPoints().then((r) => {
      const ag12 = r.data.filter((p) => p.hasAg12);
      setPoints(ag12);
      setSelected(ag12.slice(0, 1).map((p) => p.id));
    }).catch(() => setPoints([]));
  }, []);

  useEffect(() => {
    if (selected.length === 0 || !from || !to) { setData([]); return; }
    setLoading(true); setError(null);
    vgifAnalysisApi.ag12(selected, from, to).then((r) => setData(r.data))
      .catch((e) => setError(apiError(e, 'Could not load the analysis.'))).finally(() => setLoading(false));
  }, [selected, from, to]);

  const def = AG12_FIELDS.find((f) => f.key === field)!;
  const chart = useMemo(() => {
    const dates = [...new Set(data.flatMap((s) => s.days.map((d) => d.date.slice(0, 10))))].sort();
    return dates.map((date) => {
      const row: Record<string, string | number | null> = { date: dayjs(date).format('DD MMM') };
      for (const s of data) {
        const st = s.days.find((d) => d.date.slice(0, 10) === date)?.fields[field];
        row[s.code] = st?.mean ?? null;
        row[`${s.code} min`] = st?.min ?? null;
        row[`${s.code} max`] = st?.max ?? null;
      }
      return row;
    });
  }, [data, field]);

  return (
    <Box>
      <PageHeader title="AG12 Analysis" subtitle="Gas composition and quality trends from the 5-minute chromatograph readings"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'VGIF Master Readings' }, { label: 'AG12 Analysis' }]} />
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2, alignItems: { md: 'center' }, flexWrap: 'wrap' }} useFlexGap>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Metering points</InputLabel>
            <Select multiple value={selected} input={<OutlinedInput label="Metering points" />}
              onChange={(e) => setSelected(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              renderValue={(ids) => points.filter((p) => ids.includes(p.id)).map((p) => p.code).join(', ')}>
              {points.map((p) => (
                <MenuItem key={p.id} value={p.id}><Checkbox size="small" checked={selected.includes(p.id)} /><ListItemText primary={`${p.code} · ${p.name}`} /></MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Value</InputLabel>
            <Select label="Value" value={field} onChange={(e) => setField(String(e.target.value))}>
              {AG12_FIELDS.map((f) => <MenuItem key={f.key} value={f.key}>{f.label}{f.unit ? ` (${f.unit})` : ''}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <Stack direction="row" spacing={0.5}>
            {RANGES.map((r) => (
              <ToggleButton key={r.label} size="small" value={r.days} selected={false}
                onClick={() => { setTo(dayjs().format('YYYY-MM-DD')); setFrom(dayjs().subtract(r.days - 1, 'day').format('YYYY-MM-DD')); }}>
                {r.label}
              </ToggleButton>
            ))}
          </Stack>
          <ToggleButtonGroup size="small" exclusive value={band} onChange={(_, v) => v && setBand(v)}>
            <ToggleButton value="mean">Daily mean</ToggleButton>
            <ToggleButton value="range">Mean, min and max</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        {loading && <LinearProgress sx={{ mb: 1 }} />}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Typography variant="subtitle2" sx={{ mb: 1 }}>{def.label}{def.unit ? ` (${def.unit})` : ''}, daily</Typography>
        <Box sx={{ height: 340, mb: 2 }}>
          {chart.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No AG12 readings for this range.</Typography>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} width={70} tickFormatter={(v: number) => fmt(v, 3)} />
                <Tooltip formatter={(v) => fmt(v as number, 4)} />
                <Legend />
                {data.map((s, i) => [
                  <Line key={s.code} type="monotone" dataKey={s.code} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} connectNulls />,
                  band === 'range' && <Line key={`${s.code}min`} type="monotone" dataKey={`${s.code} min`} stroke={COLORS[i % COLORS.length]} strokeDasharray="4 3" strokeWidth={1} dot={false} connectNulls legendType="none" />,
                  band === 'range' && <Line key={`${s.code}max`} type="monotone" dataKey={`${s.code} max`} stroke={COLORS[i % COLORS.length]} strokeDasharray="4 3" strokeWidth={1} dot={false} connectNulls legendType="none" />,
                ])}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Box>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>Over the whole range</Typography>
        <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Value</TableCell>
                {data.map((s) => <TableCell key={s.code} align="right" colSpan={4}>{s.code}</TableCell>)}
              </TableRow>
              <TableRow>
                <TableCell />
                {data.map((s) => ['Mean', 'Min', 'Max', 'Std dev'].map((h) => <TableCell key={s.code + h} align="right" sx={{ color: 'text.secondary' }}>{h}</TableCell>))}
              </TableRow>
            </TableHead>
            <TableBody>
              {AG12_FIELDS.map((f) => (
                <TableRow key={f.key} hover selected={f.key === field} onClick={() => setField(f.key)} sx={{ cursor: 'pointer' }}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{f.label}{f.unit ? ` (${f.unit})` : ''}</TableCell>
                  {data.map((s) => [
                    <TableCell key={s.code + 'a'} align="right">{fmt(s.overall[f.key]?.mean, 4)}</TableCell>,
                    <TableCell key={s.code + 'b'} align="right">{fmt(s.overall[f.key]?.min, 4)}</TableCell>,
                    <TableCell key={s.code + 'c'} align="right">{fmt(s.overall[f.key]?.max, 4)}</TableCell>,
                    <TableCell key={s.code + 'd'} align="right">{fmt(s.stdDev[f.key], 4)}</TableCell>,
                  ])}
                </TableRow>
              ))}
              <TableRow>
                <TableCell>Readings</TableCell>
                {data.map((s) => (
                  <TableCell key={s.code} align="right" colSpan={4}>
                    {s.readings.toLocaleString()} of {s.expected.toLocaleString()} ({s.expected ? Math.round((s.readings / s.expected) * 100) : 0}%)
                    {s.abnormal > 0 && <Typography component="span" variant="caption" color="warning.main"> · {s.abnormal} with abnormal states</Typography>}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="text.secondary">Click a row to chart that value.</Typography>
      </Paper>
    </Box>
  );
}
