import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, MenuItem, FormControl,
  InputLabel, Select, Grid, Divider, Chip, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip,
  OutlinedInput, Checkbox, ListItemText,
} from '@mui/material';
import { Save, Search, Edit, Delete, Assignment, History } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { appUsersApi } from '../../api/auth/userManagementApi';
import { shiftLogApi } from '../../api/stationLog/shiftLogApi';
import { getShiftOptions } from '../../utils/shiftConfig';
import type { PowerPlant } from '../../types/masterData';
import type { AppUser } from '../../types/userManagement';
import type { ShiftLog, CreateShiftLogForm, UpdateShiftLogForm } from '../../types/shiftLog';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';

const OFFICER_ROLES = ['shift lead', 'shift engineer', 'operator', 'shift supervisor'];

const emptyForm: CreateShiftLogForm = {
  plantCode: '',
  logDate: new Date().toISOString().split('T')[0],
  shiftCode: '',
  handoverTime: '',
  handoverRemarks: '',
  officerIds: [],
  outgoingOfficerIds: [],
};

const emptyUpdateForm: UpdateShiftLogForm = {
  handoverTime: '',
  handoverRemarks: '',
  officerIds: [],
  outgoingOfficerIds: [],
};

export default function ShiftLogPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('station_logs.shift_logs');
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [officers, setOfficers] = useState<AppUser[]>([]);
  const [loadingPrevOfficers, setLoadingPrevOfficers] = useState(false);

  const [form, setForm] = useState<CreateShiftLogForm>(emptyForm);
  const [updateForm, setUpdateForm] = useState<UpdateShiftLogForm>(emptyUpdateForm);
  const [editTarget, setEditTarget] = useState<ShiftLog | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [filterPlant, setFilterPlant] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<ShiftLog[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ShiftLog | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    powerPlantApi.getAll().then((res) => setPlants(res.data));
    appUsersApi.getAll({ activeOnly: true }).then((res) => setAllUsers(res.data));
  }, []);

  // Auto-select plant when user has only one assigned
  useEffect(() => {
    if (autoPlantCode) {
      setForm((prev) => ({ ...prev, plantCode: autoPlantCode }));
      setFilterPlant(autoPlantCode);
    }
  }, [autoPlantCode]);

  // Filter officers by selected plant and role
  useEffect(() => {
    const plantCode = editTarget ? editTarget.plantCode : form.plantCode;
    if (!plantCode) { setOfficers([]); return; }
    const filtered = allUsers.filter((u) => {
      const roleMatch = OFFICER_ROLES.some((r) => u.roleName.toLowerCase().includes(r));
      const plantMatch = u.plants.length === 0 || u.plants.some((p) => p.plantCode === plantCode);
      return roleMatch && plantMatch;
    });
    setOfficers(filtered);
  }, [form.plantCode, editTarget, allUsers]);

  // Reset shift and officers when plant changes (create mode only)
  useEffect(() => {
    if (!editTarget) {
      setForm((prev) => ({ ...prev, shiftCode: '', officerIds: [], outgoingOfficerIds: [] }));
    }
  }, [form.plantCode, editTarget]);

  // Auto-populate outgoing officers from previous shift when shift is selected
  useEffect(() => {
    if (!form.plantCode || !form.logDate || !form.shiftCode || editTarget) return;

    setLoadingPrevOfficers(true);
    shiftLogApi.getPreviousOfficers({
      plantCode: form.plantCode,
      date: form.logDate,
      shiftCode: form.shiftCode,
    }).then((res) => {
      const prevOfficerIds = res.data.map((o) => o.officerId);
      setForm((prev) => ({ ...prev, outgoingOfficerIds: prevOfficerIds }));
    }).catch(() => {
      // Silently fail — user can manually select outgoing officers
    }).finally(() => {
      setLoadingPrevOfficers(false);
    });
  }, [form.plantCode, form.logDate, form.shiftCode, editTarget]);

  const selectedPlant = plants.find((p) =>
    p.plantCode === (editTarget ? editTarget.plantCode : form.plantCode)
  );
  const shiftOptions = getShiftOptions(selectedPlant?.classificationType);

  const activeOfficerIds = editTarget ? updateForm.officerIds : form.officerIds;
  const activeOutgoingIds = editTarget ? updateForm.outgoingOfficerIds : form.outgoingOfficerIds;

  const handleOfficerChange = (ids: string[]) => {
    if (editTarget) setUpdateForm((prev) => ({ ...prev, officerIds: ids }));
    else setForm((prev) => ({ ...prev, officerIds: ids }));
  };

  const handleOutgoingChange = (ids: string[]) => {
    if (editTarget) setUpdateForm((prev) => ({ ...prev, outgoingOfficerIds: ids }));
    else setForm((prev) => ({ ...prev, outgoingOfficerIds: ids }));
  };

  const fetchRecords = useCallback(async () => {
    if (!filterPlant) return;
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const res = await shiftLogApi.getAll({ plantCode: filterPlant, date: filterDate || undefined });
      setRecords(res.data);
    } catch {
      setRecordsError('Failed to load shift logs.');
    } finally {
      setLoadingRecords(false);
    }
  }, [filterPlant, filterDate]);

  const openEdit = (row: ShiftLog) => {
    setEditTarget(row);
    setSaveSuccess(false);
    setSaveError(null);
    setUpdateForm({
      handoverTime: row.handoverTime,
      handoverRemarks: row.handoverRemarks ?? '',
      officerIds: row.officers.map((o) => o.officerId),
      outgoingOfficerIds: row.outgoingOfficers.map((o) => o.officerId),
    });
  };

  const cancelEdit = () => {
    setEditTarget(null);
    setUpdateForm(emptyUpdateForm);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      if (editTarget) {
        await shiftLogApi.update(editTarget.id, updateForm);
        setEditTarget(null);
        setUpdateForm(emptyUpdateForm);
      } else {
        await shiftLogApi.create(form);
        setForm((prev) => ({
          ...prev, shiftCode: '', handoverTime: '', handoverRemarks: '',
          officerIds: [], outgoingOfficerIds: [],
        }));
      }
      setSaveSuccess(true);
      fetchRecords();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(msg ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await shiftLogApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRecords();
    } catch {
      setRecordsError('Failed to delete shift log.');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid = editTarget
    ? updateForm.officerIds.length > 0 && updateForm.handoverTime
    : form.plantCode && form.logDate && form.shiftCode &&
      form.officerIds.length > 0 && form.handoverTime;

  const renderOfficerSelect = (
    label: string,
    selected: string[],
    onChange: (ids: string[]) => void,
    disabled?: boolean,
    loading?: boolean,
  ) => (
    <FormControl fullWidth disabled={disabled || loading}>
      <InputLabel>{loading ? 'Loading...' : label}</InputLabel>
      <Select
        multiple
        value={selected}
        onChange={(e) => onChange(
          typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value
        )}
        input={<OutlinedInput label={loading ? 'Loading...' : label} />}
        renderValue={(sel) =>
          sel.map((id) => officers.find((o) => o.id === id)?.fullName ?? id).join(', ')
        }>
        {officers.map((u) => (
          <MenuItem key={u.id} value={u.id}>
            <Checkbox checked={selected.includes(u.id)} />
            <ListItemText primary={u.fullName} secondary={u.roleName} />
          </MenuItem>
        ))}
      </Select>
      {selected.length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: 'wrap' }} useFlexGap>
          {selected.map((id) => {
            const o = officers.find((u) => u.id === id);
            return o ? (
              <Chip key={id} label={o.fullName} size="small"
                onDelete={() => onChange(selected.filter((i) => i !== id))} />
            ) : null;
          })}
        </Stack>
      )}
    </FormControl>
  );

  return (
    <Box>
      <PageHeader
        title="Shift Logs"
        subtitle="Record shift handovers per plant"
        breadcrumbs={[{ label: 'Station Logs' }, { label: 'Shift Logs' }]}
      />

      <Grid container spacing={3}>
        {/* ── Entry Form ── */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                  <Assignment sx={{ color: '#1565C0' }} />
                  <Typography sx={{ fontWeight: 700 }}>
                    {editTarget
                      ? `Editing: ${editTarget.plantCode} — ${editTarget.logDate?.split('T')[0]} ${editTarget.shiftLabel}`
                      : 'New Shift Handover'}
                  </Typography>
                  {editTarget && (
                    <Chip label="Edit Mode" size="small" color="warning" onDelete={cancelEdit} />
                  )}
                </Stack>
              }
            />
            <Divider />
            <CardContent>
              {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
              {saveSuccess && <Alert severity="success" onClose={() => setSaveSuccess(false)} sx={{ mb: 2 }}>Shift handover saved.</Alert>}

              {/* Shift Identity */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Shift Identity
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required disabled={!!editTarget || plantLocked}>
                      <InputLabel>Power Plant</InputLabel>
                      <Select label="Power Plant"
                        value={editTarget ? editTarget.plantCode : form.plantCode}
                        onChange={(e) => setForm((prev) => ({ ...prev, plantCode: e.target.value }))}>
                        {availablePlants.map((p: PowerPlant) => (
                          <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Log Date" type="date" fullWidth required
                      value={editTarget ? editTarget.logDate?.split('T')[0] : form.logDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, logDate: e.target.value }))}
                      disabled={!!editTarget}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required disabled={!!editTarget || !form.plantCode}>
                      <InputLabel>Shift</InputLabel>
                      <Select label="Shift"
                        value={editTarget ? editTarget.shiftCode : form.shiftCode}
                        onChange={(e) => setForm((prev) => ({ ...prev, shiftCode: e.target.value }))}>
                        <MenuItem value="" disabled><em>Select shift…</em></MenuItem>
                        {shiftOptions.map((s) => (
                          <MenuItem key={s.code} value={s.code}>
                            <Stack>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>Shift {s.code}</Typography>
                              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Handover Time" type="time" fullWidth required
                      value={editTarget ? updateForm.handoverTime : form.handoverTime}
                      onChange={(e) => editTarget
                        ? setUpdateForm((prev) => ({ ...prev, handoverTime: e.target.value }))
                        : setForm((prev) => ({ ...prev, handoverTime: e.target.value }))}
                      slotProps={{ inputLabel: { shrink: true } }}
                      helperText="Time the handover took place"
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Officers */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary"
                  sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  Handover Officers
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#1B5E20' }}>
                      Coming On Duty
                    </Typography>
                    {renderOfficerSelect(
                      'Incoming Officers',
                      activeOfficerIds,
                      handleOfficerChange,
                      !editTarget && (!form.plantCode || officers.length === 0),
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#B71C1C' }}>
                      Going Off Duty
                    </Typography>
                    {renderOfficerSelect(
                      'Outgoing Officers',
                      activeOutgoingIds,
                      handleOutgoingChange,
                      !editTarget && (!form.plantCode || officers.length === 0),
                      loadingPrevOfficers,
                    )}
                    {!editTarget && form.shiftCode && !loadingPrevOfficers && activeOutgoingIds.length > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        Auto-populated from previous shift — adjust if needed.
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </Paper>

              {/* Remarks */}
              <TextField
                label="Handover Remarks"
                value={editTarget ? updateForm.handoverRemarks : form.handoverRemarks}
                onChange={(e) => editTarget
                  ? setUpdateForm((prev) => ({ ...prev, handoverRemarks: e.target.value }))
                  : setForm((prev) => ({ ...prev, handoverRemarks: e.target.value }))}
                fullWidth multiline rows={2}
                placeholder="Any brief remarks about the handover…"
              />

              <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                {editTarget && <Button variant="outlined" onClick={cancelEdit} disabled={saving}>Cancel</Button>}
                {(editTarget ? canEdit : canCreate) && (
                  <Button variant="contained" onClick={handleSave}
                    disabled={saving || !isFormValid}
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                    sx={{ minWidth: 160 }}>
                    {saving ? 'Saving...' : editTarget ? 'Update Handover' : 'Save Handover'}
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Records Panel ── */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                  <History sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
                  <Typography sx={{ fontWeight: 700 }}>Logged Handovers</Typography>
                </Stack>
              }
            />
            <Divider />
            <CardContent>
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Plant</InputLabel>
                  <Select label="Plant" value={filterPlant}
                    onChange={(e) => setFilterPlant(e.target.value)}
                    disabled={plantLocked}>
                    <MenuItem value="">Select plant…</MenuItem>
                    {availablePlants.map((p: PowerPlant) => (
                      <MenuItem key={p.id} value={p.plantCode}>{p.plantName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Stack direction="row" spacing={1}>
                  <TextField label="Date" type="date" size="small" value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)} sx={{ flex: 1 }}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <Button variant="outlined" size="small"
                    startIcon={loadingRecords ? <CircularProgress size={14} /> : <Search />}
                    onClick={fetchRecords} disabled={!filterPlant || loadingRecords}>
                    {loadingRecords ? 'Loading...' : 'Load'}
                  </Button>
                </Stack>
              </Stack>

              {recordsError && (
                <Alert severity="error" onClose={() => setRecordsError(null)} sx={{ mb: 1.5 }}>
                  {recordsError}
                </Alert>
              )}

              {records.length === 0 && !loadingRecords ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Assignment sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {filterPlant ? 'No handovers found.' : 'Select a plant and click Load.'}
                  </Typography>
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: 560 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Shift</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Incoming</TableCell>
                        <TableCell>Outgoing</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {records.map((row) => (
                        <TableRow key={row.id} selected={editTarget?.id === row.id} hover>
                          <TableCell>
                            <Chip label={`${row.shiftCode} — ${row.shiftLabel}`}
                              size="small" variant="outlined"
                              sx={{ fontWeight: 600, fontSize: 10 }} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                              {row.handoverTime}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.2}>
                              {row.officers.map((o) => (
                                <Typography key={o.officerId} variant="caption"
                                  sx={{ color: '#1B5E20', fontWeight: 500 }}>
                                  {o.officerName}
                                </Typography>
                              ))}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.2}>
                              {row.outgoingOfficers.map((o) => (
                                <Typography key={o.officerId} variant="caption"
                                  sx={{ color: '#B71C1C', fontWeight: 500 }}>
                                  {o.officerName}
                                </Typography>
                              ))}
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            {canEdit && (
                              <Tooltip title="Edit">
                                <IconButton size="small" color="primary" onClick={() => openEdit(row)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canDelete && (
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
                                  <Delete fontSize="small" />
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
        </Grid>
      </Grid>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Shift Handover"
        message={`Delete the shift handover for ${deleteTarget?.plantCode} — ${deleteTarget?.shiftLabel} on ${deleteTarget?.logDate?.split('T')[0]}?`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}