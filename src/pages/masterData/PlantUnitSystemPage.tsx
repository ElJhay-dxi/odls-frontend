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
import { plantUnitSystemApi } from '../../api/masterData/plantUnitSystemApi';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { plantUnitApi } from '../../api/masterData/plantUnitApi';
import type {
  PlantUnitSystem, PlantUnitSystemForm, UpdatePlantUnitSystemForm,
  PowerPlant, PlantUnit,
} from '../../types/masterData';
import { useSectionPermissions } from '../../hooks/usePermission';

const emptyForm: PlantUnitSystemForm = {
  plantCode: '', unitCode: '', systemName: '', systemCode: '',
};

const emptyUpdateForm: UpdatePlantUnitSystemForm = {
  systemName: '', systemCode: '',
};

export default function PlantUnitSystemPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('master');
  const [rows, setRows] = useState<PlantUnitSystem[]>([]);
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [units, setUnits] = useState<PlantUnit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<PlantUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterPlantCode, setFilterPlantCode] = useState('');
  const [filterUnitCode, setFilterUnitCode] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlantUnitSystem | null>(null);
  const [form, setForm] = useState<PlantUnitSystemForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<UpdatePlantUnitSystemForm>(emptyUpdateForm);
  const [formUnits, setFormUnits] = useState<PlantUnit[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PlantUnitSystem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([powerPlantApi.getAll(), plantUnitApi.getAll()])
      .then(([p, u]) => { setPlants(p.data); setUnits(u.data); })
      .catch(() => setError('Failed to load reference data.'));
  }, []);

  useEffect(() => {
    setFilteredUnits(filterPlantCode ? units.filter((u) => u.plantCode === filterPlantCode) : []);
    setFilterUnitCode('');
  }, [filterPlantCode, units]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = filterPlantCode && filterUnitCode
        ? await plantUnitSystemApi.getByUnit(filterPlantCode, filterUnitCode)
        : await plantUnitSystemApi.getAll();
      setRows(res.data);
    } catch {
      setError('Failed to load unit systems.');
    } finally {
      setLoading(false);
    }
  }, [filterPlantCode, filterUnitCode]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleFormPlantChange = (plantCode: string) => {
    setFormUnits(units.filter((u) => u.plantCode === plantCode));
    setForm((prev) => ({ ...prev, plantCode, unitCode: '' }));
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setFormUnits([]);
    setDialogOpen(true);
  };

  const openEdit = (row: PlantUnitSystem) => {
    setEditTarget(row);
    setUpdateForm({ systemName: row.systemName, systemCode: row.systemCode });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editTarget) {
        await plantUnitSystemApi.update(editTarget.id, updateForm);
      } else {
        await plantUnitSystemApi.create(form);
      }
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
      await plantUnitSystemApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      setError('Cannot delete — this system has sub-systems linked to it. Remove those first.');
    } finally {
      setDeleting(false);
    }
  };

  const activeSystemName = editTarget ? updateForm.systemName : form.systemName;
  const activeSystemCode = editTarget ? updateForm.systemCode : form.systemCode;

  const isFormValid = editTarget
    ? updateForm.systemName.trim() && updateForm.systemCode.trim()
    : form.plantCode && form.unitCode && form.systemName.trim() && form.systemCode.trim();

  return (
    <Box>
      <PageHeader
        title="Unit Systems"
        subtitle="Manage systems within each generating unit"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Unit Systems' }]}
        action={canCreate ? { label: 'Add System', onClick: openCreate, icon: <Add /> } : undefined}
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: '12px !important' }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <FilterList sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }} color="text.secondary">Filter:</Typography>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Power Plant</InputLabel>
              <Select label="Power Plant" value={filterPlantCode} onChange={(e) => setFilterPlantCode(e.target.value)}>
                <MenuItem value="">All Plants</MenuItem>
                {plants.map((p) => <MenuItem key={p.id} value={p.plantCode}>{p.plantName}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }} disabled={!filterPlantCode}>
              <InputLabel>Unit</InputLabel>
              <Select label="Unit" value={filterUnitCode} onChange={(e) => setFilterUnitCode(e.target.value)}>
                <MenuItem value="">All Units</MenuItem>
                {filteredUnits.map((u) => <MenuItem key={u.id} value={u.unitCode}>{u.unitName}</MenuItem>)}
              </Select>
            </FormControl>
            {filterPlantCode && (
              <Button size="small" variant="outlined"
                onClick={() => { setFilterPlantCode(''); setFilterUnitCode(''); }}>Clear</Button>
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
                  <TableCell>Unit</TableCell>
                  <TableCell>System Name</TableCell>
                  <TableCell>System Code</TableCell>
                  <TableCell>Created By</TableCell>
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
                        <Typography variant="body2" color="text.secondary">No unit systems found.</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.plantName}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.plantCode}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.unitName}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.unitCode}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.systemName}</Typography></TableCell>
                    <TableCell>
                      <Chip label={row.systemCode} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.createdByName}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.createdByEmail}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{new Date(row.createdOn).toLocaleDateString('en-GB')}</Typography>
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
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editTarget ? 'Edit Unit System' : 'Add Unit System'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: '20px !important' }}>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!!editTarget}>
                <InputLabel>Power Plant</InputLabel>
                <Select label="Power Plant"
                  value={editTarget ? editTarget.plantCode : form.plantCode}
                  onChange={(e) => handleFormPlantChange(e.target.value)}>
                  {plants.map((p) => <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!!editTarget || !form.plantCode}>
                <InputLabel>Unit</InputLabel>
                <Select label="Unit"
                  value={editTarget ? editTarget.unitCode : form.unitCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, unitCode: e.target.value }))}>
                  {(editTarget ? units.filter(u => u.plantCode === editTarget.plantCode) : formUnits).map((u) => (
                    <MenuItem key={u.id} value={u.unitCode}>{u.unitName} ({u.unitCode})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField label="System Name" value={activeSystemName}
                onChange={(e) => editTarget
                  ? setUpdateForm({ ...updateForm, systemName: e.target.value })
                  : setForm({ ...form, systemName: e.target.value })}
                fullWidth required placeholder="e.g. Cooling Water System" />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="System Code" value={activeSystemCode}
                onChange={(e) => editTarget
                  ? setUpdateForm({ ...updateForm, systemCode: e.target.value.toUpperCase() })
                  : setForm({ ...form, systemCode: e.target.value.toUpperCase() })}
                fullWidth required placeholder="e.g. CWS"
                slotProps={{ htmlInput: { maxLength: 20 } }} />
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
                {saving ? 'Saving...' : editTarget ? 'Update' : 'Add System'}
              </Button>
            )}
          </Stack>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Unit System"
        message={`Delete "${deleteTarget?.systemName}" from ${deleteTarget?.plantName} – ${deleteTarget?.unitName}?`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}