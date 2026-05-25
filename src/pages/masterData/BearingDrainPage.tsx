import {
  Box, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, Tooltip,
  Typography, MenuItem, FormControl, InputLabel, Select,
  Grid, Divider, Stack,
} from '@mui/material';
import { Edit, Delete, Add, Settings } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { bearingDrainApi } from '../../api/hourly/hourlyThermalApi';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import type { BearingDrain } from '../../types/bearings';
import type { PowerPlant, PlantUnit } from '../../types/masterData';

interface CreateForm {
  plantCode: string;
  unitCode: string;
  drainCode: string;
  drainName: string;
}

interface UpdateForm {
  drainName: string;
}

const emptyCreate: CreateForm = { plantCode: '', unitCode: '', drainCode: '', drainName: '' };
const emptyUpdate: UpdateForm = { drainName: '' };

export default function BearingDrainPage() {
  const [allRows, setAllRows] = useState<BearingDrain[]>([]);
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [units, setUnits] = useState<PlantUnit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<PlantUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterPlant, setFilterPlant] = useState('');
  const [filterUnit, setFilterUnit] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BearingDrain | null>(null);
  const [form, setForm] = useState<CreateForm>(emptyCreate);
  const [updateForm, setUpdateForm] = useState<UpdateForm>(emptyUpdate);
  const [dialogUnits, setDialogUnits] = useState<PlantUnit[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<BearingDrain | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([powerPlantApi.getAll(), plantUnitApi.getAll()]).then(([p, u]) => {
      setPlants(p.data.filter((pl) => pl.classificationType === 'Thermal'));
      setUnits(u.data);
    });
  }, []);

  useEffect(() => {
    setDialogUnits(form.plantCode ? units.filter((u) => u.plantCode === form.plantCode) : []);
    setForm((prev) => ({ ...prev, unitCode: '' }));
  }, [form.plantCode, units]);

  useEffect(() => {
    setFilteredUnits(filterPlant ? units.filter((u) => u.plantCode === filterPlant) : []);
    setFilterUnit('');
  }, [filterPlant, units]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bearingDrainApi.getAll('', '');
      setAllRows(res.data);
    } catch {
      setError('Failed to load drains.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const rows = allRows.filter((r) => {
    if (filterPlant && r.plantCode !== filterPlant) return false;
    if (filterUnit && r.unitCode !== filterUnit) return false;
    return true;
  });

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyCreate);
    setSaveError(null);
    setDialogOpen(true);
  };

  const openEdit = (row: BearingDrain) => {
    setEditTarget(row);
    setUpdateForm({ drainName: row.drainName });
    setSaveError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
    setForm(emptyCreate);
    setUpdateForm(emptyUpdate);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      if (editTarget) {
        await bearingDrainApi.update(editTarget.id, updateForm.drainName);
      } else {
        await bearingDrainApi.create({
          plantCode: form.plantCode,
          unitCode: form.unitCode,
          drainCode: Number(form.drainCode),
          drainName: form.drainName,
        });
      }
      closeDialog();
      fetchRows();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(msg ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await bearingDrainApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRows();
    } catch {
      setError('Failed to delete drain.');
    } finally {
      setDeleting(false);
    }
  };

  const isCreateValid = form.plantCode && form.unitCode && form.drainCode && form.drainName.trim();
  const isUpdateValid = updateForm.drainName.trim();

  return (
    <Box>
      <PageHeader
        title="Bearing Drain Master"
        subtitle="Configure bearing drain sensors per thermal unit"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Bearing Drains' }]}
        action={{ label: 'Add Drain', onClick: openCreate }}
      />

      <Card>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Plant</InputLabel>
                <Select label="Plant" value={filterPlant} onChange={(e) => setFilterPlant(e.target.value)}>
                  <MenuItem value="">All Plants</MenuItem>
                  {plants.map((p) => (
                    <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small" disabled={!filterPlant}>
                <InputLabel>Unit</InputLabel>
                <Select label="Unit" value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)}>
                  <MenuItem value="">All Units</MenuItem>
                  {filteredUnits.map((u) => (
                    <MenuItem key={u.id} value={u.unitCode}>{u.unitName} ({u.unitCode})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
          ) : rows.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Settings sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {filterPlant ? 'No drains found for selected filters.' : 'No drains configured yet.'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Plant</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Drain #</TableCell>
                    <TableCell>Drain Name</TableCell>
                    <TableCell>Created By</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.plantCode}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.plantName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.unitCode}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.unitName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={`#${row.drainCode}`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.drainName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{row.createdByName}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit name">
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

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
            <Settings sx={{ color: '#006064' }} />
            <Typography sx={{ fontWeight: 700 }}>{editTarget ? 'Edit Drain' : 'Add Drain'}</Typography>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

          {editTarget ? (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1}>
                <Chip label={editTarget.plantCode} size="small" variant="outlined" />
                <Chip label={editTarget.unitCode} size="small" variant="outlined" />
                <Chip label={`Drain #${editTarget.drainCode}`} size="small" color="primary" variant="outlined" />
              </Stack>
              <TextField
                label="Drain Name"
                value={updateForm.drainName}
                onChange={(e) => setUpdateForm({ drainName: e.target.value })}
                fullWidth required autoFocus
                helperText="The drain code cannot be changed after creation."
              />
            </Stack>
          ) : (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Plant</InputLabel>
                  <Select label="Plant" value={form.plantCode}
                    onChange={(e) => setForm((prev) => ({ ...prev, plantCode: e.target.value }))}>
                    {plants.map((p) => (
                      <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required disabled={!form.plantCode}>
                  <InputLabel>Unit</InputLabel>
                  <Select label="Unit" value={form.unitCode}
                    onChange={(e) => setForm((prev) => ({ ...prev, unitCode: e.target.value }))}>
                    {dialogUnits.map((u) => (
                      <MenuItem key={u.id} value={u.unitCode}>{u.unitName} ({u.unitCode})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Drain #" type="number" fullWidth required
                  value={form.drainCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, drainCode: e.target.value }))}
                  helperText="Unique number per unit"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  label="Drain Name" fullWidth required
                  value={form.drainName}
                  onChange={(e) => setForm((prev) => ({ ...prev, drainName: e.target.value }))}
                  placeholder="e.g. Turbine Drain #1"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || (editTarget ? !isUpdateValid : !isCreateValid)}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving ? 'Saving...' : editTarget ? 'Update' : 'Add Drain'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Drain"
        message={`Delete drain #${deleteTarget?.drainCode} (${deleteTarget?.drainName}) from unit ${deleteTarget?.unitCode}? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}