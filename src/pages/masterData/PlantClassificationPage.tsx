import {
  Box, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, Tooltip,
  Typography,
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { plantClassificationApi } from '../../api/masterData/plantClassificationApi';
import type { PlantClassification, PlantClassificationForm } from '../../types/masterData';
import { useMsal } from '@azure/msal-react';

const CLASSIFICATION_COLORS: Record<string, 'primary' | 'error' | 'warning' | 'success' | 'default'> = {
  thermal: 'error',
  hydro: 'primary',
  solar: 'warning',
  wind: 'success',
};

const emptyForm: PlantClassificationForm = {
  classificationCode: 0,
  classificationType: '',
};

export default function PlantClassificationPage() {
  const { accounts } = useMsal();
  const user = accounts[0];

  const [rows, setRows] = useState<PlantClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlantClassification | null>(null);
  const [form, setForm] = useState<PlantClassificationForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<PlantClassification | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const res = await plantClassificationApi.getAll();
      setRows(res.data);
    } catch {
      setError('Failed to load plant classifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: PlantClassification) => {
    setEditTarget(row);
    setForm({ classificationCode: row.classificationCode, classificationType: row.classificationType });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        createdByName: user?.name ?? '',
        createdByEmail: user?.username ?? '',
      };
      if (editTarget) {
        await plantClassificationApi.update(editTarget.id, payload);
      } else {
        await plantClassificationApi.create(payload);
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
      setError('Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Plant Classifications"
        subtitle="Manage plant classification types (Thermal, Hydro, Solar, Wind)"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Plant Classifications' }]}
        action={{ label: 'Add Classification', onClick: openCreate, icon: <Add /> }}
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Classification Type</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Created On</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No classifications found. Click "Add Classification" to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Chip label={row.classificationCode} size="small" variant="outlined" />
                      </TableCell>
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
                          {new Date(row.createdOn).toLocaleDateString('en-GB')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(row)} color="primary">
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => setDeleteTarget(row)} color="error">
                            <Delete fontSize="small" />
                          </IconButton>
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editTarget ? 'Edit Classification' : 'Add Classification'}
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Classification Code"
            type="number"
            value={form.classificationCode}
            onChange={(e) => setForm({ ...form, classificationCode: Number(e.target.value) })}
            fullWidth
            required
          />
          <TextField
            label="Classification Type"
            placeholder="e.g. Thermal, Hydro, Solar"
            value={form.classificationType}
            onChange={(e) => setForm({ ...form, classificationType: e.target.value })}
            fullWidth
            required
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !form.classificationType || form.classificationCode === 0}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Classification"
        message={`Are you sure you want to delete "${deleteTarget?.classificationType}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}