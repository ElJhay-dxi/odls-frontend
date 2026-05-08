import {
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Button, CircularProgress,
  Alert, Tooltip, Typography, MenuItem, FormControl, InputLabel,
  Select, Grid, Divider, Stack,
} from '@mui/material';
import { Edit, Delete, Add, AccountTree } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { balanceOfPlantApi } from '../../api/masterData/balanceOfPlantApi';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import type { BalanceOfPlant, BalanceOfPlantForm, PowerPlant } from '../../types/masterData';

const emptyForm: BalanceOfPlantForm = { plantName: '', plantCode: '', bopName: '', bopCode: '' };

export default function BalanceOfPlantPage() {
  const { accounts } = useMsal();
  const user = accounts[0];
  const [rows, setRows] = useState<BalanceOfPlant[]>([]);
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BalanceOfPlant | null>(null);
  const [form, setForm] = useState<BalanceOfPlantForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BalanceOfPlant | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { powerPlantApi.getAll().then((r) => setPlants(r.data)).catch(() => setError('Failed to load plants.')); }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try { const r = await balanceOfPlantApi.getAll(); setRows(r.data); }
    catch { setError('Failed to load BOP records.'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handlePlantChange = (plantCode: string) => {
    const plant = plants.find((p) => p.plantCode === plantCode);
    setForm((prev) => ({ ...prev, plantCode, plantName: plant?.plantName ?? '' }));
  };

  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (row: BalanceOfPlant) => { setEditTarget(row); setForm({ plantName: row.plantName, plantCode: row.plantCode, bopName: row.bopName, bopCode: row.bopCode }); setDialogOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, createdByName: user?.name ?? '', createdByEmail: user?.username ?? '' };
      editTarget ? await balanceOfPlantApi.update(editTarget.id, payload) : await balanceOfPlantApi.create(payload);
      setDialogOpen(false); fetchAll();
    } catch { setError('Failed to save.'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await balanceOfPlantApi.delete(deleteTarget.id); setDeleteTarget(null); fetchAll(); }
    catch { setError('Failed to delete.'); } finally { setDeleting(false); }
  };

  const isFormValid = form.plantCode && form.bopName.trim() && form.bopCode.trim();

  return (
    <Box>
      <PageHeader title="Balance of Plant" subtitle="Manage BOP entries for each power plant" breadcrumbs={[{ label: 'Master Data' }, { label: 'Balance of Plant' }]} action={{ label: 'Add BOP', onClick: openCreate, icon: <Add /> }} />
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Plant</TableCell>
                  <TableCell>BOP Name</TableCell>
                  <TableCell>BOP Code</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Created On</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 8 }}><Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}><AccountTree sx={{ fontSize: '2.5rem', color: 'text.disabled' }} /><Typography variant="body2" color="text.secondary">No BOP records found.</Typography></Box></TableCell></TableRow>
                ) : rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{row.plantName}</Typography><Typography variant="caption" color="text.secondary">{row.plantCode}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.bopName}</Typography></TableCell>
                    <TableCell><Chip label={row.bopCode} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 600 }} /></TableCell>
                    <TableCell><Typography variant="body2">{row.createdByName}</Typography><Typography variant="caption" color="text.secondary">{row.createdByEmail}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{new Date(row.createdOn).toLocaleDateString('en-GB')}</Typography></TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(row)} color="primary"><Edit fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" onClick={() => setDeleteTarget(row)} color="error"><Delete fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editTarget ? 'Edit BOP' : 'Add BOP'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: '20px !important' }}>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth required>
                <InputLabel>Power Plant</InputLabel>
                <Select label="Power Plant" value={form.plantCode} onChange={(e) => handlePlantChange(e.target.value)} disabled={!!editTarget}>
                  {plants.map((p) => <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField label="BOP Name" value={form.bopName} onChange={(e) => setForm({ ...form, bopName: e.target.value })} fullWidth required placeholder="e.g. Common Services BOP" />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="BOP Code" value={form.bopCode} onChange={(e) => setForm({ ...form, bopCode: e.target.value.toUpperCase() })} fullWidth required placeholder="e.g. CSB" slotProps={{  htmlInput: {    maxLength: 20, },}} />
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={1.5}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined" disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} variant="contained" disabled={saving || !isFormValid} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
              {saving ? 'Saving...' : editTarget ? 'Update' : 'Add BOP'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
      <ConfirmDialog open={!!deleteTarget} title="Delete BOP" message={`Delete "${deleteTarget?.bopName}"?`} confirmLabel="Delete" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </Box>
  );
}