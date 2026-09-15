import {
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Button, CircularProgress,
  Alert, Tooltip, Typography, MenuItem, FormControl, InputLabel,
  Select, Grid, Divider, Stack, InputAdornment,
} from '@mui/material';
import { Edit, Delete, Add, FilterList, Tune } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { balanceOfPlantApi } from '../../api/masterData/balanceOfPlantApi';
import { bopSystemApi } from '../../api/masterData/bopSystemApi';
import { bopSubSystemApi } from '../../api/masterData/bopSubSystemApi';
import { bopEquipmentApi } from '../../api/masterData/bopEquipmentApi';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import type { BopEquipment, BopEquipmentForm, UpdateBopEquipmentForm, PowerPlant, BalanceOfPlant, BopSystem, BopSubSystem } from '../../types/masterData';
import { useSectionPermissions } from '../../hooks/usePermission';

const emptyForm: BopEquipmentForm = {
  plantCode: '', bopCode: '', systemCode: '', subsystemCode: '',
  equipmentName: '', equipmentCode: '', multiplier: 1,
  plantName: '',
  bopName: '',
  systemName: '',
  subsystemName: ''
};

const emptyUpdateForm: UpdateBopEquipmentForm = {
  equipmentName: '', equipmentCode: '', multiplier: 1,
};

export default function BopEquipmentPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('master');
  const [rows, setRows] = useState<BopEquipment[]>([]);
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [bops, setBops] = useState<BalanceOfPlant[]>([]);
  const [systems, setSystems] = useState<BopSystem[]>([]);
  const [subSystems, setSubSystems] = useState<BopSubSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterPlantCode, setFilterPlantCode] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BopEquipment | null>(null);
  const [form, setForm] = useState<BopEquipmentForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<UpdateBopEquipmentForm>(emptyUpdateForm);
  const [formBops, setFormBops] = useState<BalanceOfPlant[]>([]);
  const [formSystems, setFormSystems] = useState<BopSystem[]>([]);
  const [formSubSystems, setFormSubSystems] = useState<BopSubSystem[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BopEquipment | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([powerPlantApi.getAll(), balanceOfPlantApi.getAll(), bopSystemApi.getAll(), bopSubSystemApi.getAll()])
      .then(([p, b, s, ss]) => { setPlants(p.data); setBops(b.data); setSystems(s.data); setSubSystems(ss.data); })
      .catch(() => setError('Failed to load reference data.'));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await bopEquipmentApi.getAll();
      setRows(filterPlantCode ? res.data.filter((r) => r.plantCode === filterPlantCode) : res.data);
    } catch { setError('Failed to load BOP / Auxiliary Equipment.'); } finally { setLoading(false); }
  }, [filterPlantCode]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleFormPlantChange = (plantCode: string) => {
    setFormBops(bops.filter((b) => b.plantCode === plantCode));
    setFormSystems([]); setFormSubSystems([]);
    setForm((prev) => ({ ...prev, plantCode, bopCode: '', systemCode: '', subsystemCode: '' }));
  };

  const handleFormBopChange = (bopCode: string) => {
    setFormSystems(systems.filter((s) => s.plantCode === form.plantCode && s.bopCode === bopCode));
    setFormSubSystems([]);
    setForm((prev) => ({ ...prev, bopCode, systemCode: '', subsystemCode: '' }));
  };

  const handleFormSystemChange = (systemCode: string) => {
    setFormSubSystems(subSystems.filter((ss) => ss.plantCode === form.plantCode && ss.bopCode === form.bopCode && ss.systemCode === systemCode));
    setForm((prev) => ({ ...prev, systemCode, subsystemCode: '' }));
  };

  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setFormBops([]); setFormSystems([]); setFormSubSystems([]); setDialogOpen(true); };

  const openEdit = (row: BopEquipment) => {
    setEditTarget(row);
    setUpdateForm({ equipmentName: row.equipmentName, equipmentCode: row.equipmentCode, multiplier: row.multiplier });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editTarget) {
        await bopEquipmentApi.update(editTarget.id, updateForm);
      } else {
        await bopEquipmentApi.create(form);
      }
      setDialogOpen(false); fetchAll();
    } catch { setError('Failed to save.'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await bopEquipmentApi.delete(deleteTarget.id); setDeleteTarget(null); fetchAll(); }
    catch { setError('Failed to delete.'); } finally { setDeleting(false); }
  };

  const activeEquipmentName = editTarget ? updateForm.equipmentName : form.equipmentName;
  const activeEquipmentCode = editTarget ? updateForm.equipmentCode : form.equipmentCode;
  const activeMultiplier = editTarget ? updateForm.multiplier : form.multiplier;

  const isFormValid = editTarget
    ? updateForm.equipmentName.trim() && updateForm.equipmentCode.trim()
    : form.plantCode && form.bopCode && form.systemCode && form.subsystemCode && form.equipmentName.trim() && form.equipmentCode.trim();

  return (
    <Box>
      <PageHeader title="BOP / Auxiliary Equipment" subtitle="Manage equipment within each BOP / Auxiliary Sub System" breadcrumbs={[{ label: 'Master Data' }, { label: 'BOP / Auxiliary Equipment' }]} action={canCreate ? { label: 'Add BOP / Auxiliary Equipment', onClick: openCreate, icon: <Add /> } : undefined} />
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
                  <TableCell>Plant / BOP / Auxiliary</TableCell>
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
                        <Typography variant="body2" color="text.secondary">No BOP / Auxiliary Equipment found.</Typography>
                        <Typography variant="caption" color="text.disabled">{filterPlantCode ? 'Try clearing the filter.' : 'Click "Add Equipment" to get started.'}</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{row.plantName}</Typography><Typography variant="caption" color="text.secondary">{row.bopName} ({row.bopCode})</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{row.systemName}</Typography><Typography variant="caption" color="text.secondary">{row.subsystemName}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.equipmentName}</Typography></TableCell>
                    <TableCell><Chip label={row.equipmentCode} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 600 }} /></TableCell>
                    <TableCell><Chip label={row.multiplier} size="small" color={row.multiplier !== 1 ? 'secondary' : 'default'} variant="outlined" /></TableCell>
                    <TableCell><Typography variant="body2">{new Date(row.createdOn).toLocaleDateString('en-GB')}</Typography></TableCell>
                    <TableCell align="right">
                      {canEdit && <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(row)} color="primary"><Edit fontSize="small" /></IconButton></Tooltip>}
                      {canDelete && <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteTarget(row)} color="error"><Delete fontSize="small" /></IconButton></Tooltip>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editTarget ? 'Edit BOP / Auxiliary Equipment' : 'Add BOP / Auxiliary Equipment'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: '20px !important' }}>
          <Grid container spacing={2.5}>
            {/* Hierarchy selectors — locked on edit */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!!editTarget}>
                <InputLabel>Power Plant</InputLabel>
                <Select label="Power Plant" value={editTarget ? editTarget.plantCode : form.plantCode} onChange={(e) => handleFormPlantChange(e.target.value)}>
                  {plants.map((p) => <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!!editTarget || !form.plantCode}>
                <InputLabel>BOP / Auxiliary</InputLabel>
                <Select label="BOP / Auxiliary" value={editTarget ? editTarget.bopCode : form.bopCode} onChange={(e) => handleFormBopChange(e.target.value)}>
                  {(editTarget ? bops.filter(b => b.plantCode === editTarget.plantCode) : formBops).length === 0
                    ? <MenuItem disabled value=""><em>Select a plant first</em></MenuItem>
                    : (editTarget ? bops.filter(b => b.plantCode === editTarget.plantCode) : formBops).map((b) => (
                        <MenuItem key={b.id} value={b.bopCode}>{b.bopName} ({b.bopCode})</MenuItem>
                      ))
                  }
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!!editTarget || !form.bopCode}>
                <InputLabel>BOP / Auxiliary System</InputLabel>
                <Select label="BOP / Auxiliary System" value={editTarget ? editTarget.systemCode : form.systemCode} onChange={(e) => handleFormSystemChange(e.target.value)}>
                  {(editTarget ? systems.filter(s => s.plantCode === editTarget.plantCode && s.bopCode === editTarget.bopCode) : formSystems).length === 0
                    ? <MenuItem disabled value=""><em>Select a BOP / Auxiliary first</em></MenuItem>
                    : (editTarget ? systems.filter(s => s.plantCode === editTarget.plantCode && s.bopCode === editTarget.bopCode) : formSystems).map((s) => (
                        <MenuItem key={s.id} value={s.systemCode}>{s.systemName} ({s.systemCode})</MenuItem>
                      ))
                  }
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!!editTarget || !form.systemCode}>
                <InputLabel>BOP / Auxiliary Sub System</InputLabel>
                <Select label="BOP / Auxiliary Sub System" value={editTarget ? editTarget.subsystemCode : form.subsystemCode} onChange={(e) => setForm((prev) => ({ ...prev, subsystemCode: e.target.value }))}>
                  {(editTarget ? subSystems.filter(ss => ss.plantCode === editTarget.plantCode && ss.bopCode === editTarget.bopCode && ss.systemCode === editTarget.systemCode) : formSubSystems).length === 0
                    ? <MenuItem disabled value=""><em>Select a system first</em></MenuItem>
                    : (editTarget ? subSystems.filter(ss => ss.plantCode === editTarget.plantCode && ss.bopCode === editTarget.bopCode && ss.systemCode === editTarget.systemCode) : formSubSystems).map((ss) => (
                        <MenuItem key={ss.id} value={ss.subSystemCode}>{ss.subSystemName} ({ss.subSystemCode})</MenuItem>
                      ))
                  }
                </Select>
              </FormControl>
            </Grid>

            {/* Equipment fields — editable on both create and edit */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Equipment Name" value={activeEquipmentName}
                onChange={(e) => editTarget ? setUpdateForm({ ...updateForm, equipmentName: e.target.value }) : setForm({ ...form, equipmentName: e.target.value })}
                fullWidth required placeholder="e.g. Foam Deluge Valve"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Equipment Code" value={activeEquipmentCode}
                onChange={(e) => editTarget ? setUpdateForm({ ...updateForm, equipmentCode: e.target.value.toUpperCase() }) : setForm({ ...form, equipmentCode: e.target.value.toUpperCase() })}
                fullWidth required placeholder="e.g. FDV-01"
                slotProps={{ htmlInput: { maxLength: 30 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Multiplier" type="number" value={activeMultiplier}
                onChange={(e) => editTarget ? setUpdateForm({ ...updateForm, multiplier: Number(e.target.value) }) : setForm({ ...form, multiplier: Number(e.target.value) })}
                fullWidth
                slotProps={{
                  htmlInput: { min: 0, step: 0.01 },
                  input: { startAdornment: <InputAdornment position="start">×</InputAdornment> },
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={1.5}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined" disabled={saving}>Cancel</Button>
            {(editTarget ? canEdit : canCreate) && <Button onClick={handleSave} variant="contained" disabled={saving || !isFormValid} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
              {saving ? 'Saving...' : editTarget ? 'Update' : 'Add Equipment'}
            </Button>}
          </Stack>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} title="Delete BOP / Auxiliary Equipment" message={`Delete "${deleteTarget?.equipmentName}" (${deleteTarget?.equipmentCode})?`} confirmLabel="Delete" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </Box>
  );
}