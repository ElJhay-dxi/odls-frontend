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
import { plantLineApi } from '../../api/masterData/plantLineApi';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import type { PlantLine, PowerPlant } from '../../types/masterData';
import { useSectionPermissions } from '../../hooks/usePermission';

interface CreateForm { plantCode: string; lineCode: string; lineName: string; }
interface UpdateForm { lineName: string; }

const emptyCreate: CreateForm = { plantCode: '', lineCode: '', lineName: '' };
const emptyUpdate: UpdateForm = { lineName: '' };

export default function PlantLinePage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('master');
  const [allRows, setAllRows] = useState<PlantLine[]>([]);
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterPlant, setFilterPlant] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlantLine | null>(null);
  const [form, setForm] = useState<CreateForm>(emptyCreate);
  const [updateForm, setUpdateForm] = useState<UpdateForm>(emptyUpdate);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<PlantLine | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll().then((res) => setPlants(res.data));
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await plantLineApi.getAll();
      setAllRows(res.data);
    } catch {
      setError('Failed to load lines.');
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

  const openEdit = (row: PlantLine) => {
    setEditTarget(row);
    setUpdateForm({ lineName: row.lineName });
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
        await plantLineApi.update(editTarget.id, updateForm.lineName);
      } else {
        await plantLineApi.create({
          plantCode: form.plantCode,
          lineCode: form.lineCode,
          lineName: form.lineName,
        });
      }
      closeDialog();
      fetchRows();
    } catch (err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setSaveError(axiosErr.response?.data?.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await plantLineApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRows();
    } catch {
      setError('Failed to delete line.');
    } finally {
      setDeleting(false);
    }
  };

  const isCreateValid = form.plantCode && form.lineCode && form.lineName.trim();
  const isUpdateValid = updateForm.lineName.trim();

  return (
    <Box>
      <PageHeader
        title="Plant Line Master"
        subtitle="Configure transmission lines per plant for station log selection"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Plant Lines' }]}
        action={canCreate ? { label: 'Add Line', onClick: openCreate } : undefined}
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
                {filterPlant ? 'No lines found for selected plant.' : 'No lines configured yet.'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Plant</TableCell>
                    <TableCell>Line Code</TableCell>
                    <TableCell>Line Name</TableCell>
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
                        <Typography variant="body2">{row.lineCode}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.lineName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{row.createdByName}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        {canEdit && (
                          <Tooltip title="Edit name">
                            <IconButton size="small" color="primary" onClick={() => openEdit(row)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDelete && (
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
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
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
            <Settings sx={{ color: '#1565C0' }} />
            <Typography sx={{ fontWeight: 700 }}>{editTarget ? 'Edit Line' : 'Add Line'}</Typography>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

          {editTarget ? (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1}>
                <Chip label={editTarget.plantCode} size="small" variant="outlined" />
                <Chip label={`${editTarget.lineCode}`} size="small" color="primary" variant="outlined" />
              </Stack>
              <TextField
                label="Line Name" value={updateForm.lineName}
                onChange={(e) => setUpdateForm({ lineName: e.target.value })}
                fullWidth required autoFocus
                helperText="The line code cannot be changed after creation." />
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
                <TextField label="Line Code" fullWidth required
                  value={form.lineCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, lineCode: e.target.value }))}
                  placeholder="e.g. L1" helperText="Unique code per plant" />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField label="Line Name" fullWidth required
                  value={form.lineName}
                  onChange={(e) => setForm((prev) => ({ ...prev, lineName: e.target.value }))}
                  placeholder="e.g. Akosombo-Tema Line" />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
          {(editTarget ? canEdit : canCreate) && (
            <Button variant="contained" onClick={handleSave}
              disabled={saving || (editTarget ? !isUpdateValid : !isCreateValid)}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
              {saving ? 'Saving...' : editTarget ? 'Update' : 'Add Line'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Line"
        message={`Delete line #${deleteTarget?.lineCode} (${deleteTarget?.lineName}) from plant ${deleteTarget?.plantCode}?`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
