import {
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Button, CircularProgress,
  Alert, Tooltip, Typography, MenuItem, FormControl, InputLabel,
  Select, Grid, Divider, Stack,
} from '@mui/material';
import { Edit, Delete, Add, FilterList, AccountTree } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { balanceOfPlantApi } from '../../api/masterData/balanceOfPlantApi';
import { bopSystemApi } from '../../api/masterData/bopSystemApi';
import { bopSubSystemApi } from '../../api/masterData/bopSubSystemApi';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import type { BopSubSystem, BopSubSystemForm, PowerPlant, BalanceOfPlant, BopSystem } from '../../types/masterData';

const emptyForm: BopSubSystemForm = {
  plantName: '', plantCode: '',
  bopName: '', bopCode: '',
  systemName: '', systemCode: '',
  subSystemName: '', subSystemCode: '',
};

export default function BopSubSystemPage() {
  const { accounts } = useMsal();
  const user = accounts[0];

  const [rows, setRows] = useState<BopSubSystem[]>([]);
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [bops, setBops] = useState<BalanceOfPlant[]>([]);
  const [systems, setSystems] = useState<BopSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterPlantCode, setFilterPlantCode] = useState('');
  const [filterBopCode, setFilterBopCode] = useState('');
  const [filterSystemCode, setFilterSystemCode] = useState('');

  const filteredBops = filterPlantCode ? bops.filter((b) => b.plantCode === filterPlantCode) : [];
  const filteredSystems = filterPlantCode && filterBopCode
    ? systems.filter((s) => s.plantCode === filterPlantCode && s.bopCode === filterBopCode)
    : [];

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BopSubSystem | null>(null);
  const [form, setForm] = useState<BopSubSystemForm>(emptyForm);
  const [formBops, setFormBops] = useState<BalanceOfPlant[]>([]);
  const [formSystems, setFormSystems] = useState<BopSystem[]>([]);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<BopSubSystem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([powerPlantApi.getAll(), balanceOfPlantApi.getAll(), bopSystemApi.getAll()])
      .then(([p, b, s]) => { setPlants(p.data); setBops(b.data); setSystems(s.data); })
      .catch(() => setError('Failed to load reference data.'));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = filterPlantCode && filterBopCode && filterSystemCode
        ? await bopSubSystemApi.getBySystem(filterPlantCode, filterBopCode, filterSystemCode)
        : await bopSubSystemApi.getAll();
      setRows(res.data);
    } catch {
      setError('Failed to load BOP sub-systems.');
    } finally {
      setLoading(false);
    }
  }, [filterPlantCode, filterBopCode, filterSystemCode]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Form cascade handlers
  const handleFormPlantChange = (plantCode: string) => {
    const plant = plants.find((p) => p.plantCode === plantCode);
    setFormBops(bops.filter((b) => b.plantCode === plantCode));
    setFormSystems([]);
    setForm((prev) => ({ ...prev, plantCode, plantName: plant?.plantName ?? '', bopCode: '', bopName: '', systemCode: '', systemName: '' }));
  };

  const handleFormBopChange = (bopCode: string) => {
    const bop = formBops.find((b) => b.bopCode === bopCode);
    setFormSystems(systems.filter((s) => s.plantCode === form.plantCode && s.bopCode === bopCode));
    setForm((prev) => ({ ...prev, bopCode, bopName: bop?.bopName ?? '', systemCode: '', systemName: '' }));
  };

  const handleFormSystemChange = (systemCode: string) => {
    const sys = formSystems.find((s) => s.systemCode === systemCode);
    setForm((prev) => ({ ...prev, systemCode, systemName: sys?.systemName ?? '' }));
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setFormBops([]);
    setFormSystems([]);
    setDialogOpen(true);
  };

  const openEdit = (row: BopSubSystem) => {
    setEditTarget(row);
    setFormBops(bops.filter((b) => b.plantCode === row.plantCode));
    setFormSystems(systems.filter((s) => s.plantCode === row.plantCode && s.bopCode === row.bopCode));
    setForm({
      plantName: row.plantName, plantCode: row.plantCode,
      bopName: row.bopName, bopCode: row.bopCode,
      systemName: row.systemName, systemCode: row.systemCode,
      subSystemName: row.subSystemName, subSystemCode: row.subSystemCode,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, createdByName: user?.name ?? '', createdByEmail: user?.username ?? '' };
      editTarget
        ? await bopSubSystemApi.update(editTarget.id, payload)
        : await bopSubSystemApi.create(payload);
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
      await bopSubSystemApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      setError('Failed to delete.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid =
    form.plantCode && form.bopCode && form.systemCode &&
    form.subSystemName.trim() && form.subSystemCode.trim();

  return (
    <Box>
      <PageHeader
        title="BOP Sub-Systems"
        subtitle="Manage sub-systems within each BOP system"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'BOP Sub-Systems' }]}
        action={{ label: 'Add BOP Sub-System', onClick: openCreate, icon: <Add /> }}
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filter Bar */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: '12px !important' }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' , flexWrap :'wrap' }} >
            <FilterList sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }} color="text.secondary">Filter:</Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Plant</InputLabel>
              <Select
                label="Plant"
                value={filterPlantCode}
                onChange={(e) => { setFilterPlantCode(e.target.value); setFilterBopCode(''); setFilterSystemCode(''); }}
              >
                <MenuItem value="">All Plants</MenuItem>
                {plants.map((p) => <MenuItem key={p.id} value={p.plantCode}>{p.plantName}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }} disabled={!filterPlantCode}>
              <InputLabel>BOP</InputLabel>
              <Select
                label="BOP"
                value={filterBopCode}
                onChange={(e) => { setFilterBopCode(e.target.value); setFilterSystemCode(''); }}
              >
                <MenuItem value="">All BOPs</MenuItem>
                {filteredBops.map((b) => <MenuItem key={b.id} value={b.bopCode}>{b.bopName}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }} disabled={!filterBopCode}>
              <InputLabel>System</InputLabel>
              <Select
                label="System"
                value={filterSystemCode}
                onChange={(e) => setFilterSystemCode(e.target.value)}
              >
                <MenuItem value="">All Systems</MenuItem>
                {filteredSystems.map((s) => <MenuItem key={s.id} value={s.systemCode}>{s.systemName}</MenuItem>)}
              </Select>
            </FormControl>
            {filterPlantCode && (
              <Button size="small" variant="outlined" onClick={() => { setFilterPlantCode(''); setFilterBopCode(''); setFilterSystemCode(''); }}>
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
                  <TableCell>System</TableCell>
                  <TableCell>Sub-System Name</TableCell>
                  <TableCell>Sub-System Code</TableCell>
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
                        <Typography variant="body2" color="text.secondary">No BOP sub-systems found.</Typography>
                        <Typography variant="caption" color="text.disabled">
                          {filterPlantCode ? 'Try clearing the filter.' : 'Click "Add BOP Sub-System" to get started.'}
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
                        <Typography variant="body2">{row.bopName}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.bopCode}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{row.systemName}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.systemCode}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.subSystemName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={row.subSystemCode} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{new Date(row.createdOn).toLocaleDateString('en-GB')}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(row)} color="primary"><Edit fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => setDeleteTarget(row)} color="error"><Delete fontSize="small" /></IconButton>
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editTarget ? 'Edit BOP Sub-System' : 'Add BOP Sub-System'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: '20px !important' }}>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Power Plant</InputLabel>
                <Select label="Power Plant" value={form.plantCode} onChange={(e) => handleFormPlantChange(e.target.value)} disabled={!!editTarget}>
                  {plants.map((p) => <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!form.plantCode}>
                <InputLabel>Balance of Plant</InputLabel>
                <Select label="Balance of Plant" value={form.bopCode} onChange={(e) => handleFormBopChange(e.target.value)} disabled={!!editTarget}>
                  {formBops.length === 0
                    ? <MenuItem disabled value=""><em>Select a plant first</em></MenuItem>
                    : formBops.map((b) => <MenuItem key={b.id} value={b.bopCode}>{b.bopName} ({b.bopCode})</MenuItem>)
                  }
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth required disabled={!form.bopCode}>
                <InputLabel>BOP System</InputLabel>
                <Select label="BOP System" value={form.systemCode} onChange={(e) => handleFormSystemChange(e.target.value)} disabled={!!editTarget}>
                  {formSystems.length === 0
                    ? <MenuItem disabled value=""><em>Select a BOP first</em></MenuItem>
                    : formSystems.map((s) => <MenuItem key={s.id} value={s.systemCode}>{s.systemName} ({s.systemCode})</MenuItem>)
                  }
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                label="Sub-System Name"
                value={form.subSystemName}
                onChange={(e) => setForm({ ...form, subSystemName: e.target.value })}
                fullWidth required
                placeholder="e.g. Sprinkler Network A"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Sub-System Code"
                value={form.subSystemCode}
                onChange={(e) => setForm({ ...form, subSystemCode: e.target.value.toUpperCase() })}
                fullWidth required
                placeholder="e.g. SNA"
                slotProps={{  htmlInput: {    maxLength: 20,  }, }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={1.5}>
            <Button onClick={() => setDialogOpen(false)} variant="outlined" disabled={saving}>Cancel</Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={saving || !isFormValid}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {saving ? 'Saving...' : editTarget ? 'Update' : 'Add Sub-System'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete BOP Sub-System"
        message={`Delete "${deleteTarget?.subSystemName}" from ${deleteTarget?.systemName}?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}