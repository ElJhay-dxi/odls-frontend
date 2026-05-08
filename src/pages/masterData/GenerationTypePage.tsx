import {
  Box, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, Tooltip,
  Typography, MenuItem, FormControl, InputLabel, Select,
  Stack,
} from '@mui/material';
import { Edit, Delete, Add, FilterList } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { generationTypeApi } from '../../api/masterData/generationTypeApi';
import { plantClassificationApi } from '../../api/masterData/plantClassificationApi';
import type { GenerationType, GenerationTypeForm, PlantClassification } from '../../types/masterData';

const emptyForm: GenerationTypeForm = {
  typeCode: 0,
  typeName: '',
  classificationCode: 0,
};

export default function GenerationTypePage() {
  const { accounts } = useMsal();
  const user = accounts[0];

  const [rows, setRows] = useState<GenerationType[]>([]);
  const [classifications, setClassifications] = useState<PlantClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter
  const [filterClassCode, setFilterClassCode] = useState<number | ''>('');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GenerationType | null>(null);
  const [form, setForm] = useState<GenerationTypeForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<GenerationType | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load classifications for dropdown
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
    setForm({ typeCode: row.typeCode, typeName: row.typeName, classificationCode: row.classificationCode });
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
        await generationTypeApi.update(editTarget.id, payload);
      } else {
        await generationTypeApi.create(payload);
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
      setError('Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const classificationLabel = (code: number) =>
    classifications.find((c) => c.classificationCode === code)?.classificationType ?? `Code ${code}`;

  const isFormValid =
    form.typeCode > 0 &&
    form.typeName.trim().length > 0 &&
    form.classificationCode > 0;

  return (
    <Box>
      <PageHeader
        title="Generation Types"
        subtitle="Manage generation type configurations linked to plant classifications"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Generation Types' }]}
        action={{ label: 'Add Generation Type', onClick: openCreate, icon: <Add /> }}
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filter Bar */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: '12px !important' }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <FilterList sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, mr: 1 }} color="text.secondary">
              Filter:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Plant Classification</InputLabel>
              <Select
                label="Plant Classification"
                value={filterClassCode}
                onChange={(e) => setFilterClassCode(e.target.value as number | '')}
              >
                <MenuItem value="">All Classifications</MenuItem>
                {classifications.map((c) => (
                  <MenuItem key={c.id} value={c.classificationCode}>
                    {c.classificationType}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {filterClassCode !== '' && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => setFilterClassCode('')}
              >
                Clear
              </Button>
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
                  <TableCell>Type Code</TableCell>
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
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
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
                        <Chip label={row.typeCode} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {row.typeName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={classificationLabel(row.classificationCode)}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ textTransform: 'capitalize', fontWeight: 500 }}
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
          {editTarget ? 'Edit Generation Type' : 'Add Generation Type'}
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="Type Code"
            type="number"
            value={form.typeCode || ''}
            onChange={(e) => setForm({ ...form, typeCode: Number(e.target.value) })}
            fullWidth
            required
            helperText="e.g. 1 = Simple Cycle, 2 = Combined Cycle, 3 = Hydro"
          />
          <TextField
            label="Type Name"
            placeholder="e.g. Simple Cycle, Combined Cycle, Hydro"
            value={form.typeName}
            onChange={(e) => setForm({ ...form, typeName: e.target.value })}
            fullWidth
            required
          />
          <FormControl fullWidth required>
            <InputLabel>Plant Classification</InputLabel>
            <Select
              label="Plant Classification"
              value={form.classificationCode || ''}
              onChange={(e) => setForm({ ...form, classificationCode: Number(e.target.value) })}
            >
              {classifications.map((c) => (
                <MenuItem key={c.id} value={c.classificationCode}>
                  {c.classificationType}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !isFormValid}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Generation Type"
        message={`Are you sure you want to delete "${deleteTarget?.typeName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
