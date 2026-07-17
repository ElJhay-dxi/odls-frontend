import {
  Box, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, Tooltip,
  Typography, MenuItem, FormControl, InputLabel, Select,
  Grid, Divider, Stack,
} from '@mui/material';
import { Edit, Delete, Add, FilterList, AccountTree } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import type { PlantUnit, PlantUnitForm, UpdatePlantUnitForm, PowerPlant } from '../../types/masterData';
import { useSectionPermissions } from '../../hooks/usePermission';

const FUEL_CONFIGS = ['Single', 'Dual'];
const FUEL_TYPES = ['Gas', 'LCO', 'DFO', 'Gas/LCO', 'Gas/DFO'];

const emptyForm: PlantUnitForm = {
  plantCode: '', unitName: '', unitCode: '', installedCapacity: 0,
  fuelConfiguration: '', fuelType: '',
};

const emptyUpdateForm: UpdatePlantUnitForm = {
  unitName: '', unitCode: '', installedCapacity: 0,
  fuelConfiguration: '', fuelType: '',
};

export default function PlantUnitPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('master');
  const [rows, setRows] = useState<PlantUnit[]>([]);
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterPlantCode, setFilterPlantCode] = useState<string>('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlantUnit | null>(null);
  const [form, setForm] = useState<PlantUnitForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<UpdatePlantUnitForm>(emptyUpdateForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PlantUnit | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll()
      .then((res) => setPlants(res.data))
      .catch(() => setError('Failed to load plants.'));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = filterPlantCode
        ? await plantUnitApi.getByPlant(filterPlantCode)
        : await plantUnitApi.getAll();
      setRows(res.data);
    } catch {
      setError('Failed to load plant units.');
    } finally {
      setLoading(false);
    }
  }, [filterPlantCode]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: PlantUnit) => {
    setEditTarget(row);
    setUpdateForm({
      unitName: row.unitName, unitCode: row.unitCode,
      installedCapacity: row.installedCapacity,
      fuelConfiguration: row.fuelConfiguration, fuelType: row.fuelType,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editTarget) {
        await plantUnitApi.update(editTarget.id, updateForm);
      } else {
        await plantUnitApi.create(form);
      }
      setDialogOpen(false);
      fetchAll();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await plantUnitApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      setError('Cannot delete — this unit has systems linked to it. Remove those first.');
    } finally {
      setDeleting(false);
    }
  };

  const activeForm = editTarget ? updateForm : form;

  const isFormValid = editTarget
    ? updateForm.unitName.trim() && updateForm.unitCode.trim() && updateForm.installedCapacity > 0
    : form.plantCode && form.unitName.trim() && form.unitCode.trim() && form.installedCapacity > 0;

  const selectedPlantCode = editTarget ? editTarget.plantCode : form.plantCode;
  const selectedPlant = plants.find((p) => p.plantCode === selectedPlantCode);
  const isThermal = selectedPlant?.classificationType?.toLowerCase() === 'thermal';

  return (
    <Box>
      <PageHeader
        title="Plant Units"
        subtitle="Manage generating units within each power plant"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Plant Units' }]}
        action={canCreate ? { label: 'Add Plant Unit', onClick: openCreate, icon: <Add /> } : undefined}
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: '12px !important' }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <FilterList sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }} color="text.secondary">Filter:</Typography>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>Power Plant</InputLabel>
              <Select label="Power Plant" value={filterPlantCode}
                onChange={(e) => setFilterPlantCode(e.target.value)}>
                <MenuItem value="">All Plants</MenuItem>
                {plants.map((p) => (
                  <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
                ))}
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
                  <TableCell>Plant</TableCell>
                  <TableCell>Unit Name</TableCell>
                  <TableCell>Unit Code</TableCell>
                  <TableCell>Installed Capacity</TableCell>
                  <TableCell>Fuel Config</TableCell>
                  <TableCell>Fuel Type</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <AccountTree sx={{ fontSize: '2.5rem', color: 'text.disabled' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          No plant units found
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {filterPlantCode ? 'Try clearing the filter.' : 'Click "Add Plant Unit" to get started.'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.plantName}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.plantCode}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.unitName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={row.unitCode} size="small" variant="outlined"
                          sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {row.installedCapacity.toLocaleString()} MW
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {row.fuelConfiguration ? (
                          <Chip label={row.fuelConfiguration} size="small"
                            color={row.fuelConfiguration === 'Dual' ? 'secondary' : 'default'}
                            sx={{ fontWeight: 500 }} />
                        ) : (
                          <Typography variant="caption" color="text.disabled">N/A</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.fuelType ? (
                          <Typography variant="body2">{row.fuelType}</Typography>
                        ) : (
                          <Typography variant="caption" color="text.disabled">N/A</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.createdByName}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.createdByEmail}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        {canEdit && (
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(row)} color="primary">
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDelete && (
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => setDeleteTarget(row)} color="error">
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editTarget ? 'Edit Plant Unit' : 'Add Plant Unit'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: '20px !important' }}>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth required disabled={!!editTarget}>
                <InputLabel>Power Plant</InputLabel>
                <Select label="Power Plant"
                  value={editTarget ? editTarget.plantCode : form.plantCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, plantCode: e.target.value }))}>
                  {plants.map((p) => (
                    <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField label="Unit Name" value={activeForm.unitName}
                onChange={(e) => editTarget
                  ? setUpdateForm({ ...updateForm, unitName: e.target.value })
                  : setForm({ ...form, unitName: e.target.value })}
                fullWidth required placeholder="e.g. Unit 1, Turbine A" />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Unit Code" value={activeForm.unitCode}
                onChange={(e) => editTarget
                  ? setUpdateForm({ ...updateForm, unitCode: e.target.value.toUpperCase() })
                  : setForm({ ...form, unitCode: e.target.value.toUpperCase() })}
                fullWidth required placeholder="e.g. U1"
                slotProps={{ htmlInput: { maxLength: 20 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Installed Capacity (MW)" type="number"
                value={activeForm.installedCapacity || ''}
                onChange={(e) => editTarget
                  ? setUpdateForm({ ...updateForm, installedCapacity: Number(e.target.value) })
                  : setForm({ ...form, installedCapacity: Number(e.target.value) })}
                fullWidth required
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
            </Grid>
            {isThermal && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Fuel Configuration</InputLabel>
                    <Select label="Fuel Configuration" value={activeForm.fuelConfiguration}
                      onChange={(e) => editTarget
                        ? setUpdateForm({ ...updateForm, fuelConfiguration: e.target.value })
                        : setForm({ ...form, fuelConfiguration: e.target.value })}>
                      {FUEL_CONFIGS.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Fuel Type</InputLabel>
                    <Select label="Fuel Type" value={activeForm.fuelType}
                      onChange={(e) => editTarget
                        ? setUpdateForm({ ...updateForm, fuelType: e.target.value })
                        : setForm({ ...form, fuelType: e.target.value })}>
                      {FUEL_TYPES.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={1.5}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined" disabled={saving}>Cancel</Button>
            {(editTarget ? canEdit : canCreate) && (
              <Button onClick={handleSave} variant="contained"
                disabled={saving || !isFormValid}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
                {saving ? 'Saving...' : editTarget ? 'Update Unit' : 'Add Unit'}
              </Button>
            )}
          </Stack>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Plant Unit"
        message={`Are you sure you want to delete "${deleteTarget?.unitName}" from ${deleteTarget?.plantName}?`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}