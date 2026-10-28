// "My profile": who the signed-in user is, their role, plants and what they can do in the app.
// Read-only — details, role and plants are managed by admins under Admin → Users.
import {
  Alert, Avatar, Box, Card, CardContent, Chip, CircularProgress, Divider, Grid, InputAdornment,
  Paper, Stack, Switch, FormControlLabel, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  Email, Badge as BadgeIcon, Work, Phone, Login, CalendarMonth, Factory, Security, Search,
  CheckCircle, RemoveCircleOutlined, AdminPanelSettings, Bolt, WaterDrop, InfoOutlined,
} from '@mui/icons-material';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMsal } from '@azure/msal-react';
import dayjs from 'dayjs';
import PageHeader from '../../components/shared/PageHeader';
import { useUser } from '../../context/UserContext';
import { permissionsApi } from '../../api/auth/userManagementApi';
import type { Permission } from '../../types/userManagement';

const ACTIONS = ['view', 'create', 'edit', 'delete', 'export'] as const;
const ACTION_LABELS: Record<string, string> = { view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', export: 'Export' };

interface Section {
  key: string;            // permission code without the action, e.g. "hourly.thermal_units"
  label: string;          // e.g. "Thermal Unit Readings"
  actions: Record<string, boolean | undefined>; // undefined = the action doesn't exist for this section
}
interface Group { name: string; order: number; sections: Section[] }

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Turns the flat permission list into groups → sections → actions, marking the ones the user has. */
function buildGroups(all: Permission[], mine: Set<string>, isAdmin: boolean): Group[] {
  const groups = new Map<string, Group>();
  const sections = new Map<string, Section>();
  for (const p of [...all].sort((a, b) => a.displayOrder - b.displayOrder)) {
    const dot = p.code.lastIndexOf('.');
    const action = dot > 0 ? p.code.slice(dot + 1) : 'view';
    const key = dot > 0 ? p.code.slice(0, dot) : p.code;
    const label = p.name.replace(new RegExp(`^${capitalize(action)}\\s+`, 'i'), '').trim() || key;
    let g = groups.get(p.group);
    if (!g) { g = { name: p.group, order: p.displayOrder, sections: [] }; groups.set(p.group, g); }
    let s = sections.get(`${p.group}|${key}`);
    if (!s) { s = { key, label, actions: {} }; sections.set(`${p.group}|${key}`, s); g.sections.push(s); }
    s.actions[action] = isAdmin || mine.has(p.code);
  }
  return [...groups.values()].sort((a, b) => a.order - b.order);
}

/** One labelled detail row in the "Your details" card. */
function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value?: string | null }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', py: 1 }}>
      <Box sx={{ color: 'text.secondary', mt: '2px', display: 'flex' }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>{label}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }} color={value ? 'text.primary' : 'text.disabled'}>
          {value || 'Not recorded'}
        </Typography>
      </Box>
    </Stack>
  );
}

/** A small stat in the header band. */
function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <Box sx={{ minWidth: 96 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  );
}

export default function ProfilePage() {
  const { profile, loading, error, isAdmin } = useUser();
  const { accounts } = useMsal();
  const account = accounts[0];

  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [permError, setPermError] = useState(false);
  const [filter, setFilter] = useState('');
  const [onlyMine, setOnlyMine] = useState(true);

  useEffect(() => {
    permissionsApi.getAll().then((res) => setAllPermissions(res.data)).catch(() => setPermError(true));
  }, []);

  const groups = useMemo(
    () => buildGroups(allPermissions, new Set(profile?.permissions ?? []), isAdmin),
    [allPermissions, profile, isAdmin],
  );

  const visibleGroups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        sections: g.sections.filter((s) =>
          (!onlyMine || Object.values(s.actions).some(Boolean)) &&
          (!q || s.label.toLowerCase().includes(q) || g.name.toLowerCase().includes(q))),
      }))
      .filter((g) => g.sections.length > 0);
  }, [groups, filter, onlyMine]);

  const sectionsWithAccess = groups.reduce((n, g) => n + g.sections.filter((s) => s.actions.view || Object.values(s.actions).some(Boolean)).length, 0);
  const canEditSomewhere = groups.some((g) => g.sections.some((s) => s.actions.create || s.actions.edit));

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error || !profile) return <Alert severity="error">{error ?? 'Could not load your profile.'}</Alert>;

  const initials = profile.fullName.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const plantTypes = [...new Set(profile.plants.map((p) => p.classificationType).filter(Boolean))];

  return (
    <Box>
      <PageHeader title="My Profile" subtitle="Your account, role, plants and what you can do in the app"
        breadcrumbs={[{ label: 'My Profile' }]} />

      {/* ── Header band ─────────────────────────────────────────────── */}
      <Card sx={{ mb: 3, overflow: 'hidden' }}>
        <Box sx={{ height: 72, background: 'linear-gradient(120deg, #0A3D62 0%, #1E5F8C 55%, #F0A500 140%)' }} />
        <CardContent sx={{ pt: 0 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 3 }}
            sx={{ alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
            <Avatar sx={{
              width: 88, height: 88, mt: '-44px', fontSize: '2rem', fontWeight: 700,
              backgroundColor: '#F0A500', color: '#1A1A2E', border: '4px solid', borderColor: 'background.paper',
            }}>
              {initials}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{profile.fullName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {[profile.designation, profile.email].filter(Boolean).join(' · ')}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }} useFlexGap>
                <Chip icon={<Security />} label={profile.roleName} color="primary" size="small" />
                {isAdmin && <Chip icon={<AdminPanelSettings />} label="Full access" color="secondary" size="small" />}
                {plantTypes.map((t) => (
                  <Chip key={t} size="small" variant="outlined" label={t}
                    icon={t.toLowerCase() === 'hydro' ? <WaterDrop /> : <Bolt />}
                    color={t.toLowerCase() === 'hydro' ? 'info' : 'error'} />
                ))}
              </Stack>
            </Box>
            <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }} useFlexGap>
              <Stat value={isAdmin || profile.plants.length === 0 ? 'All' : profile.plants.length} label="Plants" />
              <Stat value={isAdmin ? 'All' : sectionsWithAccess} label="Areas you can open" />
              <Stat value={profile.createdOn ? dayjs(profile.createdOn).format('MMM YYYY') : '—'} label="Member since" />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* ── Left column ───────────────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 5, lg: 4 }}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Your details</Typography>
                <Divider sx={{ mb: 0.5 }} />
                <DetailRow icon={<Email fontSize="small" />} label="Email" value={profile.email} />
                <DetailRow icon={<BadgeIcon fontSize="small" />} label="Employee ID" value={profile.employeeId} />
                <DetailRow icon={<Work fontSize="small" />} label="Designation" value={profile.designation} />
                <DetailRow icon={<Phone fontSize="small" />} label="Phone" value={profile.phoneNumber} />
                <DetailRow icon={<Login fontSize="small" />} label="Signed in as (Microsoft account)" value={account?.username} />
                <DetailRow icon={<CalendarMonth fontSize="small" />} label="Account set up"
                  value={profile.createdOn ? dayjs(profile.createdOn).format('DD MMM YYYY') : null} />
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }} spacing={1}>
                  <Factory fontSize="small" color="action" />
                  <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>Your plants</Typography>
                  {profile.plants.length > 0 && <Chip size="small" label={profile.plants.length} />}
                </Stack>
                <Divider sx={{ mb: 1.5 }} />
                {isAdmin || profile.plants.length === 0 ? (
                  <Alert severity="info" variant="outlined" icon={<Factory fontSize="small" />}>
                    {isAdmin
                      ? 'As a system admin you can work with every plant.'
                      : 'No plants are assigned to you, so you can see every plant.'}
                  </Alert>
                ) : (
                  <Stack spacing={1}>
                    {profile.plants.map((p) => {
                      const hydro = p.classificationType?.toLowerCase() === 'hydro';
                      return (
                        <Paper key={p.id} variant="outlined" sx={{
                          p: 1.25, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5,
                          borderLeft: '4px solid', borderLeftColor: hydro ? 'info.main' : 'error.main',
                        }}>
                          {hydro ? <WaterDrop color="info" fontSize="small" /> : <Bolt color="error" fontSize="small" />}
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{p.plantName}</Typography>
                            <Typography variant="caption" color="text.secondary">{p.classificationType || 'Plant'}</Typography>
                          </Box>
                          <Chip size="small" variant="outlined" label={p.plantCode} sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* ── Right column ──────────────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 7, lg: 8 }}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }} spacing={1}>
                  <Security fontSize="small" color="action" />
                  <Typography sx={{ fontWeight: 700 }}>Your role</Typography>
                </Stack>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{profile.roleName}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {profile.roleDescription || (isAdmin
                    ? 'Full access to every area and plant, including users, roles and permissions.'
                    : 'No description has been added for this role.')}
                </Typography>
                {!isAdmin && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                    {canEditSomewhere
                      ? 'You can view and enter data in the areas marked below.'
                      : 'Your role is view-only: you can open the areas below but not change data.'}
                  </Typography>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}
                  sx={{ alignItems: { xs: 'stretch', sm: 'center' }, mb: 1 }}>
                  <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>What you can do</Typography>
                  <TextField size="small" placeholder="Find an area…" value={filter} onChange={(e) => setFilter(e.target.value)}
                    sx={{ minWidth: 200 }}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> } }} />
                  {!isAdmin && (
                    <FormControlLabel sx={{ mr: 0 }}
                      control={<Switch size="small" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />}
                      label={<Typography variant="body2">Only mine</Typography>} />
                  )}
                </Stack>
                <Divider sx={{ mb: 2 }} />

                {permError ? (
                  <Alert severity="warning">Couldn't load the list of areas. Your access itself is unaffected.</Alert>
                ) : allPermissions.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={24} /></Box>
                ) : visibleGroups.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                    {filter ? 'No areas match your search.' : 'Your role has no permissions yet. Contact your system admin.'}
                  </Typography>
                ) : (
                  <Stack spacing={2.5}>
                    {visibleGroups.map((g) => (
                      <Box key={g.name}>
                        <Typography variant="caption" color="text.secondary"
                          sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{g.name}</Typography>
                        <Paper variant="outlined" sx={{ mt: 0.75, borderRadius: 2, overflow: 'hidden' }}>
                          {g.sections.map((s, i) => (
                            <Stack key={s.key} direction={{ xs: 'column', sm: 'row' }} spacing={1}
                              sx={{
                                px: 1.75, py: 1.1, alignItems: { xs: 'flex-start', sm: 'center' },
                                borderTop: i === 0 ? 'none' : '1px solid', borderColor: 'divider',
                              }}>
                              <Typography variant="body2" sx={{ fontWeight: 500, flexGrow: 1 }}>{s.label}</Typography>
                              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                                {ACTIONS.filter((a) => s.actions[a] !== undefined).map((a) => {
                                  const has = !!s.actions[a];
                                  return (
                                    <Tooltip key={a} title={has ? `You can ${a} ${s.label}` : `You can't ${a} ${s.label}`}>
                                      <Chip size="small" label={ACTION_LABELS[a]}
                                        icon={has ? <CheckCircle /> : <RemoveCircleOutlined />}
                                        color={has ? 'success' : 'default'} variant={has ? 'filled' : 'outlined'}
                                        sx={{ height: 22, fontSize: 11, opacity: has ? 1 : 0.6 }} />
                                    </Tooltip>
                                  );
                                })}
                              </Stack>
                            </Stack>
                          ))}
                        </Paper>
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 3, color: 'text.secondary' }}>
        <InfoOutlined fontSize="small" />
        <Typography variant="caption">
          Your details, role and plants are managed by your system admin. If anything here is wrong or you need more access, contact them.
        </Typography>
      </Stack>
    </Box>
  );
}
