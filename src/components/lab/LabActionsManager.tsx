import {
  Box, Card, CardContent, Button, CircularProgress, Alert, Typography, Stack, Chip, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Switch,
  FormControlLabel, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Add, Edit, Delete, Save, FactCheck } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import ConfirmDialog from '../shared/ConfirmDialog';
import { labAnalysisActionsApi } from '../../api/lab/labAnalysisActionsApi';
import type { LabAnalysisAction } from '../../types/lab';

const ACCENT = '#00695C';

interface Props { plantCode: string; plantName?: string; canCreate: boolean; canEdit: boolean; canDelete: boolean; }
interface ActionForm { name: string; description: string; isActive: boolean; }
const emptyForm: ActionForm = { name: '', description: '', isActive: true };

const apiMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

export default function LabActionsManager({ plantCode, plantName, canCreate, canEdit, canDelete }: Props) {
  const [items, setItems] = useState<LabAnalysisAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LabAnalysisAction | null>(null);
  const [form, setForm] = useState<ActionForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LabAnalysisAction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!plantCode) { setItems([]); return; }
    setLoading(true); setError(null);
    try {
      const res = await labAnalysisActionsApi.getAll(plantCode);
      setItems(res.data);
    } catch {
      setError('Failed to load actions.');
    } finally {
      setLoading(false);
    }
  }, [plantCode]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setSaveError(null); setDialogOpen(true); };
  const openEdit = (row: LabAnalysisAction) => {
    setEditTarget(row);
    setForm({ name: row.name, description: row.description ?? '', isActive: row.isActive });
    setSaveError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) return;
    setSaving(true); setSaveError(null);
    try {
      const payload = { plantCode, name, description: form.description.trim() || null, isActive: form.isActive };
      if (editTarget) await labAnalysisActionsApi.update(editTarget.id, payload);
      else await labAnalysisActionsApi.create(payload);
      setDialogOpen(false);
      await load();
    } catch (err: unknown) {
      setSaveError(apiMessage(err, 'Failed to save action.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (row: LabAnalysisAction) => {
    if (!canEdit) return;
    try {
      await labAnalysisActionsApi.update(row.id, { plantCode, name: row.name, description: row.description ?? null, isActive: !row.isActive });
      load();
    } catch (err: unknown) {
      setError(apiMessage(err, 'Failed to update action.'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await labAnalysisActionsApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      setDeleteTarget(null);
      setError(apiMessage(err, 'Failed to delete action.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card>
        <Box sx={{
          px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: `${ACCENT}14`, borderBottom: '1px solid', borderColor: 'divider',
        }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: ACCENT }}>
              Actions To Be Taken
            </Typography>
            <Typography variant="caption" color="text.secondary">{plantName ? `For ${plantName}` : 'Select a plant'}</Typography>
          </Stack>
          {canCreate && plantCode && (
            <Button size="small" variant="contained" sx={{ backgroundColor: ACCENT }} startIcon={<Add />} onClick={openCreate}>
              Add Action
            </Button>
          )}
        </Box>
        <CardContent>
          {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
          ) : !plantCode ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Select a plant above to manage its actions.
            </Typography>
          ) : items.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <FactCheck sx={{ fontSize: '2.5rem', color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No actions yet. Click Add Action — e.g. what to do once an analysis result is known.
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Action</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Used In</TableCell>
                      <TableCell>Active</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((a) => (
                      <TableRow key={a.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{a.name}</Typography>
                          {!a.plantCode && (
                            <Tooltip title="Created before actions were per plant, so every plant can still use it. Edit and save it to assign it to this plant.">
                              <Chip label="All plants (unassigned)" size="small" color="warning" variant="outlined" sx={{ mt: 0.5 }} />
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>{a.description || '—'}</TableCell>
                        <TableCell>{a.usageCount}</TableCell>
                        <TableCell>
                          <Chip label={a.isActive ? 'Active' : 'Inactive'} size="small"
                            color={a.isActive ? 'success' : 'default'} variant={a.isActive ? 'filled' : 'outlined'}
                            onClick={canEdit ? () => handleToggle(a) : undefined}
                            sx={canEdit ? { cursor: 'pointer' } : undefined} />
                        </TableCell>
                        <TableCell align="right">
                          {canEdit && (
                            <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(a)}><Edit fontSize="small" /></IconButton></Tooltip>
                          )}
                          {canDelete && (
                            <Tooltip title={a.usageCount > 0 ? 'In use — deactivate instead' : 'Delete'}>
                              <span>
                                <IconButton size="small" color="error" disabled={a.usageCount > 0} onClick={() => setDeleteTarget(a)}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                Active actions appear in the "Action To Be Taken" dropdown on Lab Analysis for this plant only. Renaming an action
                updates this plant's analysis records that use it.
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editTarget ? 'Edit Action' : 'New Action'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
          <Stack spacing={2.5}>
            <TextField label="Action Name" size="small" fullWidth required autoFocus
              slotProps={{ htmlInput: { maxLength: 100 } }}
              helperText={editTarget && !editTarget.plantCode
                ? `Saving assigns this action to ${plantName ?? 'the selected plant'}.`
                : editTarget && editTarget.usageCount > 0
                  ? `Renaming also updates the ${editTarget.usageCount} analysis record(s) using it.` : undefined}
              value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <TextField label="Description" size="small" fullWidth multiline rows={2}
              slotProps={{ htmlInput: { maxLength: 255 } }}
              value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            <FormControlLabel
              control={<Switch checked={form.isActive} color="success"
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />}
              label={<Typography variant="body2">{form.isActive ? 'Active' : 'Inactive'}</Typography>}
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button variant="outlined" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" sx={{ backgroundColor: ACCENT }} onClick={handleSave}
            disabled={saving || !form.name.trim()}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}>
            {saving ? 'Saving...' : editTarget ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} title="Delete Action"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </>
  );
}
