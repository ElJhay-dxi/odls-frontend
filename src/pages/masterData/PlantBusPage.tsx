import {
  Box, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, Tooltip,
  Typography, MenuItem, FormControl, InputLabel, Select,
  Grid, Divider, Stack,
} from '@mui/material';
import { Edit, Delete, Settings } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { plantBusApi } from '../../api/hourly/hourlyBusVoltageApi';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import type { PlantBus } from '../../types/plantBus';
import type { PowerPlant } from '../../types/masterData';

interface CreateForm {
  plantCode: string;
  busCode: string;
  busName: string;
}
interface UpdateForm {
  busName: string;
}

const emptyCreate: CreateForm = { plantCode: '', busCode: '', busName: '' };
const emptyUpdate: UpdateForm = { busName: '' };

export default function PlantBusPage() {
  const [allRows, setAllRows] = useState<PlantBus[]>([]);
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterPlant, setFilterPlant] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlantBus | null>(null);
  const [form, setForm] = useState<CreateForm>(emptyCreate);
  const [updateForm, setUpdateForm] = useState<UpdateForm>(emptyUpdate);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<PlantBus | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // All plant types can have buses — no classification filter
    powerPlantApi.getAll().then((res) => setPlants(res.data));
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await plantBusApi.getAll();
      setAllRows(res.data);
    } catch {
      setError('Failed to load buses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const rows = allRows.filter((r) => !filterPlant || r.plantCode === filterPlant);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyCreate);
    setSaveError(null);
    setDialogOpen(true);
  };

  const openEdit = (row: PlantBus) => {
    setEditTarget(row);
    setUpdateForm({ busName: row.busName });
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
        await plantBusApi.update(editTarget.id, updateForm.busName);
      } else {
        await plantBusApi.create({
          plantCode: form.plantCode,
          busCode: form.busCode,
          busName: form.busName,
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
      await plantBusApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRows();
    } catch {
      setError('Failed to delete bus.');
    } finally {
      setDeleting(false);
    }
  };

  const isCreateValid = form.plantCode && form.busCode && form.busName.trim();
  const isUpdateValid = updateForm.busName.trim();

  return (
    <Box>
      <PageHeader
        title="Plant Bus Master"
        subtitle="Configure bus bars per plant for hourly voltage logging"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Plant Buses' }]}
        action={{ label: 'Add Bus', onClick: openCreate }}
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
          </Grid>

          {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
          ) : rows.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Settings sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {filterPlant ? 'No buses found for selected plant.' : 'No buses configured yet.'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Plant</TableCell>
                    <TableCell>Bus Code</TableCell>
                    <TableCell>Bus Name</TableCell>
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
                        <Typography variant="body2">{row.busCode}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.busName}</Typography>
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

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
            <Settings sx={{ color: '#1565C0' }} />
            <Typography sx={{ fontWeight: 700 }}>{editTarget ? 'Edit Bus' : 'Add Bus'}</Typography>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

          {editTarget ? (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1}>
                <Chip label={editTarget.plantCode} size="small" variant="outlined" />
                <Chip label={`${editTarget.busCode}`} size="small" color="primary" variant="outlined" />
              </Stack>
              <TextField
                label="Bus Name"
                value={updateForm.busName}
                onChange={(e) => setUpdateForm({ busName: e.target.value })}
                fullWidth required autoFocus
                helperText="The bus code cannot be changed after creation."
              />
            </Stack>
          ) : (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
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
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Bus Code" fullWidth required
                  value={form.busCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, busCode: e.target.value }))}
                  placeholder="e.g. A1"
                  helperText="Unique code per plant"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  label="Bus Name" fullWidth required
                  value={form.busName}
                  onChange={(e) => setForm((prev) => ({ ...prev, busName: e.target.value }))}
                  placeholder="e.g. Akosombo Bus"
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
            {saving ? 'Saving...' : editTarget ? 'Update' : 'Add Bus'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Bus"
        message={`Delete bus #${deleteTarget?.busCode} (${deleteTarget?.busName}) from plant ${deleteTarget?.plantCode}? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}