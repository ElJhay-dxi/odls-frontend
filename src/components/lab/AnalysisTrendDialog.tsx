import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Divider, Stack, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import type { LabAnalysisRecord } from '../../types/lab';

const ACCENT = '#00695C';
const STATUS_COLORS: Record<string, string> = {
  Normal: '#1B5E20', Warning: '#F57C00', OutOfRange: '#B71C1C', Unknown: '#9E9E9E',
};

interface Props {
  open: boolean;
  onClose: () => void;
  anchor: LabAnalysisRecord | null;
  all: LabAnalysisRecord[];
}

const sortKey = (r: LabAnalysisRecord) => `${r.logDate.split('T')[0]} ${r.analysisTime?.slice(0, 5) ?? '00:00'} ${r.createdOn}`;

/** Returns the whole follow-up chain (root + every descendant) containing `anchor`, oldest first. */
export function buildAnalysisChain(anchor: LabAnalysisRecord, all: LabAnalysisRecord[]): LabAnalysisRecord[] {
  const byId = new Map(all.map((r) => [r.id, r]));
  let root = anchor;
  const seen = new Set<string>([root.id]);
  while (root.followUpOfAnalysisId && byId.has(root.followUpOfAnalysisId) && !seen.has(root.followUpOfAnalysisId)) {
    root = byId.get(root.followUpOfAnalysisId)!;
    seen.add(root.id);
  }
  const chain: LabAnalysisRecord[] = [root];
  const included = new Set<string>([root.id]);
  for (let i = 0; i < chain.length; i++) {
    all.filter((r) => r.followUpOfAnalysisId === chain[i].id && !included.has(r.id))
      .forEach((r) => { included.add(r.id); chain.push(r); });
  }
  return chain.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}

export default function AnalysisTrendDialog({ open, onClose, anchor, all }: Props) {
  const chain = useMemo(() => (anchor ? buildAnalysisChain(anchor, all) : []), [anchor, all]);
  const paramNames = useMemo(() => {
    const names: string[] = [];
    chain.forEach((r) => r.parameters.forEach((p) => { if (!names.includes(p.parameterName)) names.push(p.parameterName); }));
    return names;
  }, [chain]);
  const [selected, setSelected] = useState('');
  const chartParam = paramNames.includes(selected) ? selected : (paramNames[0] ?? '');

  const colLabel = (r: LabAnalysisRecord, i: number) =>
    `#${i + 1} ${dayjs(r.logDate).format('DD MMM')}${r.analysisTime ? ` ${r.analysisTime.slice(0, 5)}` : ''}`;

  const chartData = chain.map((r, i) => ({
    label: colLabel(r, i),
    value: r.parameters.find((p) => p.parameterName === chartParam)?.value ?? null,
  }));
  const unit = chain.flatMap((r) => r.parameters).find((p) => p.parameterName === chartParam)?.unit;
  const last = chain[chain.length - 1];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Follow-up Trend{anchor ? ` — ${anchor.samplePoint}` : ''}
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2.5 }}>
        {chain.length < 2 ? (
          <Typography variant="body2" color="text.secondary">This analysis is not linked to any follow-up yet.</Typography>
        ) : (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
              <Chip size="small" label={`${chain.length} linked analyses`} sx={{ backgroundColor: ACCENT, color: '#fff' }} />
              {last.actionToTake && <Chip size="small" variant="outlined" label={`Latest action: ${last.actionToTake}`} />}
            </Stack>

            <TableContainer sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Parameter</TableCell>
                    {chain.map((r, i) => (
                      <TableCell key={r.id} align="center">
                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{colLabel(r, i)}</Typography>
                        {r.labReferenceNumber && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{r.labReferenceNumber}</Typography>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paramNames.map((name) => (
                    <TableRow key={name} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{name}</TableCell>
                      {chain.map((r) => {
                        const p = r.parameters.find((x) => x.parameterName === name);
                        return (
                          <TableCell key={r.id} align="center"
                            sx={{ color: p ? STATUS_COLORS[p.status ?? 'Unknown'] : 'text.disabled', fontWeight: p ? 700 : 400 }}>
                            {p?.value ?? '—'}{p?.value != null && p.unit ? ` ${p.unit}` : ''}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Action to be taken</TableCell>
                    {chain.map((r) => (
                      <TableCell key={r.id} align="center">{r.actionToTake || '—'}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Remarks</TableCell>
                    {chain.map((r) => (
                      <TableCell key={r.id} align="center"><Typography variant="caption">{r.remarks || '—'}</Typography></TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Parameter trend</Typography>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Parameter</InputLabel>
                <Select label="Parameter" value={chartParam} onChange={(e) => setSelected(e.target.value)}>
                  {paramNames.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} label={unit ? { value: unit, angle: -90, position: 'insideLeft' } : undefined} />
                  <RTooltip />
                  <Line type="monotone" dataKey="value" name={chartParam} stroke={ACCENT} strokeWidth={2} connectNulls dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </>
        )}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button variant="outlined" onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
