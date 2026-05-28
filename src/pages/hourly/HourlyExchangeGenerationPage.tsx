import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip,
} from '@mui/material';
import { Save, Search, Edit, Delete, ElectricBolt, History } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { hourlyExchangeGenerationApi } from '../../api/hourly/hourlyExchangeGenerationApi';
import type { HourlyExchangeGeneration, ExchangeGenerationForm } from '../../types/hourlyExchangeGeneration';

const HOURS = Array.from({ length: 24 }, (_, i) => i + 1);

const UTILITIES = [
  { key: 'cieMW',     label: 'CIE',     color: '#B71C1C' },
  { key: 'sonabelMW', label: 'SONABEL', color: '#1565C0' },
  { key: 'tTagMW',    label: 'T-TAG',   color: '#1B5E20' },
  { key: 'bTagMW',    label: 'B-TAG',   color: '#4A148C' },
  { key: 'cgtMW',     label: 'CGT',     color: '#E65100' },
  { key: 'caiMW',     label: 'CAI',     color: '#006064' },
  { key: 'cebMW',     label: 'CEB',     color: '#37474F' },
];

const emptyForm: ExchangeGenerationForm = {
  logDate: new Date().toISOString().split('T')[0],
  logHour: new Date().getHours() + 1,
  cieMW: '', sonabelMW: '', tTagMW: '',
  bTagMW: '', cgtMW: '', caiMW: '', cebMW: '',
};

const toNum = (v: unknown) => v === '' || v === undefined || v === null ? undefined : Number(v);

export default function HourlyExchangeGenerationPage() {
  const [form, setForm] = useState<ExchangeGenerationForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<Partial<ExchangeGenerationForm>>({});
  const [editTarget, setEditTarget] = useState<HourlyExchangeGeneration | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<HourlyExchangeGeneration[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<HourlyExchangeGeneration | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeForm = editTarget
    ? (updateForm as unknown as Record<string, unknown>)
    : (form as unknown as Record<string, unknown>);

  const fv = (key: string) => String(activeForm[key] ?? '');
  const setField = (key: string, val: string) => {
    if (editTarget) setUpdateForm((prev) => ({ ...prev, [key]: val }));
    else setForm((prev) => ({ ...prev, [key]: val } as ExchangeGenerationForm));
  };

  const fetchRecords = useCallback(async () => {
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const res = await hourlyExchangeGenerationApi.getAll(filterDate);
      setRecords(res.data);
    } catch {
      setRecordsError('Failed to load records.');
    } finally {
      setLoadingRecords(false);
    }
  }, [filterDate]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const openEdit = (row: HourlyExchangeGeneration) => {
    setEditTarget(row);
    setSaveError(null);
    setSaveSuccess(false);
    setUpdateForm({
      cieMW: row.cieMW ?? '', sonabelMW: row.sonabelMW ?? '',
      tTagMW: row.tTagMW ?? '', bTagMW: row.bTagMW ?? '',
      cgtMW: row.cgtMW ?? '', caiMW: row.caiMW ?? '', cebMW: row.cebMW ?? '',
    });
  };

  const cancelEdit = () => { setEditTarget(null); setUpdateForm({}); };

  const buildPayload = (f: Record<string, unknown>) => ({
    cieMW: toNum(f.cieMW), sonabelMW: toNum(f.sonabelMW),
    tTagMW: toNum(f.tTagMW), bTagMW: toNum(f.bTagMW),
    cgtMW: toNum(f.cgtMW), caiMW: toNum(f.caiMW), cebMW: toNum(f.cebMW),
  });

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      if (editTarget) {
        await hourlyExchangeGenerationApi.update(editTarget.id, buildPayload(updateForm as Record<string, unknown>));
        cancelEdit();
      } else {
        await hourlyExchangeGenerationApi.create({
          logDate: form.logDate,
          logHour: Number(form.logHour),
          ...buildPayload(form as unknown as Record<string, unknown>),
        });
        setForm(emptyForm);
      }
      setSaveSuccess(true);
      fetchRecords();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(msg ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await hourlyExchangeGenerationApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
    } catch {
      setRecordsError('Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid = editTarget ? true : form.logDate && form.logHour;

  return (
    <Box>
      <PageHeader
        title="Hourly Exchange Generation"
        subtitle="Hourly MW exchange values with interconnected utilities — entered by AGS"
        breadcrumbs={[{ label: 'Hourly Readings' }, { label: 'Exchange Generation' }]}
      />

      <Grid container spacing={3}>
        {/* ── Left: Entry form ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <ElectricBolt sx={{ color: '#1565C0' }} />
                  <Typography sx={{ fontWeight: 700 }}>
                    {editTarget
                      ? `Editing: ${editTarget.logDate?.split('T')[0]} Hour ${editTarget.logHour}`
                      : 'New Reading'}
                  </Typography>
                  {editTarget && (
                    <Chip label="Edit Mode" size="small" color="warning" onDelete={cancelEdit} />
                  )}
                </Stack>
              }
            />
            <Divider />
            <CardContent>
              {saveError && (
                <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>
              )}
              {saveSuccess && (
                <Alert severity="success" onClose={() => setSaveSuccess(false)} sx={{ mb: 2 }}>
                  Reading saved successfully.
                </Alert>
              )}

              {/* Identity */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Log Identity
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Log Date" type="date" fullWidth required
                      value={editTarget ? editTarget.logDate?.split('T')[0] : form.logDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, logDate: e.target.value }))}
                      disabled={!!editTarget}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required disabled={!!editTarget}>
                      <InputLabel>Hour</InputLabel>
                      <Select
                        label="Hour"
                        value={editTarget ? editTarget.logHour : form.logHour}
                        onChange={(e) => setForm((prev) => ({ ...prev, logHour: Number(e.target.value) }))}
                      >
                        {HOURS.map((h) => (
                          <MenuItem key={h} value={h}>{String(h).padStart(2, '0')}:00</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Paper>

              {/* Utility readings */}
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Utility</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>MW</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {UTILITIES.map((u) => (
                      <TableRow key={u.key}>
                        <TableCell>
                          <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: u.color, flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{u.label}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number" size="small" fullWidth
                            value={fv(u.key)}
                            onChange={(e) => setField(u.key, e.target.value)}
                            slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">MW</Typography> } }}
                            sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
                {editTarget && (
                  <Button variant="outlined" onClick={cancelEdit} disabled={saving}>Cancel</Button>
                )}
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving || !isFormValid}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                  sx={{ minWidth: 140 }}
                >
                  {saving ? 'Saving...' : editTarget ? 'Update Reading' : 'Save Reading'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Right: Records ── */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                  <History sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                  <Typography sx={{ fontWeight: 700 }}>Logged Readings</Typography>
                </Stack>
              }
            />
            <Divider />
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <TextField
                  label="Date" type="date" size="small" value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  sx={{ flex: 1 }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Button
                  variant="outlined" size="small"
                  startIcon={loadingRecords ? <CircularProgress size={14} /> : <Search />}
                  onClick={fetchRecords}
                  disabled={loadingRecords}
                >
                  {loadingRecords ? 'Loading...' : 'Load'}
                </Button>
              </Stack>

              {recordsError && (
                <Alert severity="error" onClose={() => setRecordsError(null)} sx={{ mb: 1.5 }}>{recordsError}</Alert>
              )}

              {records.length === 0 && !loadingRecords ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <ElectricBolt sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No records for selected date.</Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: 520 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Hour</TableCell>
                        {UTILITIES.map((u) => (
                          <TableCell key={u.key} sx={{ color: u.color, fontWeight: 700 }}>{u.label}</TableCell>
                        ))}
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {records.map((row) => (
                        <TableRow key={row.id} selected={editTarget?.id === row.id} hover>
                          <TableCell>
                            <Chip
                              label={`${String(row.logHour).padStart(2, '0')}:00`}
                              size="small" variant="outlined"
                              sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                            />
                          </TableCell>
                          {UTILITIES.map((u) => (
                            <TableCell key={u.key}>
                              <Typography variant="body2">
                                {(row as unknown as Record<string, unknown>)[u.key] != null
                                  ? String((row as unknown as Record<string, unknown>)[u.key])
                                  : '—'}
                              </Typography>
                            </TableCell>
                          ))}
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton size="small" color="primary" onClick={() => openEdit(row)}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Record"
        message={`Delete exchange generation for ${deleteTarget?.logDate?.split('T')[0]} hour ${deleteTarget?.logHour}?`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}