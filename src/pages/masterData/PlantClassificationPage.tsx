import {
  Box, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, Tooltip,
  Typography, Divider, Stack, Chip,
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { plantClassificationApi } from '../../api/masterData/plantClassificationApi';
import type { PlantClassification, PlantClassificationForm } from '../../types/masterData';
import { useSectionPermissions } from '../../hooks/usePermission';

const CLASSIFICATION_COLORS: Record<string, 'primary' | 'error' | 'warning' | 'success' | 'default'> = {
  thermal: 'error', hydro: 'primary', solar: 'warning', wind: 'success',
};

const emptyForm: PlantClassificationForm = { classificationType: '' };

export default function PlantClassificationPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('master');
  const [rows, setRows] = useState<PlantClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlantClassification | null>(null);
  const [form, setForm] = useState<PlantClassificationForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PlantClassification | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await plantClassificationApi.getAll();
      setRows(res.data);
    } catch {
      setError('Failed to load plant classifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: PlantClassification) => {
    setEditTarget(row);
    setForm({ classificationType: row.classificationType });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editTarget) {
        await plantClassificationApi.update(editTarget.id, form);
      } else {
        await plantClassificationApi.create(form);
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
      await plantClassificationApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      setError('Cannot delete — this classification has generation types linked to it. Remove those first.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid = form.classificationType.trim().length > 0;

  return (
    <Box>
      <PageHeader
        title="Plant Classifications"
        subtitle="Manage plant classification types (Thermal, Hydro, Solar, Wind)"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Plant Classifications' }]}
        action={canCreate ? { label: 'Add Classification', onClick: openCreate, icon: <Add /> } : undefined}
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Classification Type</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Created On</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                      <Typography variant="body2" color="text.secondary">
                        No classifications found. Click "Add Classification" to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Chip
                          label={row.classificationType}
                          size="small"
                          color={CLASSIFICATION_COLORS[row.classificationType.toLowerCase()] ?? 'default'}
                          sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.createdByName}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.createdByEmail}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(row.createdOn).toLocaleDateString('en-GB', {
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editTarget ? 'Edit Classification' : 'Add Classification'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: '20px !important' }}>
          <TextField
            label="Classification Type"
            placeholder="e.g. Thermal, Hydro, Solar, Wind"
            value={form.classificationType}
            onChange={(e) => setForm({ classificationType: e.target.value })}
            fullWidth required autoFocus
            helperText={
              editTarget
                ? 'Classification code cannot be changed after creation.'
                : 'A unique code will be assigned automatically.'
            }
          />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={1.5}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined" disabled={saving}>Cancel</Button>
            {(editTarget ? canEdit : canCreate) && (
              <Button onClick={handleSave} variant="contained"
                disabled={saving || !isFormValid}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
                {saving ? 'Saving...' : editTarget ? 'Update' : 'Add Classification'}
              </Button>
            )}
          </Stack>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Classification"
        message={`Are you sure you want to delete "${deleteTarget?.classificationType}"? This cannot be undone.`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}