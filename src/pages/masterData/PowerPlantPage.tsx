import {
  Box, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, Tooltip,
  Typography, MenuItem, FormControl, InputLabel, Select,
  Grid, Divider, Stack,
} from '@mui/material';
import { Edit, Delete, Add, Factory } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantClassificationApi } from '../../api/masterData/plantClassificationApi';
import { generationTypeApi } from '../../api/masterData/generationTypeApi';
import { plantLocationApi } from '../../api/masterData/plantLocationApi';
import type {
  PowerPlant, PowerPlantForm,
  PlantClassification, GenerationType, PlantLocation,
} from '../../types/masterData';
import { useSectionPermissions } from '../../hooks/usePermission';

const CLASSIFICATION_COLORS: Record<string, 'error' | 'primary' | 'warning' | 'success' | 'default'> = {
  thermal: 'error', hydro: 'primary', solar: 'warning', wind: 'success',
};

const emptyForm: PowerPlantForm = {
  plantName: '', plantCode: '', classificationCode: 0, generationTypeCode: 0,
  plantOwner: '', numberOfUnits: 0, installedCapacity: 0, standardMeasuringUnit: 0,
  commissioningDate: '', locationCode: 0,
};

export default function PowerPlantPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('master');
  const [rows, setRows] = useState<PowerPlant[]>([]);
  const [classifications, setClassifications] = useState<PlantClassification[]>([]);
  const [generationTypes, setGenerationTypes] = useState<GenerationType[]>([]);
  const [filteredGenTypes, setFilteredGenTypes] = useState<GenerationType[]>([]);
  const [locations, setLocations] = useState<PlantLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PowerPlant | null>(null);
  const [form, setForm] = useState<PowerPlantForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PowerPlant | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      plantClassificationApi.getAll(),
      generationTypeApi.getAll(),
      plantLocationApi.getAll(),
    ]).then(([cls, gen, loc]) => {
      setClassifications(cls.data);
      setGenerationTypes(gen.data);
      setLocations(loc.data);
    }).catch(() => setError('Failed to load reference data.'));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await powerPlantApi.getAll();
      setRows(res.data);
    } catch {
      setError('Failed to load power plants.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (form.classificationCode) {
      setFilteredGenTypes(generationTypes.filter((g) => g.classificationCode === form.classificationCode));
    } else {
      setFilteredGenTypes([]);
    }
  }, [form.classificationCode, generationTypes]);

  const handleClassificationChange = (code: number) => {
    setForm((prev) => ({ ...prev, classificationCode: code, generationTypeCode: 0 }));
  };

  const handleGenerationTypeChange = (code: number) => {
    setForm((prev) => ({ ...prev, generationTypeCode: code }));
  };

  const handleLocationChange = (code: number) => {
    setForm((prev) => ({ ...prev, locationCode: code }));
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: PowerPlant) => {
    setEditTarget(row);
    setForm({
      plantName: row.plantName, plantCode: row.plantCode,
      classificationCode: row.classificationCode, generationTypeCode: row.generationTypeCode,
      plantOwner: row.plantOwner, numberOfUnits: row.numberOfUnits,
      installedCapacity: row.installedCapacity, standardMeasuringUnit: row.standardMeasuringUnit,
      commissioningDate: row.commissioningDate.split('T')[0], locationCode: row.locationCode,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editTarget) {
        await powerPlantApi.update(editTarget.id, form);
      } else {
        await powerPlantApi.create(form);
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
      await powerPlantApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      setError('Cannot delete — this plant has units linked to it. Remove those first.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid =
    form.plantName.trim() && form.plantCode.trim() &&
    form.classificationCode > 0 && form.generationTypeCode > 0 &&
    form.locationCode > 0 && form.commissioningDate && form.installedCapacity > 0;

  return (
    <Box>
      <PageHeader
        title="Power Plants"
        subtitle="Manage all registered power plants across Hydro, Thermal, Solar and Wind"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Power Plants' }]}
        action={canCreate ? { label: 'Add Power Plant', onClick: openCreate, icon: <Add /> } : undefined}
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Plant</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Classification</TableCell>
                  <TableCell>Generation Type</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Units</TableCell>
                  <TableCell>Installed Capacity</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Commissioned</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Factory sx={{ fontSize: '2.5rem', color: 'text.disabled' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          No power plants registered yet
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          Click "Add Power Plant" to register your first plant
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.plantName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={row.plantCode} size="small" variant="outlined"
                          sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
                      </TableCell>
                      <TableCell>
                        <Chip label={row.classificationType} size="small"
                          color={CLASSIFICATION_COLORS[row.classificationType.toLowerCase()] ?? 'default'}
                          sx={{ fontWeight: 600, textTransform: 'capitalize' }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.generationTypeName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.plantOwner}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.numberOfUnits}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {row.installedCapacity.toLocaleString()} MW
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.locationName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {new Date(row.commissioningDate).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </Typography>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editTarget ? 'Edit Power Plant' : 'Add Power Plant'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: '20px !important' }}>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField label="Plant Name" value={form.plantName}
                onChange={(e) => setForm({ ...form, plantName: e.target.value })}
                fullWidth required placeholder="e.g. Akosombo Hydro Power Plant" />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Plant Code" value={form.plantCode}
                onChange={(e) => setForm({ ...form, plantCode: e.target.value.toUpperCase() })}
                fullWidth required placeholder="e.g. AKS"
                slotProps={{ htmlInput: { maxLength: 20 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Plant Classification</InputLabel>
                <Select label="Plant Classification" value={form.classificationCode || ''}
                  onChange={(e) => handleClassificationChange(Number(e.target.value))}>
                  {classifications.map((c) => (
                    <MenuItem key={c.id} value={c.classificationCode}>{c.classificationType}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!form.classificationCode}>
                <InputLabel>Generation Type</InputLabel>
                <Select label="Generation Type" value={form.generationTypeCode || ''}
                  onChange={(e) => handleGenerationTypeChange(Number(e.target.value))}>
                  {filteredGenTypes.length === 0 ? (
                    <MenuItem disabled value=""><em>Select a classification first</em></MenuItem>
                  ) : (
                    filteredGenTypes.map((g) => (
                      <MenuItem key={g.id} value={g.typeCode}>{g.typeName}</MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Plant Owner" value={form.plantOwner}
                onChange={(e) => setForm({ ...form, plantOwner: e.target.value })}
                fullWidth placeholder="e.g. Volta River Authority" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Location</InputLabel>
                <Select label="Location" value={form.locationCode || ''}
                  onChange={(e) => handleLocationChange(Number(e.target.value))}>
                  {locations.map((l) => (
                    <MenuItem key={l.id} value={l.locationCode}>{l.locationName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Installed Capacity (MW)" type="number"
                value={form.installedCapacity || ''}
                onChange={(e) => setForm({ ...form, installedCapacity: Number(e.target.value) })}
                fullWidth required slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Standard Measuring Unit" type="number"
                value={form.standardMeasuringUnit || ''}
                onChange={(e) => setForm({ ...form, standardMeasuringUnit: Number(e.target.value) })}
                fullWidth slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Number of Units" type="number"
                value={form.numberOfUnits || ''}
                onChange={(e) => setForm({ ...form, numberOfUnits: Number(e.target.value) })}
                fullWidth slotProps={{ htmlInput: { min: 0 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Commissioning Date" type="date"
                value={form.commissioningDate}
                onChange={(e) => setForm({ ...form, commissioningDate: e.target.value })}
                fullWidth required slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
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
                {saving ? 'Saving...' : editTarget ? 'Update Plant' : 'Add Plant'}
              </Button>
            )}
          </Stack>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Power Plant"
        message={`Are you sure you want to delete "${deleteTarget?.plantName}"? This will not delete associated units, systems or equipment.`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}