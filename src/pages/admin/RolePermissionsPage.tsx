import {
  Box, Card, CardContent, CardHeader, Button, CircularProgress,
  Alert, Typography, Grid, Divider, Chip, Stack, MenuItem,
  FormControl, InputLabel, Select, Checkbox, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { Save, Security, CheckBox, CheckBoxOutlineBlank } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { rolesApi, permissionsApi } from '../../api/auth/userManagementApi';
import type { Role, Permission } from '../../types/userManagement';
import { useSectionPermissions } from '../../hooks/usePermission';

const ACTION_ORDER = ['view', 'create', 'edit', 'delete'];
const ACTION_COLORS: Record<string, string> = {
  view: '#1565C0', create: '#2E7D32', edit: '#E65100', delete: '#B71C1C',
};

export default function RolePermissionsPage() {
  const { canEdit } = useSectionPermissions('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Promise.all([rolesApi.getAll(), permissionsApi.getAll()]).then(([r, p]) => {
      setRoles(r.data);
      setPermissions(p.data);
    });
  }, []);

  useEffect(() => {
    if (!selectedRoleId) { setSelectedRole(null); setAssigned(new Set()); return; }
    setLoading(true);
    rolesApi.getById(selectedRoleId).then((res) => {
      setSelectedRole(res.data);
      setAssigned(new Set(res.data.permissions.map((p) => p.id)));
    }).catch(() => setError('Failed to load role permissions.'))
      .finally(() => setLoading(false));
  }, [selectedRoleId]);

  const grouped = permissions.reduce((acc, p) => {
    if (!acc[p.group]) acc[p.group] = {};
    const parts = p.code.split('.');
    const section = parts.slice(0, -1).join('.');
    if (!acc[p.group][section]) acc[p.group][section] = [];
    acc[p.group][section].push(p);
    return acc;
  }, {} as Record<string, Record<string, Permission[]>>);

  const toggle = (id: string) => {
    setAssigned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSuccess(false);
  };

  const toggleSection = (perms: Permission[]) => {
    const allAssigned = perms.every((p) => assigned.has(p.id));
    setAssigned((prev) => {
      const next = new Set(prev);
      if (allAssigned) perms.forEach((p) => next.delete(p.id));
      else perms.forEach((p) => next.add(p.id));
      return next;
    });
    setSuccess(false);
  };

  const toggleGroup = (groupPerms: Permission[]) => {
    const allAssigned = groupPerms.every((p) => assigned.has(p.id));
    setAssigned((prev) => {
      const next = new Set(prev);
      if (allAssigned) groupPerms.forEach((p) => next.delete(p.id));
      else groupPerms.forEach((p) => next.add(p.id));
      return next;
    });
    setSuccess(false);
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true); setError(null); setSuccess(false);
    try {
      await rolesApi.updatePermissions(selectedRoleId, Array.from(assigned));
      setSuccess(true);
      const res = await rolesApi.getById(selectedRoleId);
      setSelectedRole(res.data);
      setAssigned(new Set(res.data.permissions.map((p) => p.id)));
    } catch {
      setError('Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  const allGroupPerms = (group: string) =>
    Object.values(grouped[group] ?? {}).flat();

  return (
    <Box>
      <PageHeader
        title="Role Permissions"
        subtitle="Assign or remove permissions for each role"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Role Permissions' }]}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'flex-end' }}>
            <FormControl sx={{ minWidth: 280 }}>
              <InputLabel>Select Role</InputLabel>
              <Select label="Select Role" value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}>
                {roles.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography>{r.name}</Typography>
                      {r.isSystem && <Chip label="System" size="small" variant="outlined" sx={{ fontSize: 10 }} />}
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedRole && (
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Chip label={`${assigned.size} permissions assigned`} color="primary" variant="outlined" />
                {canEdit && (
                  <Button variant="contained" size="large"
                    startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}
                    onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </Stack>
            )}
          </Stack>
          {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 1.5 }}>{error}</Alert>}
          {success && <Alert severity="success" onClose={() => setSuccess(false)} sx={{ mt: 1.5 }}>Permissions saved successfully.</Alert>}
        </CardContent>
      </Card>

      {loading && <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>}

      {selectedRole && !loading && (
        <Grid container spacing={3}>
          {Object.entries(grouped).map(([group, sections]) => {
            const groupPerms = allGroupPerms(group);
            const groupAssigned = groupPerms.filter((p) => assigned.has(p.id)).length;
            const groupAllSelected = groupAssigned === groupPerms.length;

            return (
              <Grid key={group} size={{ xs: 12, lg: 6 }}>
                <Card>
                  <CardHeader
                    title={
                      <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                        <Security sx={{ color: '#1565C0', fontSize: '1.1rem' }} />
                        <Typography sx={{ fontWeight: 700 }}>{group}</Typography>
                        <Chip label={`${groupAssigned}/${groupPerms.length}`} size="small"
                          color={groupAllSelected ? 'success' : groupAssigned > 0 ? 'warning' : 'default'}
                          variant="outlined" sx={{ fontWeight: 700 }} />
                      </Stack>
                    }
                    action={
                      canEdit && (
                        <Button size="small" onClick={() => toggleGroup(groupPerms)}
                          startIcon={groupAllSelected ? <CheckBox /> : <CheckBoxOutlineBlank />}>
                          {groupAllSelected ? 'Deselect All' : 'Select All'}
                        </Button>
                      )
                    }
                  />
                  <Divider />
                  <CardContent sx={{ p: 0 }}>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: 'action.hover' }}>
                            <TableCell sx={{ fontWeight: 700, width: '40%' }}>Section</TableCell>
                            {ACTION_ORDER.map((a) => (
                              <TableCell key={a} align="center" sx={{ fontWeight: 700, color: ACTION_COLORS[a], fontSize: 11 }}>
                                {a.toUpperCase()}
                              </TableCell>
                            ))}
                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: 11 }}>ALL</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(sections).map(([section, perms]) => {
                            const sectionAssigned = perms.filter((p) => assigned.has(p.id)).length;
                            const sectionAll = sectionAssigned === perms.length;
                            const byAction = (action: string) =>
                              perms.find((p) => p.code.endsWith(`.${action}`));
                            const sectionLabel = section.split('.').pop()?.replace(/_/g, ' ') ?? section;

                            return (
                              <TableRow key={section} hover>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                                    {sectionLabel}
                                  </Typography>
                                </TableCell>
                                {ACTION_ORDER.map((action) => {
                                  const perm = byAction(action);
                                  return (
                                    <TableCell key={action} align="center" sx={{ p: 0.5 }}>
                                      {perm ? (
                                        <Checkbox
                                          size="small"
                                          checked={assigned.has(perm.id)}
                                          onChange={() => canEdit && toggle(perm.id)}
                                          disabled={!canEdit}
                                          sx={{ color: ACTION_COLORS[action], '&.Mui-checked': { color: ACTION_COLORS[action] } }}
                                        />
                                      ) : (
                                        <Typography variant="caption" color="text.disabled">—</Typography>
                                      )}
                                    </TableCell>
                                  );
                                })}
                                <TableCell align="center" sx={{ p: 0.5 }}>
                                  <Checkbox size="small" checked={sectionAll}
                                    indeterminate={sectionAssigned > 0 && !sectionAll}
                                    onChange={() => canEdit && toggleSection(perms)}
                                    disabled={!canEdit}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {!selectedRole && !loading && (
        <Paper variant="outlined" sx={{ textAlign: 'center', py: 8, borderRadius: 2 }}>
          <Security sx={{ fontSize: '3rem', color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">Select a role to manage its permissions.</Typography>
        </Paper>
      )}
    </Box>
  );
}