import {
  Box, Card, CardContent, CardHeader, TextField, Button, CircularProgress,
  Alert, Typography, Grid, Divider, Chip, Stack, MenuItem,
  FormControl, InputLabel, Select, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Tooltip, Paper,
} from '@mui/material';
import { Add, Edit, Delete, Save, Close, Security } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { permissionsApi } from '../../api/auth/userManagementApi';
import type { Permission } from '../../types/userManagement';
import { useSectionPermissions } from '../../hooks/usePermission';

const GROUPS = [
  'Master Data', 'Hourly Readings', 'Daily Readings',
  'Station Logs', 'Shift Logs', 'Chemical Lab',
  'Reports', 'User Management',
];

const ACTIONS = ['view', 'create', 'edit', 'delete'];

const ACTION_COLORS: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  view: 'info', create: 'default', edit: 'warning', delete: 'error',
};

const emptyForm = { code: '', name: '', group: '', section: '', action: '', description: '' };

export default function PermissionsPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('permissions');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Permission | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [filterGroup, setFilterGroup] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Permission | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await permissionsApi.getAll();
      setPermissions(res.data);
    } catch {
      setError('Failed to load permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  useEffect(() => {
    if (!editTarget && form.section && form.action) {
      const groupSlug = form.group.toLowerCase().replace(/\s+/g, '_');
      const sectionSlug = form.section.toLowerCase().replace(/\s+/g, '_');
      const code = `${groupSlug}.${sectionSlug}.${form.action}`;
      setForm((p) => ({ ...p, code }));
    }
  }, [form.group, form.section, form.action, editTarget]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setSaveError(null);
    setShowForm(true);
  };

  const openEdit = (perm: Permission) => {
    setEditTarget(perm);
    setForm({
      code: perm.code, name: perm.name, group: perm.group,
      section: '', action: '', description: perm.description ?? '',
    });
    setSaveError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name || !form.group) return;
    setSaving(true); setSaveError(null);
    try {
      if (editTarget) {
        await permissionsApi.update(editTarget.id, {
          name: form.name, group: form.group, description: form.description,
        });
      } else {
        await permissionsApi.create({
          code: form.code, name: form.name, group: form.group,
          description: form.description,
        });
      }
      setShowForm(false);
      fetchPermissions();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(msg ?? 'Failed to save permission.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await permissionsApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchPermissions();
    } catch {
      setError('Failed to delete permission.');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = permissions.filter((p) => {
    const matchGroup = !filterGroup || p.group === filterGroup;
    const matchSearch = !filterSearch ||
      p.code.toLowerCase().includes(filterSearch.toLowerCase()) ||
      p.name.toLowerCase().includes(filterSearch.toLowerCase());
    return matchGroup && matchSearch;
  });

  const grouped = filtered.reduce((acc, p) => {
    if (!acc[p.group]) acc[p.group] = [];
    acc[p.group].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Box>
      <PageHeader
        title="Permissions"
        subtitle="All system permissions — add new ones or edit existing"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Permissions' }]}
      />

      <Grid container spacing={3}>
        {/* ── Left: Form ── */}
        {showForm && (
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card>
              <CardHeader
                title={
                  <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                    <Security sx={{ color: '#1565C0' }} />
                    <Typography sx={{ fontWeight: 700 }}>
                      {editTarget ? 'Edit Permission' : 'New Permission'}
                    </Typography>
                  </Stack>
                }
                action={<IconButton size="small" onClick={() => setShowForm(false)}><Close /></IconButton>}
              />
              <Divider />
              <CardContent>
                {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
                <Stack spacing={2}>
                  <FormControl fullWidth required>
                    <InputLabel>Group</InputLabel>
                    <Select label="Group" value={form.group}
                      onChange={(e) => setForm((p) => ({ ...p, group: e.target.value }))}>
                      {GROUPS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                    </Select>
                  </FormControl>

                  {!editTarget && (
                    <>
                      <TextField label="Section" fullWidth required
                        value={form.section}
                        onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))}
                        helperText="e.g. energy_hydro, plant_trips, users"
                      />
                      <FormControl fullWidth required>
                        <InputLabel>Action</InputLabel>
                        <Select label="Action" value={form.action}
                          onChange={(e) => setForm((p) => ({ ...p, action: e.target.value }))}>
                          {ACTIONS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'action.hover' }}>
                        <Typography variant="caption" color="text.secondary">Generated Code</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {form.code || '—'}
                        </Typography>
                      </Paper>
                    </>
                  )}

                  {editTarget && (
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'action.hover' }}>
                      <Typography variant="caption" color="text.secondary">Code (read-only)</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {editTarget.code}
                      </Typography>
                    </Paper>
                  )}

                  <TextField label="Display Name" fullWidth required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    helperText="e.g. Create Hydro Energy Generation"
                  />

                  <TextField label="Description (optional)" fullWidth multiline rows={2}
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />

                  <Stack direction="row" spacing={1.5}>
                    <Button variant="outlined" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
                    {(editTarget ? canEdit : canCreate) && (
                      <Button variant="contained"
                        startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}
                        onClick={handleSave}
                        disabled={saving || !form.code || !form.name || !form.group}>
                        {saving ? 'Saving...' : editTarget ? 'Update' : 'Create'}
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* ── Right: Table ── */}
        <Grid size={{ xs: 12, lg: showForm ? 8 : 12 }}>
          <Card>
            <CardHeader
              title={<Typography sx={{ fontWeight: 700 }}>All Permissions ({permissions.length})</Typography>}
              action={
                canCreate && (
                  <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
                    Add Permission
                  </Button>
                )
              }
            />
            <Divider />
            <CardContent>
              {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField size="small" placeholder="Search code or name…" sx={{ flex: 1 }}
                  value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Group</InputLabel>
                  <Select label="Group" value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
                    <MenuItem value="">All Groups</MenuItem>
                    {GROUPS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>

              {loading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
              ) : (
                Object.entries(grouped).map(([group, perms]) => (
                  <Box key={group} sx={{ mb: 3 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', mb: 1, display: 'block' }}>
                      {group} ({perms.length})
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: 'action.hover' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {perms.map((perm) => {
                            const action = perm.code.split('.').pop() ?? '';
                            return (
                              <TableRow key={perm.id} hover>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                                    {perm.code}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">{perm.name}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip label={action} size="small"
                                    color={ACTION_COLORS[action] ?? 'default'}
                                    variant="outlined" sx={{ fontWeight: 700, fontSize: 11 }} />
                                </TableCell>
                                <TableCell align="right">
                                  {canEdit && (
                                    <Tooltip title="Edit">
                                      <IconButton size="small" color="primary" onClick={() => openEdit(perm)}>
                                        <Edit fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  {canDelete && (
                                    <Tooltip title="Delete">
                                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(perm)}>
                                        <Delete fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Permission"
        message={`Delete permission "${deleteTarget?.code}"? This will also remove it from all roles.`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}