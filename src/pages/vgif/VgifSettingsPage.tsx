import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl,
  FormControlLabel, Grid, IconButton, InputLabel, MenuItem, Select, Stack, Switch, TextField, Typography,
} from '@mui/material';
import { Add, Delete, Edit, Save } from '@mui/icons-material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import { usePermission } from '../../hooks/usePermission';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import type { PowerPlant } from '../../types/masterData';
import { vgifApi, vgifReportsApi, apiError, fmt, type SaveVgifPoint, type VgifPoint, type VgifRate, type VgifSettings } from '../../api/vgif/vgifApi';

export default function VgifSettingsPage() {
  const canCreate = usePermission('vgif.settings.create');
  const canEdit = usePermission('vgif.settings.edit');
  const canDelete = usePermission('vgif.settings.delete');
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [points, setPoints] = useState<VgifPoint[]>([]);
  const [settings, setSettings] = useState<VgifSettings | null>(null);
  const [form, setForm] = useState({ responsiblePlantCode: '', autoFillHeatingValue: false, heatingValuePointId: '' as string, ag12NormalStates: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<VgifPoint | 'new' | null>(null);
  const [deleting, setDeleting] = useState<VgifPoint | null>(null);

  const loadPoints = () => vgifApi.getPoints(true).then((r) => setPoints(r.data)).catch(() => setPoints([]));
  useEffect(() => {
    powerPlantApi.getAll().then((r) => setPlants(r.data)).catch(() => setPlants([]));
    loadPoints();
    vgifApi.getSettings().then((r) => {
      setSettings(r.data);
      setForm({
        responsiblePlantCode: r.data.responsiblePlantCode, autoFillHeatingValue: r.data.autoFillHeatingValue,
        heatingValuePointId: r.data.heatingValuePointId ?? '', ag12NormalStates: r.data.ag12NormalStates,
      });
    }).catch((e) => setMsg({ ok: false, text: apiError(e, 'Could not load the settings.') }));
  }, []);

  const saveSettings = async () => {
    setMsg(null);
    try {
      const r = await vgifApi.saveSettings({ ...form, heatingValuePointId: form.heatingValuePointId || null });
      setSettings(r.data);
      setMsg({ ok: true, text: 'Settings saved.' });
    } catch (e) { setMsg({ ok: false, text: apiError(e, 'Could not save the settings.') }); }
  };

  const columns: GridColDef<VgifPoint>[] = [
    { field: 'displayOrder', headerName: '#', width: 50, type: 'number' },
    { field: 'code', headerName: 'Code', width: 100 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 220 },
    { field: 'linkedPlantCode', headerName: 'Linked plant', width: 120 },
    { field: 'hasAg15', headerName: 'AG15', width: 80, type: 'boolean' },
    { field: 'hasAg12', headerName: 'AG12', width: 80, type: 'boolean' },
    { field: 'isActive', headerName: 'Status', width: 100, renderCell: ({ value }) => <Chip size="small" color={value ? 'success' : 'default'} label={value ? 'Active' : 'Inactive'} /> },
    ...(canEdit || canDelete ? [{
      field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: ({ row }: { row: VgifPoint }) => (
        <>
          {canEdit && <IconButton size="small" onClick={() => setEditing(row)}><Edit fontSize="small" /></IconButton>}
          {canDelete && <IconButton size="small" color="error" onClick={() => setDeleting(row)}><Delete fontSize="small" /></IconButton>}
        </>
      ),
    } as GridColDef<VgifPoint>] : []),
  ];

  return (
    <Box>
      <PageHeader title="VGIF Settings" subtitle="Who records the VGIF master readings, the metering points, and how the readings are used"
        breadcrumbs={[{ label: 'Daily Readings' }, { label: 'VGIF Master Readings' }, { label: 'Settings' }]} />
      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 700 }}>General</Typography>
              <Stack spacing={2}>
                <FormControl size="small" fullWidth disabled={!canEdit}>
                  <InputLabel>Responsible plant</InputLabel>
                  <Select label="Responsible plant" value={plants.some((p) => p.plantCode === form.responsiblePlantCode) ? form.responsiblePlantCode : ''}
                    onChange={(e) => setForm((f) => ({ ...f, responsiblePlantCode: String(e.target.value) }))}>
                    {plants.map((p) => <MenuItem key={p.plantCode} value={p.plantCode}>{p.plantCode} · {p.plantName}</MenuItem>)}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ mt: '-8px !important' }}>
                  Users of this plant record the readings for every metering point. Users without a plant restriction can record too.
                </Typography>

                <FormControlLabel disabled={!canEdit}
                  control={<Switch checked={form.autoFillHeatingValue} onChange={(e) => setForm((f) => ({ ...f, autoFillHeatingValue: e.target.checked }))} />}
                  label="Suggest the heating value on Fuel Readings from VGIF" />
                {form.autoFillHeatingValue && (
                  <FormControl size="small" fullWidth disabled={!canEdit}>
                    <InputLabel>Take the heating value from</InputLabel>
                    <Select label="Take the heating value from" value={points.some((p) => p.id === form.heatingValuePointId) ? form.heatingValuePointId : ''}
                      onChange={(e) => setForm((f) => ({ ...f, heatingValuePointId: String(e.target.value) }))}>
                      {points.filter((p) => p.hasAg15 && p.isActive).map((p) => <MenuItem key={p.id} value={p.id}>{p.code} · {p.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                )}

                <TextField size="small" fullWidth disabled={!canEdit} label="AG12 states that are normal" value={form.ag12NormalStates}
                  onChange={(e) => setForm((f) => ({ ...f, ag12NormalStates: e.target.value }))}
                  helperText="Field=state pairs separated by semicolons, e.g. Hydrogen=1 (hydrogen is not measured, so its state is always 1)." />

                {canEdit && (
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      {settings?.modifiedOn ? `Last changed ${dayjs(settings.modifiedOn).format('DD MMM YYYY HH:mm')} by ${settings.modifiedByName}` : ''}
                    </Typography>
                    <Button variant="contained" startIcon={<Save />} onClick={saveSettings}>Save</Button>
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Metering points</Typography>
                {canCreate && <Button size="small" startIcon={<Add />} onClick={() => setEditing('new')}>Add point</Button>}
              </Stack>
              <Box sx={{ height: 420 }}>
                <DataGrid rows={points} columns={columns} density="compact" disableRowSelectionOnClick hideFooter
                  initialState={{ sorting: { sortModel: [{ field: 'displayOrder', sort: 'asc' }] } }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={12}>
          <RatesCard canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} onMessage={setMsg} />
        </Grid>
      </Grid>

      {editing && (
        <PointDialog point={editing === 'new' ? null : editing} plants={plants} nextOrder={points.length}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadPoints(); setMsg({ ok: true, text: 'Metering point saved.' }); }} />
      )}
      {deleting && (
        <Dialog open onClose={() => setDeleting(null)}>
          <DialogTitle>Delete {deleting.code}?</DialogTitle>
          <DialogContent>
            <Typography>A point that already has readings cannot be deleted. Mark it inactive instead.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
            <Button color="error" variant="contained" onClick={async () => {
              try { await vgifApi.deletePoint(deleting.id); loadPoints(); setMsg({ ok: true, text: `${deleting.code} deleted.` }); }
              catch (e) { setMsg({ ok: false, text: apiError(e, 'Could not delete the point.') }); }
              setDeleting(null);
            }}>Delete</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

function PointDialog({ point, plants, nextOrder, onClose, onSaved }: {
  point: VgifPoint | null; plants: PowerPlant[]; nextOrder: number; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState<SaveVgifPoint>(() => point
    ? { code: point.code, name: point.name, linkedPlantCode: point.linkedPlantCode ?? '', hasAg15: point.hasAg15, hasAg12: point.hasAg12, displayOrder: point.displayOrder, isActive: point.isActive }
    : { code: '', name: '', linkedPlantCode: '', hasAg15: true, hasAg12: true, displayOrder: nextOrder, isActive: true });
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof SaveVgifPoint>(k: K, v: SaveVgifPoint[K]) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    if (!f.code.trim() || !f.name.trim()) { setError('Code and name are required.'); return; }
    const body = { ...f, code: f.code.trim().toUpperCase(), name: f.name.trim(), linkedPlantCode: f.linkedPlantCode || null };
    try { if (point) await vgifApi.updatePoint(point.id, body); else await vgifApi.addPoint(body); onSaved(); }
    catch (e) { setError(apiError(e, 'Could not save the point.')); }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{point ? `Edit ${point.code}` : 'Add metering point'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={4}><TextField size="small" fullWidth label="Code" value={f.code} onChange={(e) => set('code', e.target.value)} /></Grid>
          <Grid size={8}><TextField size="small" fullWidth label="Name" value={f.name} onChange={(e) => set('name', e.target.value)} /></Grid>
          <Grid size={8}>
            <FormControl size="small" fullWidth>
              <InputLabel>Linked plant (optional)</InputLabel>
              <Select label="Linked plant (optional)" value={f.linkedPlantCode ?? ''} onChange={(e) => set('linkedPlantCode', String(e.target.value))}>
                <MenuItem value="">None (not a VRA plant)</MenuItem>
                {plants.map((p) => <MenuItem key={p.plantCode} value={p.plantCode}>{p.plantCode} · {p.plantName}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={4}><TextField size="small" fullWidth type="number" label="Order" value={f.displayOrder} onChange={(e) => set('displayOrder', Number(e.target.value))} /></Grid>
          <Grid size={12}>
            <FormControlLabel control={<Switch checked={f.hasAg15} onChange={(e) => set('hasAg15', e.target.checked)} />} label="Has AG15 (daily)" />
            <FormControlLabel control={<Switch checked={f.hasAg12} onChange={(e) => set('hasAg12', e.target.checked)} />} label="Has AG12 (composition)" />
            <FormControlLabel control={<Switch checked={f.isActive} onChange={(e) => set('isActive', e.target.checked)} />} label="Active" />
          </Grid>
        </Grid>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Gas price and tariff, each applying from a date until the next one (used by the cost of gas report). */
function RatesCard({ canCreate, canEdit, canDelete, onMessage }: {
  canCreate: boolean; canEdit: boolean; canDelete: boolean; onMessage: (m: { ok: boolean; text: string }) => void;
}) {
  const [rates, setRates] = useState<VgifRate[]>([]);
  const [editing, setEditing] = useState<VgifRate | 'new' | null>(null);
  const [form, setForm] = useState({ effectiveFrom: '', gasPrice: '', tariff: '', notes: '' });
  const [error, setError] = useState<string | null>(null);
  const load = () => vgifReportsApi.rates().then((r) => setRates(r.data)).catch(() => setRates([]));
  useEffect(() => { load(); }, []);

  const open = (r: VgifRate | 'new') => {
    setError(null); setEditing(r);
    setForm(r === 'new'
      ? { effectiveFrom: dayjs().startOf('month').format('YYYY-MM-DD'), gasPrice: rates[0] ? String(rates[0].gasPrice) : '', tariff: rates[0] ? String(rates[0].tariff) : '', notes: '' }
      : { effectiveFrom: r.effectiveFrom.slice(0, 10), gasPrice: String(r.gasPrice), tariff: String(r.tariff), notes: r.notes ?? '' });
  };
  const save = async () => {
    const gasPrice = Number(form.gasPrice), tariff = Number(form.tariff);
    if (!form.effectiveFrom || Number.isNaN(gasPrice) || Number.isNaN(tariff) || form.gasPrice === '' || form.tariff === '') { setError('Fill in the date, gas price and tariff.'); return; }
    const body = { effectiveFrom: form.effectiveFrom, gasPrice, tariff, notes: form.notes || null };
    try {
      if (editing === 'new') await vgifReportsApi.addRate(body); else if (editing) await vgifReportsApi.updateRate(editing.id, body);
      setEditing(null); load(); onMessage({ ok: true, text: 'Rates saved.' });
    } catch (e) { setError(apiError(e, 'Could not save the rates.')); }
  };
  const remove = async (r: VgifRate) => {
    try { await vgifReportsApi.deleteRate(r.id); load(); onMessage({ ok: true, text: 'Rates removed.' }); }
    catch (e) { onMessage({ ok: false, text: apiError(e, 'Could not remove the rates.') }); }
  };

  const columns: GridColDef<VgifRate>[] = [
    { field: 'effectiveFrom', headerName: 'From', width: 130, valueFormatter: (x: string) => dayjs(x).format('DD MMM YYYY') },
    { field: 'gasPrice', headerName: 'Gas price ($/MMBtu)', width: 170, type: 'number', valueFormatter: (x: number) => fmt(x, 4) },
    { field: 'tariff', headerName: 'Tariff (US cents/kWh)', width: 180, type: 'number', valueFormatter: (x: number) => fmt(x, 4) },
    { field: 'notes', headerName: 'Notes', flex: 1, minWidth: 200 },
    { field: 'createdByName', headerName: 'Added by', width: 160 },
    ...(canEdit || canDelete ? [{
      field: 'actions', headerName: '', width: 90, sortable: false,
      renderCell: ({ row }: { row: VgifRate }) => (
        <>
          {canEdit && <IconButton size="small" onClick={() => open(row)}><Edit fontSize="small" /></IconButton>}
          {canDelete && <IconButton size="small" color="error" onClick={() => remove(row)}><Delete fontSize="small" /></IconButton>}
        </>
      ),
    } as GridColDef<VgifRate>] : []),
  ];

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Gas price and tariff</Typography>
            <Typography variant="caption" color="text.secondary">Each line applies from its date until the next one. Used by the cost of gas and heat rate report.</Typography>
          </Box>
          {canCreate && <Button size="small" startIcon={<Add />} onClick={() => open('new')}>Add rates</Button>}
        </Stack>
        <Box sx={{ height: 260 }}>
          <DataGrid rows={rates} columns={columns} density="compact" disableRowSelectionOnClick hideFooter />
        </Box>
      </CardContent>
      {editing && (
        <Dialog open onClose={() => setEditing(null)} maxWidth="xs" fullWidth>
          <DialogTitle>{editing === 'new' ? 'Add rates' : 'Edit rates'}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField size="small" type="date" label="Applies from" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField size="small" type="number" label="Gas price ($/MMBtu)" value={form.gasPrice} onChange={(e) => setForm((f) => ({ ...f, gasPrice: e.target.value }))} />
              <TextField size="small" type="number" label="Tariff (US cents/kWh)" value={form.tariff} onChange={(e) => setForm((f) => ({ ...f, tariff: e.target.value }))} />
              <TextField size="small" label="Notes (optional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="contained" onClick={save}>Save</Button>
          </DialogActions>
        </Dialog>
      )}
    </Card>
  );
}
