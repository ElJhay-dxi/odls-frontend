import {
  Box, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, Tooltip,
  Typography, Divider, Stack,
} from '@mui/material';
import { Edit, Delete, Add, LocationOn } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { plantLocationApi } from '../../api/masterData/plantLocationApi';
import type { PlantLocation } from '../../types/masterData';

const emptyForm = { locationCode: 0, locationName: '' };

export default function PlantLocationPage() {
  const { accounts } = useMsal();
  const user = accounts[0];

  const [rows, setRows] = useState<PlantLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlantLocation | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<PlantLocation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await plantLocationApi.getAll();
      setRows(res.data);
    } catch {
      setError('Failed to load plant locations.');
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

  const openEdit = (row: PlantLocation) => {
    setEditTarget(row);
    setForm({ locationCode: row.locationCode, locationName: row.locationName });
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
        await plantLocationApi.update(editTarget.id, payload);
      } else {
        await plantLocationApi.create(payload);
      }
      setDialogOpen(false);
      fetchAll();
    } catch {
      setError('Failed to save. Check for duplicate code or name.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await plantLocationApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      setError('Cannot delete — this location is assigned to one or more power plants.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid =
    form.locationCode > 0 &&
    form.locationName.trim().length > 0;

  return (
    <Box>
      <PageHeader
        title="Plant Locations"
        subtitle="Manage geographic locations assigned to power plants"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Plant Locations' }]}
        action={{ label: 'Add Location', onClick: openCreate, icon: <Add /> }}
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Location Code</TableCell>
                  <TableCell>Location Name</TableCell>
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
                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <LocationOn sx={{ fontSize: '2.5rem', color: 'text.disabled' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          No locations added yet
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          Click "Add Location" to get started
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Chip
                          label={row.locationCode}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationOn sx={{ fontSize: '1rem', color: 'text.disabled' }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {row.locationName}
                          </Typography>
                        </Box>
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
          {editTarget ? 'Edit Location' : 'Add Location'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: '20px !important', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="Location Code"
            type="number"
            value={form.locationCode || ''}
            onChange={(e) => setForm({ ...form, locationCode: Number(e.target.value) })}
            fullWidth required
            helperText="Unique numeric identifier for this location"
            slotProps={{  htmlInput: {    min: 1,  },}}
          />
          <TextField
            label="Location Name"
            value={form.locationName}
            onChange={(e) => setForm({ ...form, locationName: e.target.value })}
            fullWidth required
            placeholder="e.g. Akosombo, Akuse, Tema"
          />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={1.5}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined" disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={saving || !isFormValid}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {saving ? 'Saving...' : editTarget ? 'Update' : 'Add Location'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Location"
        message={`Are you sure you want to delete "${deleteTarget?.locationName}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}