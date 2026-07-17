import {
  Box, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Alert, Tooltip,
  Typography, MenuItem, FormControl, InputLabel, Select,
  Grid, Divider, Stack,
} from '@mui/material';
import { Edit, Delete, Add, FilterList, AccountTree } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { balanceOfPlantApi } from '../../api/masterData/balanceOfPlantApi';
import { bopSystemApi } from '../../api/masterData/bopSystemApi';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import type { BopSystem, BopSystemForm, PowerPlant, BalanceOfPlant } from '../../types/masterData';
import { useSectionPermissions } from '../../hooks/usePermission';

const emptyForm: BopSystemForm = {
  plantName: '', plantCode: '',
  bopName: '', bopCode: '',
  systemName: '', systemCode: '',
};

export default function BopSystemPage() {
  const { accounts } = useMsal();
  const user = accounts[0];
  const { canCreate, canEdit, canDelete } = useSectionPermissions('master');

  const [rows, setRows] = useState<BopSystem[]>([]);
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [bops, setBops] = useState<BalanceOfPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterPlantCode, setFilterPlantCode] = useState('');
  const [filterBopCode, setFilterBopCode] = useState('');
  const filteredBops = filterPlantCode ? bops.filter((b) => b.plantCode === filterPlantCode) : [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BopSystem | null>(null);
  const [form, setForm] = useState<BopSystemForm>(emptyForm);
  const [formBops, setFormBops] = useState<BalanceOfPlant[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BopSystem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([powerPlantApi.getAll(), balanceOfPlantApi.getAll()])
      .then(([p, b]) => { setPlants(p.data); setBops(b.data); })
      .catch(() => setError('Failed to load reference data.'));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = filterPlantCode && filterBopCode
        ? await bopSystemApi.getByBop(filterPlantCode, filterBopCode)
        : await bopSystemApi.getAll();
      setRows(res.data);
    } catch {
      setError('Failed to load BOP systems.');
    } finally {
      setLoading(false);
    }
  }, [filterPlantCode, filterBopCode]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleFormPlantChange = (plantCode: string) => {
    const plant = plants.find((p) => p.plantCode === plantCode);
    setFormBops(bops.filter((b) => b.plantCode === plantCode));
    setForm((prev) => ({ ...prev, plantCode, plantName: plant?.plantName ?? '', bopCode: '', bopName: '' }));
  };

  const handleFormBopChange = (bopCode: string) => {
    const bop = formBops.find((b) => b.bopCode === bopCode);
    setForm((prev) => ({ ...prev, bopCode, bopName: bop?.bopName ?? '' }));
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setFormBops([]);
    setDialogOpen(true);
  };

  const openEdit = (row: BopSystem) => {
    setEditTarget(row);
    setFormBops(bops.filter((b) => b.plantCode === row.plantCode));
    setForm({
      plantName: row.plantName, plantCode: row.plantCode,
      bopName: row.bopName, bopCode: row.bopCode,
      systemName: row.systemName, systemCode: row.systemCode,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, createdByName: user?.name ?? '', createdByEmail: user?.username ?? '' };
      editTarget
        ? await bopSystemApi.update(editTarget.id, payload)
        : await bopSystemApi.create(payload);
      setDialogOpen(false);
      fetchAll();
    } catch {
      setError('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await bopSystemApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      setError('Failed to delete.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid =
    form.plantCode && form.bopCode &&
    form.systemName.trim() && form.systemCode.trim();

  return (
    <Box>
      <PageHeader
        title="BOP Systems"
        subtitle="Manage systems within each Balance of Plant"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'BOP Systems' }]}
        action={canCreate ? { label: 'Add BOP System', onClick: openCreate, icon: <Add /> } : undefined}
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: '12px !important' }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <FilterList sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }} color="text.secondary">Filter:</Typography>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Power Plant</InputLabel>
              <Select label="Power Plant" value={filterPlantCode}
                onChange={(e) => { setFilterPlantCode(e.target.value); setFilterBopCode(''); }}>
                <MenuItem value="">All Plants</MenuItem>
                {plants.map((p) => (
                  <MenuItem key={p.id} value={p.plantCode}>{p.plantName}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }} disabled={!filterPlantCode}>
              <InputLabel>BOP</InputLabel>
              <Select label="BOP" value={filterBopCode}
                onChange={(e) => setFilterBopCode(e.target.value)}>
                <MenuItem value="">All BOPs</MenuItem>
                {filteredBops.map((b) => (
                  <MenuItem key={b.id} value={b.bopCode}>{b.bopName}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {filterPlantCode && (
              <Button size="small" variant="outlined"
                onClick={() => { setFilterPlantCode(''); setFilterBopCode(''); }}>
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
                  <TableCell>Plant</TableCell>
                  <TableCell>BOP</TableCell>
                  <TableCell>System Name</TableCell>
                  <TableCell>System Code</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Created On</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <AccountTree sx={{ fontSize: '2.5rem', color: 'text.disabled' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          No BOP systems found
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {filterPlantCode ? 'Try clearing the filter.' : 'Click "Add BOP System" to get started.'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.plantName}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.plantCode}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.bopName}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.bopCode}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.systemName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={row.systemCode} size="small" variant="outlined"
                          sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editTarget ? 'Edit BOP System' : 'Add BOP System'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: '20px !important' }}>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Power Plant</InputLabel>
                <Select label="Power Plant" value={form.plantCode}
                  onChange={(e) => handleFormPlantChange(e.target.value)} disabled={!!editTarget}>
                  {plants.map((p) => (
                    <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!form.plantCode}>
                <InputLabel>Balance of Plant</InputLabel>
                <Select label="Balance of Plant" value={form.bopCode}
                  onChange={(e) => handleFormBopChange(e.target.value)} disabled={!!editTarget}>
                  {formBops.length === 0 ? (
                    <MenuItem disabled value=""><em>Select a plant first</em></MenuItem>
                  ) : (
                    formBops.map((b) => (
                      <MenuItem key={b.id} value={b.bopCode}>{b.bopName} ({b.bopCode})</MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField label="System Name" value={form.systemName}
                onChange={(e) => setForm({ ...form, systemName: e.target.value })}
                fullWidth required placeholder="e.g. Fire Fighting System" />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="System Code" value={form.systemCode}
                onChange={(e) => setForm({ ...form, systemCode: e.target.value.toUpperCase() })}
                fullWidth required placeholder="e.g. FFS"
                slotProps={{ htmlInput: { maxLength: 20 } }} />
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={1.5}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined" disabled={saving}>Cancel</Button>
            {(editTarget ? canEdit : canCreate) && (
              <Button onClick={handleSave} variant="contained"
                disabled={saving || !isFormValid}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
                {saving ? 'Saving...' : editTarget ? 'Update' : 'Add System'}
              </Button>
            )}
          </Stack>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete BOP System"
        message={`Delete "${deleteTarget?.systemName}" from ${deleteTarget?.bopName}?`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}