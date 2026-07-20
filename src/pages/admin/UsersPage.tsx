import {
  Box, Card, CardContent, CardHeader, TextField, Button, CircularProgress,
  Alert, Typography, Grid, Divider, Chip, Stack, MenuItem,
  FormControl, InputLabel, Select, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Tooltip,
  Switch, FormControlLabel, OutlinedInput, Checkbox, ListItemText,
} from '@mui/material';
import { Add, Edit, Delete, Save, Close, People, Search } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { appUsersApi, rolesApi } from '../../api/auth/userManagementApi';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import type { AppUser, Role } from '../../types/userManagement';
import type { PowerPlant } from '../../types/masterData';
import { useSectionPermissions } from '../../hooks/usePermission';

const emptyForm = {
  fullName: '', email: '', employeeId: '', designation: '',
  phoneNumber: '', roleId: '', isActive: true, plantCodes: [] as string[],
};

export default function UsersPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('users');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [filterSearch, setFilterSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await appUsersApi.getAll();
      setUsers(res.data);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    rolesApi.getAll().then((res) => setRoles(res.data));
    powerPlantApi.getAll().then((res) => setPlants(res.data));
  }, [fetchUsers]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setSaveError(null);
    setShowForm(true);
  };

  const openEdit = (user: AppUser) => {
    setEditTarget(user);
    setForm({
      fullName: user.fullName, email: user.email,
      employeeId: user.employeeId ?? '', designation: user.designation ?? '',
      phoneNumber: user.phoneNumber ?? '', roleId: user.roleId,
      isActive: user.isActive,
      plantCodes: user.plants.map((p) => p.plantCode),
    });
    setSaveError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.fullName || !form.email || !form.roleId) return;
    setSaving(true); setSaveError(null);
    try {
      if (editTarget) {
        await appUsersApi.update(editTarget.id, {
          fullName: form.fullName,
          employeeId: form.employeeId || undefined,
          designation: form.designation || undefined,
          phoneNumber: form.phoneNumber || undefined,
          roleId: form.roleId,
          isActive: form.isActive,
          plantCodes: form.plantCodes,
        });
      } else {
        await appUsersApi.create({
          fullName: form.fullName,
          email: form.email.toLowerCase(),
          employeeId: form.employeeId || undefined,
          designation: form.designation || undefined,
          phoneNumber: form.phoneNumber || undefined,
          roleId: form.roleId,
          plantCodes: form.plantCodes,
        });
      }
      setShowForm(false);
      fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(msg ?? 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await appUsersApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchUsers();
    } catch {
      setError('Failed to delete user.');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = users.filter((u) => {
    const matchSearch = !filterSearch ||
      u.fullName.toLowerCase().includes(filterSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(filterSearch.toLowerCase());
    const matchRole = !filterRole || u.roleId === filterRole;
    return matchSearch && matchRole;
  });

  const selectedRole = roles.find((r) => r.id === form.roleId);
  const isAdminRole = selectedRole?.name === 'System Admin' || selectedRole?.name === 'Operations Manager';

  return (
    <Box>
      <PageHeader
        title="Users"
        subtitle="Manage system users — assign roles and plant access"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Users' }]}
      />

      <Grid container spacing={3}>
        {/* ── Form ── */}
        {showForm && (
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card>
              <CardHeader
                title={
                  <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                    <People sx={{ color: '#1565C0' }} />
                    <Typography sx={{ fontWeight: 700 }}>
                      {editTarget ? 'Edit User' : 'New User'}
                    </Typography>
                  </Stack>
                }
                action={<IconButton size="small" onClick={() => setShowForm(false)}><Close /></IconButton>}
              />
              <Divider />
              <CardContent>
                {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
                <Stack spacing={2}>
                  <Typography variant="caption" color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                    Identity
                  </Typography>
                  <TextField label="Full Name" fullWidth required
                    value={form.fullName}
                    onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  />
                  <TextField label="Email" fullWidth required disabled={!!editTarget}
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    helperText={!editTarget ? 'Must match Azure AD email exactly' : 'Email cannot be changed'}
                  />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="Employee ID" fullWidth
                        value={form.employeeId}
                        onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="Phone Number" fullWidth
                        value={form.phoneNumber}
                        onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                      />
                    </Grid>
                  </Grid>
                  <TextField label="Designation" fullWidth
                    value={form.designation}
                    onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
                    placeholder="e.g. Shift Engineer, Plant Manager"
                  />

                  <Divider />

                  <Typography variant="caption" color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                    Role & Access
                  </Typography>
                  <FormControl fullWidth required>
                    <InputLabel>Role</InputLabel>
                    <Select label="Role" value={form.roleId}
                      onChange={(e) => setForm((p) => ({ ...p, roleId: e.target.value }))}>
                      <MenuItem value="" disabled><em>Select a role…</em></MenuItem>
                      {roles.filter((r) => r.isActive).map((r) => (
                        <MenuItem key={r.id} value={r.id}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Typography>{r.name}</Typography>
                            {r.isSystem && (
                              <Chip label="System" size="small" variant="outlined" sx={{ fontSize: 10 }} />
                            )}
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Plant Access</InputLabel>
                    <Select
                      multiple
                      value={form.plantCodes}
                      onChange={(e) => setForm((p) => ({
                        ...p, plantCodes: typeof e.target.value === 'string'
                          ? e.target.value.split(',') : e.target.value,
                      }))}
                      input={<OutlinedInput label="Plant Access" />}
                      renderValue={(selected) =>
                        selected.map((code) =>
                          plants.find((p) => p.plantCode === code)?.plantName ?? code
                        ).join(', ')
                      }
                    >
                      {plants.map((p) => (
                        <MenuItem key={p.id} value={p.plantCode}>
                          <Checkbox checked={form.plantCodes.includes(p.plantCode)} />
                          <ListItemText
                            primary={p.plantName}
                            secondary={`${p.plantCode} — ${p.classificationType}`}
                          />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {isAdminRole && (
                    <Alert severity="info" sx={{ py: 0.5 }}>
                      Admin roles have access to all plants regardless of plant assignment.
                    </Alert>
                  )}

                  {editTarget && (
                    <FormControlLabel
                      control={
                        <Switch checked={form.isActive}
                          onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
                      }
                      label="Active"
                    />
                  )}

                  <Stack direction="row" spacing={1.5}>
                    <Button variant="outlined" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
                    {(editTarget ? canEdit : canCreate) && (
                      <Button variant="contained"
                        startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}
                        onClick={handleSave}
                        disabled={saving || !form.fullName || !form.email || !form.roleId}>
                        {saving ? 'Saving...' : editTarget ? 'Update User' : 'Create User'}
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* ── Table ── */}
        <Grid size={{ xs: 12, lg: showForm ? 7 : 12 }}>
          <Card>
            <CardHeader
              title={<Typography sx={{ fontWeight: 700 }}>All Users ({users.length})</Typography>}
              action={
                canCreate && (
                  <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
                    Add User
                  </Button>
                )
              }
            />
            <Divider />
            <CardContent>
              {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField size="small" placeholder="Search name or email…"
                  sx={{ flex: 1 }} value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  slotProps={{ input: { startAdornment: <Search sx={{ color: 'text.disabled', mr: 0.5, fontSize: '1.1rem' }} /> } }}
                />
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Role</InputLabel>
                  <Select label="Role" value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}>
                    <MenuItem value="">All Roles</MenuItem>
                    {roles.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>

              {loading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
              ) : filtered.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <People sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {users.length === 0 ? 'No users yet. Add the first user.' : 'No users match your search.'}
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Plants</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filtered.map((user) => (
                        <TableRow key={user.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{user.fullName}</Typography>
                            {user.designation && (
                              <Typography variant="caption" color="text.secondary">{user.designation}</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{user.email}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={user.roleName} size="small" color="primary" variant="outlined"
                              sx={{ fontWeight: 700, fontSize: 11 }} />
                          </TableCell>
                          <TableCell>
                            {user.plants.length === 0 ? (
                              <Typography variant="caption" color="text.secondary">All Plants</Typography>
                            ) : (
                              <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                                {user.plants.map((p) => (
                                  <Chip key={p.plantCode} label={p.plantCode} size="small"
                                    variant="outlined" sx={{ fontSize: 10 }} />
                                ))}
                              </Stack>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={user.isActive ? 'Active' : 'Inactive'}
                              size="small"
                              color={user.isActive ? 'success' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {canEdit && (
                              <Tooltip title="Edit">
                                <IconButton size="small" color="primary" onClick={() => openEdit(user)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canDelete && (
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error" onClick={() => setDeleteTarget(user)}>
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
        title="Delete User"
        message={`Delete user "${deleteTarget?.fullName}"? This cannot be undone.`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}