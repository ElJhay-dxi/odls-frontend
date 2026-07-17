import {
  Box, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, Tooltip,
  Typography, MenuItem, FormControl, InputLabel, Select,
  Stack, Divider,
} from '@mui/material';
import { Edit, Delete, Add, FilterList } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { generationTypeApi } from '../../api/masterData/generationTypeApi';
import { plantClassificationApi } from '../../api/masterData/plantClassificationApi';
import type { GenerationType, GenerationTypeForm, PlantClassification } from '../../types/masterData';
import { useSectionPermissions } from '../../hooks/usePermission';

const emptyForm: GenerationTypeForm = {
  typeName: '',
  classificationCode: 0,
};

export default function GenerationTypePage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('master');
  const [rows, setRows] = useState<GenerationType[]>([]);
  const [classifications, setClassifications] = useState<PlantClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterClassCode, setFilterClassCode] = useState<number | ''>('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GenerationType | null>(null);
  const [form, setForm] = useState<GenerationTypeForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<GenerationType | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    plantClassificationApi.getAll()
      .then((res) => setClassifications(res.data))
      .catch(() => setError('Failed to load classifications.'));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = filterClassCode
        ? await generationTypeApi.getByClassification(filterClassCode)
        : await generationTypeApi.getAll();
      setRows(res.data);
    } catch {
      setError('Failed to load generation types.');
    } finally {
      setLoading(false);
    }
  }, [filterClassCode]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: GenerationType) => {
    setEditTarget(row);
    setForm({ typeName: row.typeName, classificationCode: row.classificationCode });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editTarget) {
        await generationTypeApi.update(editTarget.id, form);
      } else {
        await generationTypeApi.create(form);
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
      await generationTypeApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      setError('Cannot delete — this generation type is assigned to one or more power plants.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid =
    form.typeName.trim().length > 0 &&
    form.classificationCode > 0;

  return (
    <Box>
      <PageHeader
        title="Generation Types"
        subtitle="Manage generation type configurations linked to plant classifications"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Generation Types' }]}
        action={canCreate ? { label: 'Add Generation Type', onClick: openCreate, icon: <Add /> } : undefined}
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: '12px !important' }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <FilterList sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, mr: 1 }} color="text.secondary">Filter:</Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Plant Classification</InputLabel>
              <Select label="Plant Classification" value={filterClassCode}
                onChange={(e) => setFilterClassCode(e.target.value as number | '')}>
                <MenuItem value="">All Classifications</MenuItem>
                {classifications.map((c) => (
                  <MenuItem key={c.id} value={c.classificationCode}>{c.classificationType}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {filterClassCode !== '' && (
              <Button size="small" variant="outlined" onClick={() => setFilterClassCode('')}>Clear</Button>
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
                  <TableCell>Type Name</TableCell>
                  <TableCell>Plant Classification</TableCell>
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
                        No generation types found.{' '}
                        {filterClassCode ? 'Try clearing the filter.' : 'Click "Add Generation Type" to get started.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.typeName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={row.classificationType} size="small" color="primary" variant="outlined"
                          sx={{ textTransform: 'capitalize', fontWeight: 500 }} />
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
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editTarget ? 'Edit Generation Type' : 'Add Generation Type'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: '20px !important', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <FormControl fullWidth required>
            <InputLabel>Plant Classification</InputLabel>
            <Select label="Plant Classification" value={form.classificationCode || ''}
              onChange={(e) => setForm({ ...form, classificationCode: Number(e.target.value) })}>
              {classifications.map((c) => (
                <MenuItem key={c.id} value={c.classificationCode}>{c.classificationType}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Type Name"
            placeholder="e.g. Simple Cycle, Combined Cycle, Hydro"
            value={form.typeName}
            onChange={(e) => setForm({ ...form, typeName: e.target.value })}
            fullWidth required
            helperText="A unique code will be assigned automatically." />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Stack direction="row" spacing={1.5}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined" disabled={saving}>Cancel</Button>
            {(editTarget ? canEdit : canCreate) && (
              <Button onClick={handleSave} variant="contained"
                disabled={saving || !isFormValid}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
                {saving ? 'Saving...' : editTarget ? 'Update' : 'Add Generation Type'}
              </Button>
            )}
          </Stack>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Generation Type"
        message={`Are you sure you want to delete "${deleteTarget?.typeName}"? This action cannot be undone.`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}