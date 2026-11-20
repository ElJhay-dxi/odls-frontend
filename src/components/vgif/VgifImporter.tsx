import { useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, FormControl, FormControlLabel, InputLabel, MenuItem,
  Select, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { ContentPaste, UploadFile, Visibility, Save, Clear } from '@mui/icons-material';
import dayjs from 'dayjs';
import {
  vgifApi, apiError, btuPerScf, fmt, type VgifKind, type VgifPoint, type VgifPreview, type VgifPreviewRow,
} from '../../api/vgif/vgifApi';

interface Props {
  kind: VgifKind;
  points: VgifPoint[];
  pointId: string;
  onPointChange: (id: string) => void;
  date: string;
  onDateChange: (d: string) => void;
  canCreate: boolean;
  canOverwrite: boolean;
  canImportHistory: boolean;
  onImported: () => void;
}

const STATUS: Record<VgifPreviewRow['status'], { label: string; color: 'success' | 'default' | 'warning' | 'error' }> = {
  new: { label: 'New', color: 'success' },
  same: { label: 'Already stored', color: 'default' },
  changed: { label: 'Differs', color: 'warning' },
  invalid: { label: 'Problem', color: 'error' },
};

const MAX_BYTES = 20 * 1024 * 1024;

/** Paste or upload a VGIF export, preview what is new, then save. Shared by the AG15 and AG12 pages. */
export default function VgifImporter(p: Props) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [includeAll, setIncludeAll] = useState(false);
  const [preview, setPreview] = useState<VgifPreview | null>(null);
  const [overwrite, setOverwrite] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const eligible = useMemo(() => p.points.filter((x) => x.isActive && (p.kind === 'ag15' ? x.hasAg15 : x.hasAg12)), [p.points, p.kind]);
  const point = eligible.find((x) => x.id === p.pointId);
  const reset = () => { setPreview(null); setOverwrite([]); setDone(null); setError(null); };

  const request = (ow: string[] = []) => ({
    pointId: p.pointId, date: includeAll ? null : p.date, includeAllDates: includeAll, text, fileName, overwrite: ow,
  });

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_BYTES) { setError('That file is larger than 20 MB. Export a shorter date range.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ''));
      setFileName(f.name);
      reset();
      // Pick the point from the file name when exactly one point code appears in it (e.g. "ktpsconsup.tsv").
      const name = f.name.toLowerCase();
      const hits = eligible.filter((x) => name.includes(x.code.toLowerCase()));
      if (hits.length === 1) p.onPointChange(hits[0].id);
    };
    reader.onerror = () => setError('Could not read that file.');
    reader.readAsText(f);
  };

  const pasteFromClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) { setText(t); setFileName(null); reset(); }
    } catch { setError('The browser blocked clipboard access. Click in the box and press Ctrl+V instead.'); }
  };

  const runPreview = async () => {
    reset(); setBusy(true);
    try { setPreview((await vgifApi.preview(p.kind, request())).data); }
    catch (e) { setError(apiError(e, 'Could not read the export.')); }
    finally { setBusy(false); }
  };

  const runImport = async () => {
    setBusy(true); setError(null);
    try {
      const r = (await vgifApi.import(p.kind, request(overwrite))).data;
      setDone(r.message);
      setPreview(null); setOverwrite([]); setText(''); setFileName(null);
      p.onImported();
    } catch (e) { setError(apiError(e, 'Could not save the readings.')); }
    finally { setBusy(false); }
  };

  const changedKeys = preview?.rows.filter((r) => r.status === 'changed').map((r) => r.key) ?? [];
  const toSave = (preview?.new ?? 0) + overwrite.length;
  const blocked = !preview || preview.errors.length > 0 || toSave === 0 || busy;
  const toggle = (k: string) => setOverwrite((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]));

  if (!p.canCreate) {
    return <Alert severity="info">You can view VGIF readings but do not have permission to record them.</Alert>;
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel>Metering point</InputLabel>
            <Select label="Metering point" value={point ? p.pointId : ''} onChange={(e) => { p.onPointChange(String(e.target.value)); reset(); }}>
              {eligible.map((x) => <MenuItem key={x.id} value={x.id}>{x.code} · {x.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" type="date" label="Reading date" value={p.date} disabled={includeAll}
            onChange={(e) => { p.onDateChange(e.target.value); reset(); }}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: dayjs().format('YYYY-MM-DD') } }}
            helperText={p.kind === 'ag12' ? 'The day before is included too (rolling 24-hour export)' : 'Only this day is taken from the export'} />
          {p.canImportHistory && (
            <FormControlLabel
              control={<Switch checked={includeAll} onChange={(e) => { setIncludeAll(e.target.checked); reset(); }} />}
              label={<Tooltip title="Bring in every date in the export (past data). Rows already stored are skipped."><span>Include all dates</span></Tooltip>} />
          )}
        </Stack>

        <TextField multiline minRows={5} maxRows={12} fullWidth value={text}
          placeholder="Paste the export here (copy from the VGIF server, including the header row), or upload the .tsv file."
          onChange={(e) => { setText(e.target.value); setFileName(null); reset(); }}
          slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre' } } }} />

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 1.5 }} useFlexGap>
          <Button size="small" startIcon={<ContentPaste />} onClick={pasteFromClipboard}>Paste</Button>
          <Button size="small" startIcon={<UploadFile />} onClick={() => fileRef.current?.click()}>Upload file</Button>
          <input ref={fileRef} type="file" hidden accept=".tsv,.txt,.csv,text/plain,text/tab-separated-values"
            onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
          {text && <Button size="small" color="inherit" startIcon={<Clear />} onClick={() => { setText(''); setFileName(null); reset(); }}>Clear</Button>}
          {fileName && <Chip size="small" label={fileName} />}
          {text && <Typography variant="caption" color="text.secondary">{text.split('\n').filter((l) => l.trim()).length} lines</Typography>}
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" startIcon={<Visibility />} disabled={!text.trim() || !point || busy || (!includeAll && !p.date)} onClick={runPreview}>
            Preview
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {done && <Alert severity="success" sx={{ mt: 2 }}>{done}</Alert>}

        {preview && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 1 }}>
              <Chip label={`${preview.rowsInFile} rows in export`} />
              {preview.firstInFile && <Chip variant="outlined" label={`${dayjs(preview.firstInFile).format('DD MMM YYYY')} to ${dayjs(preview.lastInFile).format('DD MMM YYYY')}`} />}
              <Chip color="success" label={`${preview.new} new`} />
              <Chip label={`${preview.same} already stored`} />
              {preview.changed > 0 && <Chip color="warning" label={`${preview.changed} differ from stored`} />}
              {preview.invalid > 0 && <Chip color="error" label={`${preview.invalid} with problems`} />}
              {preview.otherDates > 0 && <Chip variant="outlined" label={`${preview.otherDates} for other dates (ignored)`} />}
              {preview.duplicatesInFile > 0 && <Chip variant="outlined" label={`${preview.duplicatesInFile} duplicates`} />}
            </Stack>

            {preview.errors.map((m) => <Alert key={m} severity="error" sx={{ mb: 1 }}>{m}</Alert>)}
            {preview.warnings.map((m) => <Alert key={m} severity="warning" sx={{ mb: 1 }}>{m}</Alert>)}

            {p.kind === 'ag12' && Object.keys(preview.dayCounts).length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                {Object.entries(preview.dayCounts).map(([d, n]) => (
                  <Chip key={d} size="small" variant="outlined" color={n >= 288 ? 'success' : 'default'}
                    label={`${dayjs(d).format('DD MMM')}: ${n}/288 after import`} />
                ))}
              </Stack>
            )}

            {preview.rows.length > 0 && (
              <PreviewTable kind={p.kind} rows={preview.rows} overwrite={overwrite} canOverwrite={p.canOverwrite}
                onToggle={toggle} allChanged={changedKeys}
                onToggleAll={(on) => setOverwrite(on ? changedKeys : [])} />
            )}
            {preview.rows.length === 0 && preview.errors.length === 0 && (
              <Alert severity="info">Everything in this export for {includeAll ? 'these dates' : dayjs(p.date).format('DD MMM YYYY')} is already stored.</Alert>
            )}

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'flex-end', mt: 2 }}>
              {preview.changed > 0 && !p.canOverwrite && (
                <Typography variant="caption" color="text.secondary">Replacing stored readings needs the edit permission.</Typography>
              )}
              <Button variant="contained" startIcon={<Save />} disabled={blocked} onClick={runImport}>
                Save {preview.new > 0 ? `${preview.new} new` : ''}{preview.new > 0 && overwrite.length > 0 ? ' and ' : ''}{overwrite.length > 0 ? `replace ${overwrite.length}` : ''}
              </Button>
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function PreviewTable({ kind, rows, overwrite, canOverwrite, onToggle, allChanged, onToggleAll }: {
  kind: VgifKind; rows: VgifPreviewRow[]; overwrite: string[]; canOverwrite: boolean;
  onToggle: (k: string) => void; allChanged: string[]; onToggleAll: (on: boolean) => void;
}) {
  const ag15 = kind === 'ag15';
  const v = (r: VgifPreviewRow, k: string) => r.values[k] ?? null;
  const all = allChanged.length > 0 && allChanged.every((k) => overwrite.includes(k));
  return (
    <TableContainer sx={{ maxHeight: 440, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {canOverwrite && (
              <TableCell padding="checkbox">
                <Tooltip title="Replace the stored values with the export for every row that differs">
                  <span><Checkbox size="small" disabled={allChanged.length === 0} checked={all} onChange={(e) => onToggleAll(e.target.checked)} /></span>
                </Tooltip>
              </TableCell>
            )}
            <TableCell>Status</TableCell>
            <TableCell>{ag15 ? 'Date' : 'Time'}</TableCell>
            {ag15 ? (
              <>
                <TableCell align="right">Energy totalizer (MMBtu)</TableCell>
                <TableCell align="right">Consumption (MMBtu)</TableCell>
                <TableCell align="right">Meter daily (MMBtu)</TableCell>
                <TableCell align="right">Daily volume (Sm³)</TableCell>
                <TableCell align="right">CV (kWh/Sm³)</TableCell>
                <TableCell align="right">Btu/SCF</TableCell>
              </>
            ) : (
              <>
                <TableCell align="right">CV (kWh/Sm³)</TableCell>
                <TableCell align="right">Std density</TableCell>
                <TableCell align="right">Methane %</TableCell>
                <TableCell align="right">CO₂ %</TableCell>
                <TableCell align="right">N₂ %</TableCell>
              </>
            )}
            <TableCell>Notes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => {
            const s = STATUS[r.status];
            return (
              <TableRow key={r.key} hover>
                {canOverwrite && (
                  <TableCell padding="checkbox">
                    {r.status === 'changed' && <Checkbox size="small" checked={overwrite.includes(r.key)} onChange={() => onToggle(r.key)} />}
                  </TableCell>
                )}
                <TableCell><Chip size="small" color={s.color} label={s.label} /></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {ag15 ? dayjs(r.date).format('DD MMM YYYY') : `${dayjs(r.date).format('DD MMM')} ${r.time.slice(0, 5)}`}
                </TableCell>
                {ag15 ? (
                  <>
                    <TableCell align="right">{fmt(v(r, 'EnergyTotalizer'), 0)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{fmt(r.consumption, 0)}</TableCell>
                    <TableCell align="right">{fmt(v(r, 'DailyEnergyYesterday'), 0)}</TableCell>
                    <TableCell align="right">{fmt(r.dailyVolume, 0)}</TableCell>
                    <TableCell align="right">{fmt(v(r, 'CalorificDailyMean'), 4)}</TableCell>
                    <TableCell align="right">{fmt(btuPerScf(v(r, 'CalorificDailyMean')), 2)}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell align="right">{fmt(v(r, 'CalorificValue'), 4)}</TableCell>
                    <TableCell align="right">{fmt(v(r, 'StandardDensity'), 4)}</TableCell>
                    <TableCell align="right">{fmt(v(r, 'Methane'), 3)}</TableCell>
                    <TableCell align="right">{fmt(v(r, 'CarbonDioxide'), 3)}</TableCell>
                    <TableCell align="right">{fmt(v(r, 'Nitrogen'), 3)}</TableCell>
                  </>
                )}
                <TableCell sx={{ minWidth: 220 }}>
                  {r.totalizerFlag === 'rollover' && <Chip size="small" variant="outlined" label="Totalizer rolled over" sx={{ mr: 0.5 }} />}
                  {r.problems.map((m) => <Typography key={m} variant="caption" color="error.main" sx={{ display: 'block' }}>{m}</Typography>)}
                  {r.changes.map((c) => (
                    <Typography key={c.field} variant="caption" color="warning.dark" sx={{ display: 'block' }}>
                      {c.label}: stored {fmt(c.stored, 4)}, export {fmt(c.inFile, 4)}
                    </Typography>
                  ))}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
