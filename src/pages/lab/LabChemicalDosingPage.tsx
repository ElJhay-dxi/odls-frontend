import {
  Box, Card, CardContent, CardHeader, TextField, Button, CircularProgress, Alert, Typography,
  MenuItem, FormControl, InputLabel, Select, Grid, Divider, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Collapse,
} from '@mui/material';
import { Save, Add, Delete, LocalPharmacy, History, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { labChemicalDosingApi } from '../../api/lab/labChemicalDosingApi';
import type { PowerPlant } from '../../types/masterData';
import type { LabChemicalDosingRow } from '../../types/lab';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

const ACCENT = '#00695C';
const UNITS = ['kg', 'L', 'bags', 'drums', 'pails'];

interface DosingRowForm {
  id?: string;
  chemicalName: string; dosingPoint: string; openingStock: string;
  consumption: string; closingStock: string; unit: string; remarks: string;
}

const emptyRow: DosingRowForm = {
  chemicalName: '', dosingPoint: '', openingStock: '', consumption: '', closingStock: '', unit: 'kg', remarks: '',
};

const computeClosing = (opening: string, consumption: string) => {
  if (opening === '' && consumption === '') return '';
  return (((Number(opening) || 0) - (Number(consumption) || 0))).toString();
};

export default function LabChemicalDosingPage() {
  const { canCreate, canEdit } = useSectionPermissions('lab.dosing');
  const canSave = canCreate || canEdit;
  const isWrongPlantType = usePlantTypeGuard('thermal');
  const navigate = useNavigate();

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [rows, setRows] = useState<DosingRowForm[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [history, setHistory] = useState<LabChemicalDosingRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);

  useEffect(() => {
    powerPlantApi.getAll().then((res) =>
      setPlants(res.data.filter((p) => p.classificationType?.toLowerCase() === 'thermal'))
    );
  }, []);

  useEffect(() => {
    if (autoPlantCode) setSelectedPlant(autoPlantCode);
  }, [autoPlantCode]);

  const loadRows = useCallback(() => {
    if (!selectedPlant || !selectedDate) { setRows([]); return; }
    setLoadingRows(true); setSaveSuccess(false); setSaveError(null);
    labChemicalDosingApi.getByDate(selectedPlant, selectedDate)
      .then((res) => {
        setRows(res.data.sort((a, b) => a.sortOrder - b.sortOrder).map((r) => ({
          id: r.id,
          chemicalName: r.chemicalName,
          dosingPoint: r.dosingPoint ?? '',
          openingStock: r.openingStock?.toString() ?? '',
          consumption: r.consumption?.toString() ?? '',
          closingStock: r.closingStock?.toString() ?? '',
          unit: r.unit ?? 'kg',
          remarks: r.remarks ?? '',
        })));
      })
      .catch(() => setRows([]))
      .finally(() => setLoadingRows(false));
  }, [selectedPlant, selectedDate]);

  useEffect(() => { loadRows(); }, [loadRows]);

  const fetchHistory = useCallback(async () => {
    if (!selectedPlant) { setHistory([]); return; }
    setLoadingHistory(true);
    try {
      const res = await labChemicalDosingApi.getAll({ plantCode: selectedPlant });
      setHistory(res.data);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedPlant]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const historyGroups = (() => {
    const map = new Map<string, number>();
    history.forEach((r) => {
      const d = r.logDate.split('T')[0];
      map.set(d, (map.get(d) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([logDate, count]) => ({ logDate, count })).sort((a, b) => b.logDate.localeCompare(a.logDate));
  })();

  const updateRow = (idx: number, field: keyof DosingRowForm, value: string) => {
    setRows((prev) => prev.map((r, i) => {
      if (i !== idx) return r;
      const next = { ...r, [field]: value };
      if (field === 'openingStock' || field === 'consumption') {
        next.closingStock = computeClosing(
          field === 'openingStock' ? value : r.openingStock,
          field === 'consumption' ? value : r.consumption,
        );
      }
      return next;
    }));
  };

  const addRow = () => setRows((prev) => [...prev, { ...emptyRow }]);
  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const handleSaveAll = async () => {
    if (!selectedPlant || !selectedDate) return;
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      const payload = rows
        .filter((r) => r.chemicalName.trim())
        .map((r, idx) => ({
          id: r.id,
          chemicalName: r.chemicalName,
          dosingPoint: r.dosingPoint || null,
          openingStock: r.openingStock !== '' ? Number(r.openingStock) : null,
          consumption: r.consumption !== '' ? Number(r.consumption) : null,
          closingStock: r.closingStock !== '' ? Number(r.closingStock) : null,
          unit: r.unit || null,
          remarks: r.remarks || null,
          sortOrder: idx,
        }));
      await labChemicalDosingApi.saveAll(selectedPlant, selectedDate, payload);
      setSaveSuccess(true);
      loadRows();
      fetchHistory();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(msg ?? 'Failed to save chemical dosing rows.');
    } finally {
      setSaving(false);
    }
  };

  const showEmptyState = !selectedPlant;

  if (isWrongPlantType) return (
    <Alert severity="warning" sx={{ m: 3 }}>
      This section is only available for thermal plants.
      <Button size="small" onClick={() => navigate(-1)} sx={{ ml: 2 }}>Go Back</Button>
    </Alert>
  );

  return (
    <Box>
      <PageHeader
        title="Chemical Dosing & Consumption"
        subtitle="Daily chemical stock and dosing records"
        breadcrumbs={[{ label: 'Chemical Lab' }, { label: 'Chemical Dosing' }]}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 5 }}>
              <FormControl fullWidth required disabled={plantLocked}>
                <InputLabel>Power Plant</InputLabel>
                <Select label="Power Plant" value={selectedPlant} onChange={(e) => setSelectedPlant(e.target.value)}>
                  {availablePlants.map((p: PowerPlant) => (
                    <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Log Date" type="date" fullWidth required
                value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            {loadingRows && (
              <Grid size={{ xs: 12, sm: 3 }}>
                <CircularProgress size={20} />
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {showEmptyState ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <LocalPharmacy sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">Select a plant to load records.</Typography>
        </Box>
      ) : (
        <>
          <Card sx={{ mb: 3 }}>
            <CardHeader title={
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <LocalPharmacy sx={{ color: ACCENT }} />
                <Typography sx={{ fontWeight: 700 }}>Dosing — {dayjs(selectedDate).format('DD MMM YYYY')}</Typography>
              </Stack>
            } />
            <Divider />
            <CardContent>
              {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
              {saveSuccess && <Alert severity="success" onClose={() => setSaveSuccess(false)} sx={{ mb: 2 }}>Saved successfully.</Alert>}

              <TableContainer sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Chemical Name</TableCell>
                      <TableCell>Dosing Point</TableCell>
                      <TableCell>Opening Stock</TableCell>
                      <TableCell>Consumption</TableCell>
                      <TableCell>Closing Stock</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell>Remarks</TableCell>
                      <TableCell align="right" sx={{ width: 50 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <TextField size="small" fullWidth value={row.chemicalName}
                            onChange={(e) => updateRow(idx, 'chemicalName', e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth value={row.dosingPoint}
                            onChange={(e) => updateRow(idx, 'dosingPoint', e.target.value)} />
                        </TableCell>
                        <TableCell sx={{ width: 120 }}>
                          <TextField size="small" type="number" fullWidth value={row.openingStock}
                            onChange={(e) => updateRow(idx, 'openingStock', e.target.value)} />
                        </TableCell>
                        <TableCell sx={{ width: 120 }}>
                          <TextField size="small" type="number" fullWidth value={row.consumption}
                            onChange={(e) => updateRow(idx, 'consumption', e.target.value)} />
                        </TableCell>
                        <TableCell sx={{ width: 120 }}>
                          <TextField size="small" type="number" fullWidth value={row.closingStock}
                            onChange={(e) => updateRow(idx, 'closingStock', e.target.value)} />
                        </TableCell>
                        <TableCell sx={{ width: 110 }}>
                          <FormControl size="small" fullWidth>
                            <Select value={row.unit} onChange={(e) => updateRow(idx, 'unit', e.target.value)}>
                              {UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <TextField size="small" fullWidth value={row.remarks}
                            onChange={(e) => updateRow(idx, 'remarks', e.target.value)} />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" color="error" onClick={() => removeRow(idx)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Stack direction="row" spacing={1.5}>
                {canSave && (
                  <Button variant="outlined" size="small" startIcon={<Add />} onClick={addRow}>Add Row</Button>
                )}
                {canSave && (
                  <Button variant="contained" size="small" sx={{ backgroundColor: ACCENT }}
                    startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}
                    onClick={handleSaveAll} disabled={saving}>
                    {saving ? 'Saving...' : 'Save All'}
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <Box sx={{
              px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', backgroundColor: `${ACCENT}14`,
              borderBottom: historyCollapsed ? 'none' : '1px solid', borderColor: 'divider',
            }} onClick={() => setHistoryCollapsed((p) => !p)}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <History sx={{ color: ACCENT, fontSize: '1.1rem' }} />
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: ACCENT }}>History</Typography>
                <Chip label={historyGroups.length} size="small" variant="outlined" />
              </Stack>
              <IconButton size="small">{historyCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}</IconButton>
            </Box>
            <Collapse in={!historyCollapsed} timeout="auto" unmountOnExit>
              <CardContent>
                {loadingHistory ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
                ) : historyGroups.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No dosing records for this plant yet.</Typography>
                ) : (
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Chemicals Recorded</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {historyGroups.map((g) => (
                          <TableRow key={g.logDate} hover selected={g.logDate === selectedDate}
                            sx={{ cursor: 'pointer' }} onClick={() => setSelectedDate(g.logDate)}>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{dayjs(g.logDate).format('DD MMM YYYY')}</Typography></TableCell>
                            <TableCell>{g.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Collapse>
          </Card>
        </>
      )}
    </Box>
  );
}
