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
import { bearingMetalApi } from '../../api/hourly/hourlyThermalApi';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import type { BearingMetal } from '../../types/bearings';
import type { PowerPlant, PlantUnit } from '../../types/masterData';

interface CreateForm {
  plantCode: string;
  unitCode: string;
  bearingCode: string;
  bearingName: string;
}

interface UpdateForm {
  bearingName: string;
}

const emptyCreate: CreateForm = { plantCode: '', unitCode: '', bearingCode: '', bearingName: '' };
const emptyUpdate: UpdateForm = { bearingName: '' };

export default function BearingMetalPage() {
  const [allRows, setAllRows] = useState<BearingMetal[]>([]);
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [units, setUnits] = useState<PlantUnit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<PlantUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterPlant, setFilterPlant] = useState('');
  const [filterUnit, setFilterUnit] = useState('');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BearingMetal | null>(null);
  const [form, setForm] = useState<CreateForm>(emptyCreate);
  const [updateForm, setUpdateForm] = useState<UpdateForm>(emptyUpdate);
  const [dialogUnits, setDialogUnits] = useState<PlantUnit[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<BearingMetal | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([powerPlantApi.getAll(), plantUnitApi.getAll()]).then(([p, u]) => {
      setPlants(p.data.filter((pl) => pl.classificationType === 'Thermal'));
      setUnits(u.data);
    });
  }, []);

  // Update dialog units when plant changes in create form
  useEffect(() => {
    setDialogUnits(form.plantCode ? units.filter((u) => u.plantCode === form.plantCode) : []);
    setForm((prev) => ({ ...prev, unitCode: '' }));
  }, [form.plantCode, units]);

  // Update filter units
  useEffect(() => {
    setFilteredUnits(filterPlant ? units.filter((u) => u.plantCode === filterPlant) : []);
    setFilterUnit('');
  }, [filterPlant, units]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bearingMetalApi.getAll('', '');
      setAllRows(res.data);
    } catch {
      setError('Failed to load bearings.');
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

  const openEdit = (row: BearingMetal) => {
    setEditTarget(row);
    setUpdateForm({ bearingName: row.bearingName });
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
        await bearingMetalApi.update(editTarget.id, updateForm.bearingName);
      } else {
        await bearingMetalApi.create({
          plantCode: form.plantCode,
          unitCode: form.unitCode,
          bearingCode: Number(form.bearingCode),
          bearingName: form.bearingName,
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
      await bearingMetalApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRows();
    } catch {
      setError('Failed to delete bearing.');
    } finally {
      setDeleting(false);
    }
  };

  const isCreateValid = form.plantCode && form.unitCode && form.bearingCode && form.bearingName.trim();
  const isUpdateValid = updateForm.bearingName.trim();

  return (
    <Box>
      <PageHeader
        title="Bearing Metal Master"
        subtitle="Configure bearing metal sensors per thermal unit"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Bearing Metals' }]}
        action={{ label: 'Add Bearing', onClick: openCreate }}
      />

      <Card>
        <CardContent>
          {/* Filters */}
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
                {filterPlant ? 'No bearings found for selected filters.' : 'No bearings configured yet.'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Plant</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Bearing #</TableCell>
                    <TableCell>Bearing Name</TableCell>
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
                        <Chip label={`#${row.bearingCode}`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.bearingName}</Typography>
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
            <Settings sx={{ color: '#4A148C' }} />
            <Typography sx={{ fontWeight: 700 }}>{editTarget ? 'Edit Bearing' : 'Add Bearing'}</Typography>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

          {editTarget ? (
            // Edit — only name is editable
            <Stack spacing={2}>
              <Stack direction="row" spacing={1}>
                <Chip label={editTarget.plantCode} size="small" variant="outlined" />
                <Chip label={editTarget.unitCode} size="small" variant="outlined" />
                <Chip label={`Bearing #${editTarget.bearingCode}`} size="small" color="primary" variant="outlined" />
              </Stack>
              <TextField
                label="Bearing Name"
                value={updateForm.bearingName}
                onChange={(e) => setUpdateForm({ bearingName: e.target.value })}
                fullWidth required autoFocus
                helperText="The bearing code cannot be changed after creation."
              />
            </Stack>
          ) : (
            // Create
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
                  label="Bearing #" type="number" fullWidth required
                  value={form.bearingCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, bearingCode: e.target.value }))}
                  helperText="Unique number per unit"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  label="Bearing Name" fullWidth required
                  value={form.bearingName}
                  onChange={(e) => setForm((prev) => ({ ...prev, bearingName: e.target.value }))}
                  placeholder="e.g. Turbine Bearing #1"
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
            {saving ? 'Saving...' : editTarget ? 'Update' : 'Add Bearing'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Bearing"
        message={`Delete bearing #${deleteTarget?.bearingCode} (${deleteTarget?.bearingName}) from unit ${deleteTarget?.unitCode}? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}