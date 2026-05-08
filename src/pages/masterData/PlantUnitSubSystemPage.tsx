import {
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Button, CircularProgress,
  Alert, Tooltip, Typography, MenuItem, FormControl, InputLabel,
  Select, Grid, Divider, Stack,
} from '@mui/material';
import { Edit, Delete, Add, FilterList, AccountTree } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { plantUnitSubSystemApi } from '../../api/masterData/plantUnitSubSystemApi';
import { plantUnitSystemApi } from '../../api/masterData/plantUnitSystemApi';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import type { PlantUnitSubSystem, PlantUnitSubSystemForm, PowerPlant, PlantUnit, PlantUnitSystem } from '../../types/masterData';

const emptyForm: PlantUnitSubSystemForm = {
  plantName: '', plantCode: '', unitName: '', unitCode: '',
  systemName: '', systemCode: '', subSystemName: '', subSystemCode: '',
};

export default function PlantUnitSubSystemPage() {
  const { accounts } = useMsal();
  const user = accounts[0];

  const [rows, setRows] = useState<PlantUnitSubSystem[]>([]);
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [units, setUnits] = useState<PlantUnit[]>([]);
  const [systems, setSystems] = useState<PlantUnitSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterPlantCode, setFilterPlantCode] = useState('');
  const [filterUnitCode, setFilterUnitCode] = useState('');
  const [filterSystemCode, setFilterSystemCode] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlantUnitSubSystem | null>(null);
  const [form, setForm] = useState<PlantUnitSubSystemForm>(emptyForm);
  const [formUnits, setFormUnits] = useState<PlantUnit[]>([]);
  const [formSystems, setFormSystems] = useState<PlantUnitSystem[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PlantUnitSubSystem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([powerPlantApi.getAll(), plantUnitApi.getAll(), plantUnitSystemApi.getAll()])
      .then(([p, u, s]) => { setPlants(p.data); setUnits(u.data); setSystems(s.data); })
      .catch(() => setError('Failed to load reference data.'));
  }, []);

  const filteredUnits = filterPlantCode ? units.filter((u) => u.plantCode === filterPlantCode) : [];
  const filteredSystems = filterPlantCode && filterUnitCode
    ? systems.filter((s) => s.plantCode === filterPlantCode && s.unitCode === filterUnitCode)
    : [];

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = filterPlantCode && filterUnitCode && filterSystemCode
        ? await plantUnitSubSystemApi.getBySystem(filterPlantCode, filterUnitCode, filterSystemCode)
        : await plantUnitSubSystemApi.getAll();
      setRows(res.data);
    } catch {
      setError('Failed to load sub-systems.');
    } finally {
      setLoading(false);
    }
  }, [filterPlantCode, filterUnitCode, filterSystemCode]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleFormPlantChange = (plantCode: string) => {
    const plant = plants.find((p) => p.plantCode === plantCode);
    setFormUnits(units.filter((u) => u.plantCode === plantCode));
    setFormSystems([]);
    setForm((prev) => ({ ...prev, plantCode, plantName: plant?.plantName ?? '', unitCode: '', unitName: '', systemCode: '', systemName: '' }));
  };

  const handleFormUnitChange = (unitCode: string) => {
    const unit = formUnits.find((u) => u.unitCode === unitCode);
    setFormSystems(systems.filter((s) => s.plantCode === form.plantCode && s.unitCode === unitCode));
    setForm((prev) => ({ ...prev, unitCode, unitName: unit?.unitName ?? '', systemCode: '', systemName: '' }));
  };

  const handleFormSystemChange = (systemCode: string) => {
    const sys = formSystems.find((s) => s.systemCode === systemCode);
    setForm((prev) => ({ ...prev, systemCode, systemName: sys?.systemName ?? '' }));
  };

  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setFormUnits([]); setFormSystems([]); setDialogOpen(true); };

  const openEdit = (row: PlantUnitSubSystem) => {
    setEditTarget(row);
    setFormUnits(units.filter((u) => u.plantCode === row.plantCode));
    setFormSystems(systems.filter((s) => s.plantCode === row.plantCode && s.unitCode === row.unitCode));
    setForm({ plantName: row.plantName, plantCode: row.plantCode, unitName: row.unitName, unitCode: row.unitCode, systemName: row.systemName, systemCode: row.systemCode, subSystemName: row.subSystemName, subSystemCode: row.subSystemCode });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, createdByName: user?.name ?? '', createdByEmail: user?.username ?? '' };
      editTarget ? await plantUnitSubSystemApi.update(editTarget.id, payload) : await plantUnitSubSystemApi.create(payload);
      setDialogOpen(false);
      fetchAll();
    } catch { setError('Failed to save.'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await plantUnitSubSystemApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchAll();
    } catch { setError('Failed to delete.'); } finally { setDeleting(false); }
  };

  const isFormValid = form.plantCode && form.unitCode && form.systemCode && form.subSystemName.trim() && form.subSystemCode.trim();

  return (
    <Box>
      <PageHeader
        title="Unit Sub-Systems"
        subtitle="Manage sub-systems within each unit system"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Unit Sub-Systems' }]}
        action={{ label: 'Add Sub-System', onClick: openCreate, icon: <Add /> }}
      />
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: '12px !important' }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center',flexWrap : 'wrap' }} >
            <FilterList sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }} color="text.secondary">Filter:</Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Plant</InputLabel>
              <Select label="Plant" value={filterPlantCode} onChange={(e) => { setFilterPlantCode(e.target.value); setFilterUnitCode(''); setFilterSystemCode(''); }}>
                <MenuItem value="">All Plants</MenuItem>
                {plants.map((p) => <MenuItem key={p.id} value={p.plantCode}>{p.plantName}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }} disabled={!filterPlantCode}>
              <InputLabel>Unit</InputLabel>
              <Select label="Unit" value={filterUnitCode} onChange={(e) => { setFilterUnitCode(e.target.value); setFilterSystemCode(''); }}>
                <MenuItem value="">All Units</MenuItem>
                {filteredUnits.map((u) => <MenuItem key={u.id} value={u.unitCode}>{u.unitName}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }} disabled={!filterUnitCode}>
              <InputLabel>System</InputLabel>
              <Select label="System" value={filterSystemCode} onChange={(e) => setFilterSystemCode(e.target.value)}>
                <MenuItem value="">All Systems</MenuItem>
                {filteredSystems.map((s) => <MenuItem key={s.id} value={s.systemCode}>{s.systemName}</MenuItem>)}
              </Select>
            </FormControl>
            {filterPlantCode && <Button size="small" variant="outlined" onClick={() => { setFilterPlantCode(''); setFilterUnitCode(''); setFilterSystemCode(''); }}>Clear</Button>}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Plant</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>System</TableCell>
                  <TableCell>Sub-System Name</TableCell>
                  <TableCell>Sub-System Code</TableCell>
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
                        <AccountTree sx={{ fontSize: '2.5rem', color: 'text.disabled' }} />
                        <Typography variant="body2" color="text.secondary">No sub-systems found.</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{row.plantName}</Typography><Typography variant="caption" color="text.secondary">{row.plantCode}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{row.unitName}</Typography><Typography variant="caption" color="text.secondary">{row.unitCode}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{row.systemName}</Typography><Typography variant="caption" color="text.secondary">{row.systemCode}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.subSystemName}</Typography></TableCell>
                    <TableCell><Chip label={row.subSystemCode} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 600 }} /></TableCell>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editTarget ? 'Edit Sub-System' : 'Add Sub-System'}</DialogTitle>
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
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth required disabled={!form.unitCode}>
                <InputLabel>System</InputLabel>
                <Select label="System" value={form.systemCode} onChange={(e) => handleFormSystemChange(e.target.value)} disabled={!!editTarget}>
                  {formSystems.map((s) => <MenuItem key={s.id} value={s.systemCode}>{s.systemName} ({s.systemCode})</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField label="Sub-System Name" value={form.subSystemName} onChange={(e) => setForm({ ...form, subSystemName: e.target.value })} fullWidth required placeholder="e.g. High Pressure Feed Pump" />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Sub-System Code" value={form.subSystemCode} onChange={(e) => setForm({ ...form, subSystemCode: e.target.value.toUpperCase() })} fullWidth required placeholder="e.g. HPFP" slotProps={{ htmlInput: { maxLength: 20,},}} />
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={1.5}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined" disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} variant="contained" disabled={saving || !isFormValid} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
              {saving ? 'Saving...' : editTarget ? 'Update' : 'Add Sub-System'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} title="Delete Sub-System" message={`Delete "${deleteTarget?.subSystemName}"?`} confirmLabel="Delete" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </Box>
  );
}