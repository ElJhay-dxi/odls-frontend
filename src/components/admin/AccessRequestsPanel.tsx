// Users page tabs for access requests: people who signed in with a VRA account and are waiting (Pending),
// or were turned down (Declined). Approve gives a role and plants in one go; decline shows them a "declined" screen.
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, Grid, InputLabel, MenuItem, Select, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { CheckCircle, Block, HowToReg, PersonOff } from '@mui/icons-material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { appUsersApi } from '../../api/auth/userManagementApi';
import { NO_ACCESS_ROLE, type AppUser, type Role, type UserAccessStatus } from '../../types/userManagement';
import type { PowerPlant } from '../../types/masterData';

interface Props {
  status: Exclude<UserAccessStatus, 'Active'>;
  roles: Role[];
  plants: PowerPlant[];
  /** Has Edit Users — can approve / decline. */
  canReview: boolean;
  /** Called after an approve / decline so the page can refresh its counts and lists. */
  onChanged: () => void;
}

interface ApproveForm { fullName: string; roleId: string; plantCodes: string[]; employeeId: string; designation: string; phoneNumber: string }

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;

export default function AccessRequestsPanel({ status, roles, plants, canReview, onChanged }: Props) {
  const [rows, setRows] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [approveTarget, setApproveTarget] = useState<AppUser | null>(null);
  const [form, setForm] = useState<ApproveForm>({ fullName: '', roleId: '', plantCodes: [], employeeId: '', designation: '', phoneNumber: '' });
  const [declineTarget, setDeclineTarget] = useState<AppUser | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const assignable = useMemo(() => roles.filter((r) => r.isActive && r.name !== NO_ACCESS_ROLE), [roles]);
  const plantByCode = useMemo(() => new Map(plants.map((p) => [p.plantCode, p])), [plants]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await appUsersApi.getAll({ status });
      setRows(res.data.sort((a, b) => (b.requestedOn ?? b.createdOn).localeCompare(a.requestedOn ?? a.createdOn)));
    } catch {
      setError('Failed to load access requests.');
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const openApprove = (u: AppUser) => {
    setApproveTarget(u);
    setDialogError(null);
    setForm({
      fullName: u.fullName,
      roleId: '',
      // Pre-fill with the plants they said they work at
      plantCodes: (u.requestedPlantCodes ?? []).filter((c) => plantByCode.has(c)),
      employeeId: u.employeeId ?? '',
      designation: u.designation ?? '',
      phoneNumber: u.phoneNumber ?? '',
    });
  };

  const approve = async () => {
    if (!approveTarget) return;
    if (!form.roleId) { setDialogError('Choose a role.'); return; }
    setBusy(true);
    setDialogError(null);
    try {
      await appUsersApi.approve(approveTarget.id, {
        roleId: form.roleId,
        plantCodes: form.plantCodes,
        fullName: form.fullName.trim() || undefined,
        employeeId: form.employeeId.trim() || undefined,
        designation: form.designation.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
      });
      setApproveTarget(null);
      await load();
      onChanged();
    } catch (err) {
      setDialogError(errMsg(err, 'Could not approve this user.'));
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    if (!declineTarget) return;
    setBusy(true);
    setDialogError(null);
    try {
      await appUsersApi.decline(declineTarget.id, reason.trim() || undefined);
      setDeclineTarget(null);
      await load();
      onChanged();
    } catch (err) {
      setDialogError(errMsg(err, 'Could not decline this request.'));
    } finally {
      setBusy(false);
    }
  };

  const selectedRole = assignable.find((r) => r.id === form.roleId);

  return (
    <Card>
      <CardContent>
        {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {status === 'Pending'
            ? 'People who signed in with their VRA account and are waiting for access. Approve to give them a role and plants; they get in on their next refresh.'
            : 'Requests that were turned down. These people see a "declined" screen; you can still approve them.'}
        </Typography>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
        ) : rows.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            {status === 'Pending' ? <HowToReg sx={{ fontSize: '2.2rem', color: 'text.disabled', mb: 1 }} /> : <PersonOff sx={{ fontSize: '2.2rem', color: 'text.disabled', mb: 1 }} />}
            <Typography variant="body2" color="text.secondary">
              {status === 'Pending' ? 'Nobody is waiting for access.' : 'No declined requests.'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Person</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Details they gave</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Plants they work at</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{status === 'Pending' ? 'Requested' : 'Declined'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u.id} data-record-id={u.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{u.fullName}</Typography>
                      <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                    </TableCell>
                    <TableCell>
                      {[u.designation, u.employeeId && `ID ${u.employeeId}`, u.phoneNumber].filter(Boolean).length === 0 && !u.requestNote ? (
                        <Typography variant="caption" color="text.disabled">Not filled in yet</Typography>
                      ) : (
                        <>
                          <Typography variant="body2">{[u.designation, u.employeeId && `ID ${u.employeeId}`, u.phoneNumber].filter(Boolean).join(' · ')}</Typography>
                          {u.requestNote && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 280 }}>“{u.requestNote}”</Typography>}
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      {(u.requestedPlantCodes ?? []).length === 0 ? (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      ) : (
                        <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                          {u.requestedPlantCodes.map((c) => (
                            <Chip key={c} size="small" variant="outlined" label={c} title={plantByCode.get(c)?.plantName} sx={{ fontSize: 10 }} />
                          ))}
                        </Stack>
                      )}
                    </TableCell>
                    <TableCell>
                      {status === 'Pending' ? (
                        <Typography variant="body2">{dayjs(u.requestedOn ?? u.createdOn).format('DD MMM YYYY, HH:mm')}</Typography>
                      ) : (
                        <>
                          <Typography variant="body2">{u.reviewedOn ? dayjs(u.reviewedOn).format('DD MMM YYYY') : '—'}{u.reviewedByName ? ` by ${u.reviewedByName}` : ''}</Typography>
                          {u.declineReason && <Typography variant="caption" color="text.secondary">{u.declineReason}</Typography>}
                        </>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {canReview ? (
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                          <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => openApprove(u)}>
                            Approve
                          </Button>
                          {status === 'Pending' && (
                            <Button size="small" variant="outlined" color="error" startIcon={<Block />}
                              onClick={() => { setDeclineTarget(u); setReason(''); setDialogError(null); }}>
                              Decline
                            </Button>
                          )}
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">Needs Edit Users</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>

      {/* ── Approve ── */}
      <Dialog open={!!approveTarget} onClose={() => !busy && setApproveTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Give {approveTarget?.fullName} access</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {dialogError && <Alert severity="error" onClose={() => setDialogError(null)} sx={{ mb: 2 }}>{dialogError}</Alert>}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{approveTarget?.email}</Typography>
          <Stack spacing={2}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Role</InputLabel>
              <Select label="Role" value={form.roleId} onChange={(e) => setForm((p) => ({ ...p, roleId: e.target.value }))}>
                {assignable.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
                      {r.description && <Typography variant="caption" color="text.secondary">{r.description}</Typography>}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Autocomplete
              multiple disableCloseOnSelect size="small"
              options={plants.map((p) => p.plantCode)}
              groupBy={(c) => plantByCode.get(c)?.classificationType || 'Other'}
              getOptionLabel={(c) => { const p = plantByCode.get(c); return p ? `${p.plantName} (${p.plantCode})` : c; }}
              value={form.plantCodes}
              onChange={(_, v) => setForm((p) => ({ ...p, plantCodes: v }))}
              renderInput={(params) => (
                <TextField {...params} label="Plants"
                  helperText={form.plantCodes.length === 0
                    ? 'No plants = they can see every plant.'
                    : (approveTarget?.requestedPlantCodes?.length ? 'Pre-filled with the plants they asked for.' : undefined)} />
              )}
            />
            {selectedRole?.name === 'System Admin' && (
              <Alert severity="warning" variant="outlined">System Admin gives full access to everything, including users and roles.</Alert>
            )}
            <Divider textAlign="left"><Typography variant="caption" color="text.secondary">Details (edit if needed)</Typography></Divider>
            <TextField label="Full name" size="small" fullWidth value={form.fullName}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Employee ID" size="small" fullWidth value={form.employeeId}
                  onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Phone" size="small" fullWidth value={form.phoneNumber}
                  onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))} />
              </Grid>
            </Grid>
            <TextField label="Designation" size="small" fullWidth value={form.designation}
              onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))} />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button variant="outlined" onClick={() => setApproveTarget(null)} disabled={busy}>Cancel</Button>
          <Button variant="contained" color="success" onClick={approve} disabled={busy}
            startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <CheckCircle />}>
            {busy ? 'Approving…' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Decline ── */}
      <Dialog open={!!declineTarget} onClose={() => !busy && setDeclineTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Decline {declineTarget?.fullName}?</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {dialogError && <Alert severity="error" onClose={() => setDialogError(null)} sx={{ mb: 2 }}>{dialogError}</Alert>}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            They'll see a "request declined" screen when they sign in. You can still approve them later from the Declined tab.
          </Typography>
          <TextField label="Reason (shown to them)" size="small" fullWidth multiline rows={2} value={reason}
            onChange={(e) => setReason(e.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }}
            placeholder="Optional, e.g. not part of plant operations" />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button variant="outlined" onClick={() => setDeclineTarget(null)} disabled={busy}>Cancel</Button>
          <Button variant="contained" color="error" onClick={decline} disabled={busy}
            startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <Block />}>
            {busy ? 'Declining…' : 'Decline'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
