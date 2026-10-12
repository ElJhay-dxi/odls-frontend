import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, FormControl, InputLabel, MenuItem, Select,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Chip,
} from '@mui/material';
import { Save } from '@mui/icons-material';
import axiosInstance from '../../api/axiosInstance';
import { DESAL_SECTIONS } from '../../pages/lab/desalinationConfig';
import type { PowerPlant } from '../../types/masterData';

const ACCENT = '#00695C';

interface LimitRow { section: string; field: string; label: string; unit?: string | null; minValue?: number | null; maxValue?: number | null }
type Draft = Record<string, { min: string; max: string }>;

const idOf = (section: string, field: string) => `${section}|${field}`;

interface Props {
  plants: PowerPlant[];
  canEdit: boolean;
}

/** Admin screen: acceptable min/max per desalination parameter. Readings outside them raise automatic timeline entries. */
export default function DesalLimitsManager({ plants, canEdit }: Props) {
  const [scope, setScope] = useState(''); // '' = defaults for every plant
  const [draft, setDraft] = useState<Draft>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [filter, setFilter] = useState('');

  // Every numeric parameter from the logsheet config
  const rows = useMemo(() => DESAL_SECTIONS.flatMap((sec) =>
    sec.groups.flatMap((g) => g.fields
      .filter((f) => f.kind !== 'text')
      .map((f) => ({
        section: sec.key, sectionLabel: sec.label, group: g.title, field: f.key,
        label: g.title.startsWith('Overall') || g.title === sec.label ? f.label : `${g.title} – ${f.label}`,
        unit: f.unit,
      })))), []);

  const load = useCallback(() => {
    setLoading(true); setError(null); setSaved(false);
    axiosInstance.get<LimitRow[]>('/labdesalinationlimits', { params: { plantCode: scope } })
      .then((res) => {
        const d: Draft = {};
        res.data.forEach((l) => {
          d[idOf(l.section, l.field)] = {
            min: l.minValue != null ? String(l.minValue) : '',
            max: l.maxValue != null ? String(l.maxValue) : '',
          };
        });
        setDraft(d);
      })
      .catch(() => setError('Failed to load limits.'))
      .finally(() => setLoading(false));
  }, [scope]);

  useEffect(() => { load(); }, [load]);

  const setVal = (id: string, which: 'min' | 'max', v: string) => {
    setDraft((p) => ({ ...p, [id]: { min: p[id]?.min ?? '', max: p[id]?.max ?? '', [which]: v } }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true); setError(null); setSaved(false);
    try {
      const items = rows.map((r) => {
        const d = draft[idOf(r.section, r.field)];
        return {
          section: r.section, field: r.field, label: r.label, unit: r.unit || null,
          minValue: d && d.min !== '' ? Number(d.min) : null,
          maxValue: d && d.max !== '' ? Number(d.max) : null,
        };
      });
      await axiosInstance.put('/labdesalinationlimits', { plantCode: scope, items });
      setSaved(true);
      load();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save limits.');
    } finally {
      setSaving(false);
    }
  };

  const shown = rows.filter((r) => !filter || `${r.sectionLabel} ${r.label}`.toLowerCase().includes(filter.toLowerCase()));
  const setCount = Object.values(draft).filter((d) => d.min !== '' || d.max !== '').length;

  return (
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Set the acceptable range for each parameter. When a reading is saved outside its range, a timeline entry is added
          automatically for that day. Leave both boxes empty for no limit. Limits set for a plant override the defaults for all plants.
        </Typography>
        {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
        {saved && <Alert severity="success" sx={{ mb: 2 }}>Limits saved.</Alert>}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, alignItems: { sm: 'center' } }}>
          <FormControl size="small" sx={{ minWidth: 280 }}>
            <InputLabel>Applies to</InputLabel>
            <Select label="Applies to" value={scope} onChange={(e) => setScope(e.target.value)}>
              <MenuItem value="">All plants (default)</MenuItem>
              {plants.map((p) => <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="Filter parameters" value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 240 }} />
          <Chip label={`${setCount} limit${setCount === 1 ? '' : 's'} set`} size="small" variant="outlined" />
          {loading && <CircularProgress size={20} />}
          <Box sx={{ flex: 1 }} />
          {canEdit && (
            <Button variant="contained" sx={{ backgroundColor: ACCENT }} onClick={handleSave} disabled={saving || loading}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}>
              {saving ? 'Saving...' : 'Save Limits'}
            </Button>
          )}
        </Stack>

        <TableContainer sx={{ maxHeight: 560, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Section</TableCell>
                <TableCell>Parameter</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell sx={{ width: 140 }}>Min</TableCell>
                <TableCell sx={{ width: 140 }}>Max</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shown.map((r) => {
                const id = idOf(r.section, r.field);
                const d = draft[id] ?? { min: '', max: '' };
                return (
                  <TableRow key={id} hover>
                    <TableCell>{r.sectionLabel}</TableCell>
                    <TableCell>{r.label}</TableCell>
                    <TableCell>{r.unit || '—'}</TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={d.min} disabled={!canEdit}
                        onChange={(e) => setVal(id, 'min', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={d.max} disabled={!canEdit}
                        onChange={(e) => setVal(id, 'max', e.target.value)} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
