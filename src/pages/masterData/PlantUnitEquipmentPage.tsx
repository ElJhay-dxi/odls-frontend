import {
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Button, CircularProgress,
  Alert, Tooltip, Typography, MenuItem, FormControl, InputLabel,
  Select, Grid, Divider, Stack, InputAdornment,
} from '@mui/material';
import { Edit, Delete, Add, FilterList, Tune } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { plantUnitEquipmentApi } from '../../api/masterData/plantUnitEquipmentApi';
import { plantUnitSystemApi } from '../../api/masterData/plantUnitSystemApi';
import { plantUnitSubSystemApi } from '../../api/masterData/plantUnitSubSystemApi';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import type { PlantUnitEquipment, PlantUnitEquipmentForm, PowerPlant, PlantUnit, PlantUnitSystem, PlantUnitSubSystem } from '../../types/masterData';

const emptyForm: PlantUnitEquipmentForm = {
  plantName: '', plantCode: '', unitName: '', unitCode: '',
  systemName: '', systemCode: '', subSystemName: '', subSystemCode: '',
  equipmentName: '', equipmentCode: '', multiplier: 1,
};

export default function PlantUnitEquipmentPage() {
  const { accounts } = useMsal();
  const user = accounts[0];

  const [rows, setRows] = useState<PlantUnitEquipment[]>([]);
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [units, setUnits] = useState<PlantUnit[]>([]);
  const [systems, setSystems] = useState<PlantUnitSystem[]>([]);
  const [subSystems, setSubSystems] = useState<PlantUnitSubSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterPlantCode, setFilterPlantCode] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlantUnitEquipment | null>(null);
  const [form, setForm] = useState<PlantUnitEquipmentForm>(emptyForm);
  const [formUnits, setFormUnits] = useState<PlantUnit[]>([]);
  const [formSystems, setFormSystems] = useState<PlantUnitSystem[]>([]);
  const [formSubSystems, setFormSubSystems] = useState<PlantUnitSubSystem[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PlantUnitEquipment | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([powerPlantApi.getAll(), plantUnitApi.getAll(), plantUnitSystemApi.getAll(), plantUnitSubSystemApi.getAll()])
      .then(([p, u, s, ss]) => { setPlants(p.data); setUnits(u.data); setSystems(s.data); setSubSystems(ss.data); })
      .catch(() => setError('Failed to load reference data.'));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await plantUnitEquipmentApi.getAll();
      const filtered = filterPlantCode ? res.data.filter((r) => r.plantCode === filterPlantCode) : res.data;
      setRows(filtered);
    } catch { setError('Failed to load equipment.'); } finally { setLoading(false); }
  }, [filterPlantCode]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleFormPlantChange = (plantCode: string) => {
    const plant = plants.find((p) => p.plantCode === plantCode);
    setFormUnits(units.filter((u) => u.plantCode === plantCode));
    setFormSystems([]); setFormSubSystems([]);
    setForm((prev) => ({ ...prev, plantCode, plantName: plant?.plantName ?? '', unitCode: '', unitName: '', systemCode: '', systemName: '', subSystemCode: '', subSystemName: '' }));
  };
  const handleFormUnitChange = (unitCode: string) => {
    const unit = formUnits.find((u) => u.unitCode === unitCode);
    setFormSystems(systems.filter((s) => s.plantCode === form.plantCode && s.unitCode === unitCode));
    setFormSubSystems([]);
    setForm((prev) => ({ ...prev, unitCode, unitName: unit?.unitName ?? '', systemCode: '', systemName: '', subSystemCode: '', subSystemName: '' }));
  };
  const handleFormSystemChange = (systemCode: string) => {
    const sys = formSystems.find((s) => s.systemCode === systemCode);
    setFormSubSystems(subSystems.filter((ss) => ss.plantCode === form.plantCode && ss.unitCode === form.unitCode && ss.systemCode === systemCode));
    setForm((prev) => ({ ...prev, systemCode, systemName: sys?.systemName ?? '', subSystemCode: '', subSystemName: '' }));
  };
  const handleFormSubSystemChange = (subSystemCode: string) => {
    const ss = formSubSystems.find((s) => s.subSystemCode === subSystemCode);
    setForm((prev) => ({ ...prev, subSystemCode, subSystemName: ss?.subSystemName ?? '' }));
  };

  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setFormUnits([]); setFormSystems([]); setFormSubSystems([]); setDialogOpen(true); };
  const openEdit = (row: PlantUnitEquipment) => {
    setEditTarget(row);
    setFormUnits(units.filter((u) => u.plantCode === row.plantCode));
    setFormSystems(systems.filter((s) => s.plantCode === row.plantCode && s.unitCode === row.unitCode));
    setFormSubSystems(subSystems.filter((ss) => ss.plantCode === row.plantCode && ss.unitCode === row.unitCode && ss.systemCode === row.systemCode));
    setForm({ plantName: row.plantName, plantCode: row.plantCode, unitName: row.unitName, unitCode: row.unitCode, systemName: row.systemName, systemCode: row.systemCode, subSystemName: row.subSystemName, subSystemCode: row.subSystemCode, equipmentName: row.equipmentName, equipmentCode: row.equipmentCode, multiplier: row.multiplier });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, createdByName: user?.name ?? '', createdByEmail: user?.username ?? '' };
      editTarget ? await plantUnitEquipmentApi.update(editTarget.id, payload) : await plantUnitEquipmentApi.create(payload);
      setDialogOpen(false); fetchAll();
    } catch { setError('Failed to save.'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await plantUnitEquipmentApi.delete(deleteTarget.id); setDeleteTarget(null); fetchAll(); }
    catch { setError('Failed to delete.'); } finally { setDeleting(false); }
  };

  const isFormValid = form.plantCode && form.unitCode && form.systemCode && form.subSystemCode && form.equipmentName.trim() && form.equipmentCode.trim();

  return (
    <Box>
      <PageHeader
        title="Unit Equipment"
        subtitle="Manage equipment / devices within each unit sub-system"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Unit Equipment' }]}
        action={{ label: 'Add Equipment', onClick: openCreate, icon: <Add /> }}
      />
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: '12px !important' }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <FilterList sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }} color="text.secondary">Filter:</Typography>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Power Plant</InputLabel>
              <Select label="Power Plant" value={filterPlantCode} onChange={(e) => setFilterPlantCode(e.target.value)}>
                <MenuItem value="">All Plants</MenuItem>
                {plants.map((p) => <MenuItem key={p.id} value={p.plantCode}>{p.plantName}</MenuItem>)}
              </Select>
            </FormControl>
            {filterPlantCode && <Button size="small" variant="outlined" onClick={() => setFilterPlantCode('')}>Clear</Button>}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Plant / Unit</TableCell>
                  <TableCell>System / Sub-System</TableCell>
                  <TableCell>Equipment Name</TableCell>
                  <TableCell>Equipment Code</TableCell>
                  <TableCell>Multiplier</TableCell>
                  <TableCell>Created On</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Tune sx={{ fontSize: '2.5rem', color: 'text.disabled' }} />
                        <Typography variant="body2" color="text.secondary">No equipment found.</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.plantName}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.unitName} ({row.unitCode})</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.systemName}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.subSystemName}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.equipmentName}</Typography></TableCell>
                    <TableCell><Chip label={row.equipmentCode} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 600 }} /></TableCell>
                    <TableCell><Chip label={row.multiplier} size="small" color={row.multiplier !== 1 ? 'secondary' : 'default'} variant="outlined" /></TableCell>
                    <TableCell><Typography variant="body2">{new Date(row.createdOn).toLocaleDateString('en-GB')}</Typography></TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(row)} color="primary"><Edit fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteTarget(row)} color="error"><Delete fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editTarget ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: '20px !important' }}>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Plant</InputLabel>
                <Select label="Plant" value={form.plantCode} onChange={(e) => handleFormPlantChange(e.target.value)} disabled={!!editTarget}>
                  {plants.map((p) => <MenuItem key={p.id} value={p.plantCode}>{p.plantName}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!form.plantCode}>
                <InputLabel>Unit</InputLabel>
                <Select label="Unit" value={form.unitCode} onChange={(e) => handleFormUnitChange(e.target.value)} disabled={!!editTarget}>
                  {formUnits.map((u) => <MenuItem key={u.id} value={u.unitCode}>{u.unitName}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!form.unitCode}>
                <InputLabel>System</InputLabel>
                <Select label="System" value={form.systemCode} onChange={(e) => handleFormSystemChange(e.target.value)} disabled={!!editTarget}>
                  {formSystems.map((s) => <MenuItem key={s.id} value={s.systemCode}>{s.systemName}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!form.systemCode}>
                <InputLabel>Sub-System</InputLabel>
                <Select label="Sub-System" value={form.subSystemCode} onChange={(e) => handleFormSubSystemChange(e.target.value)} disabled={!!editTarget}>
                  {formSubSystems.map((ss) => <MenuItem key={ss.id} value={ss.subSystemCode}>{ss.subSystemName}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Equipment Name" value={form.equipmentName} onChange={(e) => setForm({ ...form, equipmentName: e.target.value })} fullWidth required placeholder="e.g. Discharge Valve" />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Equipment Code" value={form.equipmentCode} onChange={(e) => setForm({ ...form, equipmentCode: e.target.value.toUpperCase() })} fullWidth required placeholder="e.g. DV-01" slotProps={{ htmlInput: {maxLength: 30, },}} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
                          <TextField label="Multiplier" type="number" value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: Number(e.target.value) })} fullWidth 
                          slotProps={{
                              htmlInput: {
                                  min: 0,
                                  step: 0.01,
                              },
                              input: {
                                  startAdornment: (
                                      <InputAdornment position="start">
                                          ×
                                      </InputAdornment>
                                  ),
                              },
                          }} />
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={1.5}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined" disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} variant="contained" disabled={saving || !isFormValid} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
              {saving ? 'Saving...' : editTarget ? 'Update' : 'Add Equipment'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} title="Delete Equipment" message={`Delete "${deleteTarget?.equipmentName}" (${deleteTarget?.equipmentCode})?`} confirmLabel="Delete" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </Box>
  );
}