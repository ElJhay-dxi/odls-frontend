import {
  Box, Card, CardContent, CardHeader, TextField, Button, CircularProgress,
  Alert, Typography, Grid, Divider, Chip, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip,
  Switch, FormControlLabel,
} from '@mui/material';
import { Add, Edit, Delete, Save, Close, AdminPanelSettings, LockOutlined } from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { rolesApi } from '../../api/auth/userManagementApi';
import type { Role } from '../../types/userManagement';
import { useSectionPermissions } from '../../hooks/usePermission';

const emptyForm = { name: '', description: '', isActive: true };

export default function RolesPage() {
  const { canCreate, canEdit, canDelete } = useSectionPermissions('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Role | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await rolesApi.getAll();
      setRoles(res.data);
    } catch {
      setError('Failed to load roles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setSaveError(null);
    setShowForm(true);
  };

  const openEdit = (role: Role) => {
    setEditTarget(role);
    setForm({ name: role.name, description: role.description ?? '', isActive: role.isActive });
    setSaveError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true); setSaveError(null);
    try {
      if (editTarget) {
        await rolesApi.update(editTarget.id, {
          name: form.name, description: form.description, isActive: form.isActive,
        });
      } else {
        await rolesApi.create({ name: form.name, description: form.description, permissionIds: [] });
      }
      setShowForm(false);
      fetchRoles();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(msg ?? 'Failed to save role.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await rolesApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchRoles();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to delete role.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Roles"
        subtitle="Manage system roles — create custom roles and activate or deactivate existing ones"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Roles' }]}
      />

      <Grid container spacing={3}>
        {/* ── Form ── */}
        {showForm && (
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card>
              <CardHeader
                title={
                  <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                    <AdminPanelSettings sx={{ color: '#1565C0' }} />
                    <Typography sx={{ fontWeight: 700 }}>
                      {editTarget ? 'Edit Role' : 'New Role'}
                    </Typography>
                  </Stack>
                }
                action={<IconButton size="small" onClick={() => setShowForm(false)}><Close /></IconButton>}
              />
              <Divider />
              <CardContent>
                {saveError && <Alert severity="error" onClose={() => setSaveError(null)} sx={{ mb: 2 }}>{saveError}</Alert>}
                <Stack spacing={2}>
                  <TextField label="Role Name" fullWidth required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Operations Manager"
                  />
                  <TextField label="Description" fullWidth multiline rows={3}
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Describe what this role can do…"
                  />
                  {editTarget && (
                    <FormControlLabel
                      control={
                        <Switch checked={form.isActive}
                          onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
                      }
                      label="Active"
                    />
                  )}
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    After creating a role, go to <strong>Role Permissions</strong> to assign what this role can access.
                  </Alert>
                  <Stack direction="row" spacing={1.5}>
                    <Button variant="outlined" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
                    {(editTarget ? canEdit : canCreate) && (
                      <Button variant="contained"
                        startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}
                        onClick={handleSave}
                        disabled={saving || !form.name.trim()}>
                        {saving ? 'Saving...' : editTarget ? 'Update' : 'Create Role'}
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* ── Table ── */}
        <Grid size={{ xs: 12, lg: showForm ? 8 : 12 }}>
          <Card>
            <CardHeader
              title={<Typography sx={{ fontWeight: 700 }}>All Roles ({roles.length})</Typography>}
              action={
                canCreate && (
                  <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
                    Add Role
                  </Button>
                )
              }
            />
            <Divider />
            <CardContent>
              {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
              {loading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Permissions</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {roles.map((role) => (
                        <TableRow key={role.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{role.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {role.description ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={role.permissions.length} size="small"
                              color={role.permissions.length > 0 ? 'primary' : 'default'}
                              variant="outlined" sx={{ fontWeight: 700 }} />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={role.isActive ? 'Active' : 'Inactive'}
                              size="small"
                              color={role.isActive ? 'success' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {role.isSystem && (
                              <Tooltip title="System roles cannot be deleted">
                                <Chip icon={<LockOutlined />} label="System" size="small" variant="outlined" />
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {canEdit && (
                              <Tooltip title="Edit role">
                                <IconButton size="small" color="primary" onClick={() => openEdit(role)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canDelete && !role.isSystem && (
                              <Tooltip title="Delete role">
                                <IconButton size="small" color="error" onClick={() => setDeleteTarget(role)}>
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
        title="Delete Role"
        message={`Delete role "${deleteTarget?.name}"? Users assigned to this role will need to be reassigned.`}
        confirmLabel="Delete" loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}