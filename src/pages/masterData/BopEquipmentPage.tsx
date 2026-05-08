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
import { balanceOfPlantApi } from '../../api/masterData/balanceOfPlantApi';
import { bopSystemApi } from '../../api/masterData/bopSystemApi';
import { bopSubSystemApi } from '../../api/masterData/bopSubSystemApi';
import { bopEquipmentApi } from '../../api/masterData/bopEquipmentApi';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import type { BopEquipment, BopEquipmentForm, PowerPlant, BalanceOfPlant, BopSystem, BopSubSystem } from '../../types/masterData';

const emptyForm: BopEquipmentForm = {
  plantName: '', plantCode: '',
  bopName: '', bopCode: '',
  systemName: '', systemCode: '',
  subsystemName: '', subsystemCode: '',
  equipmentName: '', equipmentCode: '',
  multiplier: 1,
};

export default function BopEquipmentPage() {
  const { accounts } = useMsal();
  const user = accounts[0];

  const [rows, setRows] = useState<BopEquipment[]>([]);
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [bops, setBops] = useState<BalanceOfPlant[]>([]);
  const [systems, setSystems] = useState<BopSystem[]>([]);
  const [subSystems, setSubSystems] = useState<BopSubSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter
  const [filterPlantCode, setFilterPlantCode] = useState('');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BopEquipment | null>(null);
  const [form, setForm] = useState<BopEquipmentForm>(emptyForm);
  const [formBops, setFormBops] = useState<BalanceOfPlant[]>([]);
  const [formSystems, setFormSystems] = useState<BopSystem[]>([]);
  const [formSubSystems, setFormSubSystems] = useState<BopSubSystem[]>([]);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<BopEquipment | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      powerPlantApi.getAll(),
      balanceOfPlantApi.getAll(),
      bopSystemApi.getAll(),
      bopSubSystemApi.getAll(),
    ]).then(([p, b, s, ss]) => {
      setPlants(p.data);
      setBops(b.data);
      setSystems(s.data);
      setSubSystems(ss.data);
    }).catch(() => setError('Failed to load reference data.'));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bopEquipmentApi.getAll();
      const filtered = filterPlantCode
        ? res.data.filter((r) => r.plantCode === filterPlantCode)
        : res.data;
      setRows(filtered);
    } catch {
      setError('Failed to load BOP equipment.');
    } finally {
      setLoading(false);
    }
  }, [filterPlantCode]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Form cascade handlers
  const handleFormPlantChange = (plantCode: string) => {
    const plant = plants.find((p) => p.plantCode === plantCode);
    setFormBops(bops.filter((b) => b.plantCode === plantCode));
    setFormSystems([]);
    setFormSubSystems([]);
    setForm((prev) => ({ ...prev, plantCode, plantName: plant?.plantName ?? '', bopCode: '', bopName: '', systemCode: '', systemName: '', subsystemCode: '', subsystemName: '' }));
  };

  const handleFormBopChange = (bopCode: string) => {
    const bop = formBops.find((b) => b.bopCode === bopCode);
    setFormSystems(systems.filter((s) => s.plantCode === form.plantCode && s.bopCode === bopCode));
    setFormSubSystems([]);
    setForm((prev) => ({ ...prev, bopCode, bopName: bop?.bopName ?? '', systemCode: '', systemName: '', subsystemCode: '', subsystemName: '' }));
  };

  const handleFormSystemChange = (systemCode: string) => {
    const sys = formSystems.find((s) => s.systemCode === systemCode);
    setFormSubSystems(subSystems.filter((ss) => ss.plantCode === form.plantCode && ss.bopCode === form.bopCode && ss.systemCode === systemCode));
    setForm((prev) => ({ ...prev, systemCode, systemName: sys?.systemName ?? '', subsystemCode: '', subsystemName: '' }));
  };

  const handleFormSubSystemChange = (subsystemCode: string) => {
    const ss = formSubSystems.find((s) => s.subSystemCode === subsystemCode);
    setForm((prev) => ({ ...prev, subsystemCode, subsystemName: ss?.subSystemName ?? '' }));
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setFormBops([]);
    setFormSystems([]);
    setFormSubSystems([]);
    setDialogOpen(true);
  };

  const openEdit = (row: BopEquipment) => {
    setEditTarget(row);
    setFormBops(bops.filter((b) => b.plantCode === row.plantCode));
    setFormSystems(systems.filter((s) => s.plantCode === row.plantCode && s.bopCode === row.bopCode));
    setFormSubSystems(subSystems.filter((ss) => ss.plantCode === row.plantCode && ss.bopCode === row.bopCode && ss.systemCode === row.systemCode));
    setForm({
      plantName: row.plantName, plantCode: row.plantCode,
      bopName: row.bopName, bopCode: row.bopCode,
      systemName: row.systemName, systemCode: row.systemCode,
      subsystemName: row.subsystemName, subsystemCode: row.subsystemCode,
      equipmentName: row.equipmentName, equipmentCode: row.equipmentCode,
      multiplier: row.multiplier,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, createdByName: user?.name ?? '', createdByEmail: user?.username ?? '' };
      editTarget
        ? await bopEquipmentApi.update(editTarget.id, payload)
        : await bopEquipmentApi.create(payload);
      setDialogOpen(false);
      fetchAll();
    } catch {
      setError('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await bopEquipmentApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      setError('Failed to delete.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid =
    form.plantCode && form.bopCode && form.systemCode &&
    form.subsystemCode && form.equipmentName.trim() && form.equipmentCode.trim();

  return (
    <Box>
      <PageHeader
        title="BOP Equipment"
        subtitle="Manage equipment and devices within each BOP sub-system"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'BOP Equipment' }]}
        action={{ label: 'Add Equipment', onClick: openCreate, icon: <Add /> }}
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filter Bar */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: '12px !important' }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <FilterList sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }} color="text.secondary">Filter:</Typography>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Power Plant</InputLabel>
              <Select
                label="Power Plant"
                value={filterPlantCode}
                onChange={(e) => setFilterPlantCode(e.target.value)}
              >
                <MenuItem value="">All Plants</MenuItem>
                {plants.map((p) => <MenuItem key={p.id} value={p.plantCode}>{p.plantName}</MenuItem>)}
              </Select>
            </FormControl>
            {filterPlantCode && (
              <Button size="small" variant="outlined" onClick={() => setFilterPlantCode('')}>Clear</Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Plant / BOP</TableCell>
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
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Tune sx={{ fontSize: '2.5rem', color: 'text.disabled' }} />
                        <Typography variant="body2" color="text.secondary">No BOP equipment found.</Typography>
                        <Typography variant="caption" color="text.disabled">
                          {filterPlantCode ? 'Try clearing the filter.' : 'Click "Add Equipment" to get started.'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.plantName}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.bopName} ({row.bopCode})</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.systemName}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.subsystemName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.equipmentName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={row.equipmentCode} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.multiplier}
                          size="small"
                          color={row.multiplier !== 1 ? 'secondary' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{new Date(row.createdOn).toLocaleDateString('en-GB')}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(row)} color="primary"><Edit fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => setDeleteTarget(row)} color="error"><Delete fontSize="small" /></IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editTarget ? 'Edit BOP Equipment' : 'Add BOP Equipment'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: '20px !important' }}>
          <Grid container spacing={2.5}>
            {/* Row 1 — Plant & BOP */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Power Plant</InputLabel>
                <Select label="Power Plant" value={form.plantCode} onChange={(e) => handleFormPlantChange(e.target.value)} disabled={!!editTarget}>
                  {plants.map((p) => <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!form.plantCode}>
                <InputLabel>Balance of Plant</InputLabel>
                <Select label="Balance of Plant" value={form.bopCode} onChange={(e) => handleFormBopChange(e.target.value)} disabled={!!editTarget}>
                  {formBops.length === 0
                    ? <MenuItem disabled value=""><em>Select a plant first</em></MenuItem>
                    : formBops.map((b) => <MenuItem key={b.id} value={b.bopCode}>{b.bopName} ({b.bopCode})</MenuItem>)
                  }
                </Select>
              </FormControl>
            </Grid>

            {/* Row 2 — System & Sub-System */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!form.bopCode}>
                <InputLabel>BOP System</InputLabel>
                <Select label="BOP System" value={form.systemCode} onChange={(e) => handleFormSystemChange(e.target.value)} disabled={!!editTarget}>
                  {formSystems.length === 0
                    ? <MenuItem disabled value=""><em>Select a BOP first</em></MenuItem>
                    : formSystems.map((s) => <MenuItem key={s.id} value={s.systemCode}>{s.systemName} ({s.systemCode})</MenuItem>)
                  }
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!form.systemCode}>
                <InputLabel>BOP Sub-System</InputLabel>
                <Select label="BOP Sub-System" value={form.subsystemCode} onChange={(e) => handleFormSubSystemChange(e.target.value)} disabled={!!editTarget}>
                  {formSubSystems.length === 0
                    ? <MenuItem disabled value=""><em>Select a system first</em></MenuItem>
                    : formSubSystems.map((ss) => <MenuItem key={ss.id} value={ss.subSystemCode}>{ss.subSystemName} ({ss.subSystemCode})</MenuItem>)
                  }
                </Select>
              </FormControl>
            </Grid>

            {/* Row 3 — Equipment details */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Equipment Name"
                value={form.equipmentName}
                onChange={(e) => setForm({ ...form, equipmentName: e.target.value })}
                fullWidth required
                placeholder="e.g. Foam Deluge Valve"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Equipment Code"
                value={form.equipmentCode}
                onChange={(e) => setForm({ ...form, equipmentCode: e.target.value.toUpperCase() })}
                fullWidth required
                placeholder="e.g. FDV-01"
                slotProps={{  htmlInput: {    maxLength: 30,  },}}
              />
            </Grid>
                      <Grid size={{ xs: 12, sm: 3 }}>
                          <TextField
                              label="Multiplier"
                              type="number"
                              value={form.multiplier}
                              onChange={(e) =>
                                  setForm({
                                      ...form,
                                      multiplier: Number(e.target.value),
                                  })
                              }
                              fullWidth
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
                              }}
                 />
                </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={1.5}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined" disabled={saving}>Cancel</Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={saving || !isFormValid}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {saving ? 'Saving...' : editTarget ? 'Update' : 'Add Equipment'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete BOP Equipment"
        message={`Delete "${deleteTarget?.equipmentName}" (${deleteTarget?.equipmentCode})?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}