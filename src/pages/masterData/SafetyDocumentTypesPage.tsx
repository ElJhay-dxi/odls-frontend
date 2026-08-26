import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, Divider, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip, FormControl, InputLabel,
  Select, MenuItem, OutlinedInput, Checkbox, ListItemText,
  Switch, FormControlLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, InputAdornment,
} from '@mui/material';
import { Add, Edit, Delete, Assignment, Search } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { plantClassificationApi } from '../../api/masterData/plantClassificationApi';
import { safetyDocumentTypeApi } from '../../api/masterData/safetyDocumentTypeApi';
import type { PlantClassification } from '../../types/masterData';
import type { SafetyDocumentType, SaveSafetyDocumentTypeForm } from '../../types/safetyDocumentType';
import { useSectionPermissions } from '../../hooks/usePermission';

const emptyForm: SaveSafetyDocumentTypeForm = {
  name: '',
  description: '',
  applicableClassifications: [],
  isActive: true,
};

export default function SafetyDocumentTypesPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('master.view');

  const [classifications, setClassifications] = useState<PlantClassification[]>([]);
  const [records, setRecords] = useState<SafetyDocumentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterText, setFilterText] = useState('');
  const [filterClassification, setFilterClassification] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SafetyDocumentType | null>(null);
  const [form, setForm] = useState<SaveSafetyDocumentTypeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<SafetyDocumentType | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    plantClassificationApi.getAll().then((res) => setClassifications(res.data));
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await safetyDocumentTypeApi.getAll();
      setRecords(res.data);
    } catch {
      setError('Failed to load safety document types.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setSaveError(null);
    setDialogOpen(true);
  };

  const openEdit = (row: SafetyDocumentType) => {
    setEditTarget(row);
    setForm({
      name: row.name,
      description: row.description ?? '',
      applicableClassifications: row.applicableClassifications
        ? row.applicableClassifications.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      isActive: row.isActive,
    });
    setSaveError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        applicableClassifications: form.applicableClassifications.join(',') || null,
        isActive: form.isActive,
      };
      if (editTarget) {
        await safetyDocumentTypeApi.update(editTarget.id, payload);
      } else {
        await safetyDocumentTypeApi.create(payload);
      }
      setDialogOpen(false);
      fetchRecords();
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
      await safetyDocumentTypeApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
    } catch {
      setError('Failed to delete safety document type.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered records
  const filtered = records.filter((r) => {
    const matchText = !filterText ||
      r.code.toLowerCase().includes(filterText.toLowerCase()) ||
      r.name.toLowerCase().includes(filterText.toLowerCase()) ||
      (r.description ?? '').toLowerCase().includes(filterText.toLowerCase());
    const matchClass = !filterClassification ||
      (r.applicableClassifications ?? '').includes(filterClassification);
    const matchActive =
      filterActive === 'all' ? true :
      filterActive === 'active' ? r.isActive :
      !r.isActive;
    return matchText && matchClass && matchActive;
  });

  const classificationChips = (val?: string) => {
    if (!val) return null;
    return val.split(',').map((c) => c.trim()).filter(Boolean).map((c) => (
      <Chip key={c} label={c} size="small" variant="outlined" sx={{ fontSize: 11 }} />
    ));
  };

  return (
    <Box>
      <PageHeader
        title="Safety Document Types"
        subtitle="Manage safety document types and their applicable plant classifications"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Safety Document Types' }]}
      />

      <Card>
        <CardHeader
          title={
            <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
              <Assignment sx={{ color: 'text.secondary' }} />
              <Typography sx={{ fontWeight: 700 }}>Safety Document Types</Typography>
              <Chip label={`${filtered.length}`} size="small" variant="outlined" />
            </Stack>
          }
          action={
            canCreate && (
              <Button variant="contained" startIcon={<Add />} onClick={openCreate} size="small">
                Add Type
              </Button>
            )
          }
        />
        <Divider />
        <CardContent>
          {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

          {/* Filters */}
          <Stack direction="row" spacing={1.5} sx={{ mb: 2.5, flexWrap: 'wrap' }} useFlexGap>
            <TextField
              size="small" placeholder="Search code, name or description…"
              value={filterText} onChange={(e) => setFilterText(e.target.value)}
              sx={{ minWidth: 260 }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> } }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Classification</InputLabel>
              <Select label="Classification" value={filterClassification} onChange={(e) => setFilterClassification(e.target.value)}>
                <MenuItem value="">All Classifications</MenuItem>
                {classifications.map((c) => (
                  <MenuItem key={c.id} value={c.classificationType}>{c.classificationType}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={filterActive} onChange={(e) => setFilterActive(e.target.value as typeof filterActive)}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Assignment sx={{ fontSize: '2.5rem', color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {records.length === 0 ? 'No safety document types yet. Click Add Type to get started.' : 'No results match your filters.'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 100 }}>Code</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Applicable To</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 90 }}>Status</TableCell>
                    <TableCell align="right" sx={{ width: 90 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Chip label={row.code} size="small" color="primary" variant="outlined"
                          sx={{ fontWeight: 700, fontFamily: 'monospace' }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>
                          {row.description ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                          {classificationChips(row.applicableClassifications) ?? (
                            <Typography variant="caption" color="text.disabled">All</Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          color={row.isActive ? 'success' : 'default'}
                          variant={row.isActive ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {canEdit && (
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(row)}>
                              <Edit sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDelete && (
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
                              <Delete sx={{ fontSize: 16 }} />
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editTarget ? 'Edit Safety Document Type' : 'New Safety Document Type'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
          <Stack spacing={2.5}>
            <Stack spacing={1}>
              <TextField
                label="Name" required size="small" fullWidth
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Live Work Certificate"
              />
              {form.name.trim() && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                  Code will be auto-generated as:{' '}
                  <strong>
                    {form.name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? '').join('')}
                  </strong>
                </Typography>
              )}
            </Stack>
            <TextField
              label="Description" size="small" fullWidth multiline rows={2}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of when this document type is used"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Applicable Plant Classifications</InputLabel>
              <Select
                multiple
                value={form.applicableClassifications}
                onChange={(e) => setForm((p) => ({
                  ...p,
                  applicableClassifications: typeof e.target.value === 'string'
                    ? e.target.value.split(',')
                    : e.target.value,
                }))}
                input={<OutlinedInput label="Applicable Plant Classifications" />}
                renderValue={(selected) => (
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                    {selected.map((val) => <Chip key={val} label={val} size="small" />)}
                  </Stack>
                )}
              >
                {classifications.map((c) => (
                  <MenuItem key={c.id} value={c.classificationType}>
                    <Checkbox checked={form.applicableClassifications.includes(c.classificationType)} />
                    <ListItemText primary={c.classificationType} />
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
                Leave empty to apply to all plant types.
              </Typography>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  color="success"
                />
              }
              label={
                <Typography variant="body2">
                  {form.isActive ? 'Active — visible when logging safety documents' : 'Inactive — hidden from safety document forms'}
                </Typography>
              }
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button variant="outlined" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}
            disabled={saving || !form.name.trim()}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}>
            {saving ? 'Saving...' : editTarget ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Safety Document Type"
        message={`Delete "${deleteTarget?.name}" (${deleteTarget?.code})? This cannot be undone.`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}