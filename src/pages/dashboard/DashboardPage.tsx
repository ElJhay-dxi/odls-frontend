import {
  Box, Grid, Card, CardContent, Typography,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Divider,
  Alert, IconButton, Tooltip, Skeleton,
  Avatar,
} from '@mui/material';
import {
  Factory, ElectricBolt, WaterDrop, /*WbSunny,
  Air,*/ AccountTree, Refresh, FiberManualRecord,
} from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import PageHeader from '../../components/shared/PageHeader';
import { dashboardApi, type DashboardStats, type RecentActivityItem } from '../../api/dashboardApi';

// ─── Stat card config ──────────────────────────────────────────────────────────
const buildStatCards = (stats: DashboardStats | null) => [
  {
    label: 'Total Plants',
    value: stats?.totalPlants ?? null,
    icon: <Factory />,
    iconColor: '#0A3D62',
    iconBg: '#E3EEF8',
    sub: 'All registered plants',
  },
  {
    label: 'Thermal Plants',
    value: stats?.thermalPlants ?? null,
    icon: <ElectricBolt />,
    iconColor: '#C62828',
    iconBg: '#FEECEC',
    sub: 'Simple & Combined Cycle',
  },
  {
    label: 'Hydro Plants',
    value: stats?.hydroPlants ?? null,
    icon: <WaterDrop />,
    iconColor: '#1565C0',
    iconBg: '#E3EEF8',
    sub: 'Hydroelectric generation',
  },
  /*{
    label: 'Solar Plants',
    value: stats?.solarPlants ?? null,
    icon: <WbSunny />,
    iconColor: '#E65100',
    iconBg: '#FFF3E0',
    sub: 'Photovoltaic systems',
  },
  {
    label: 'Wind Plants',
    value: stats?.windPlants ?? null,
    icon: <Air />,
    iconColor: '#2E7D32',
    iconBg: '#E8F5E9',
    sub: 'Wind generation units',
  },*/
  {
    label: 'Total Units',
    value: stats?.totalUnits ?? null,
    icon: <AccountTree />,
    iconColor: '#6A1B9A',
    iconBg: '#F3E5F5',
    sub: 'Generating units across all plants',
  },
];

// ─── Action chip colour map ────────────────────────────────────────────────────
const ACTION_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  Created: 'success',
  Updated: 'warning',
  Deleted: 'error',
};

// ─── Entity avatar colour map ──────────────────────────────────────────────────
const ENTITY_COLORS: Record<string, string> = {
  'Power Plant': '#0A3D62',
  'Plant Unit': '#1565C0',
  'Plant Classification': '#6A1B9A',
  'Generation Type': '#2E7D32',
  'Unit System': '#E65100',
  'Unit Sub-System': '#C62828',
  'Unit Equipment': '#F0A500',
  'Balance of Plant': '#00838F',
  'BOP System': '#558B2F',
  'BOP Sub-System': '#4527A0',
  'BOP Equipment': '#AD1457',
};

const entityInitial = (entity: string) =>
  entity.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

// ─── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number | null;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  sub: string;
  loading: boolean;
}

function StatCard({ label, value, icon, iconColor, iconBg, sub, loading }: StatCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box
            sx={{
              width: 44, height: 44, borderRadius: 2,
              backgroundColor: iconBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Box sx={{ color: iconColor, '& svg': { fontSize: '1.35rem' } }}>{icon}</Box>
          </Box>
          {!loading && value !== null && (
            <FiberManualRecord sx={{ fontSize: '0.6rem', color: 'success.main', mt: 0.5 }} />
          )}
        </Box>

        {loading ? (
          <>
            <Skeleton variant="text" width={60} height={40} />
            <Skeleton variant="text" width={100} height={20} />
          </>
        ) : (
          <>
            <Typography variant="h4" color="text.primary" sx={{ fontWeight: 700 , lineHeight : 1, }}  >
              {value ?? '–'}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, mb: 0.3 }} color="text.primary">
              {label}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {sub}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard Page ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const { accounts } = useMsal();
  const user = accounts[0];

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [activity, setActivity] = useState<RecentActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await dashboardApi.getStats();
      setStats(res.data);
    } catch {
      setStatsError('Could not load summary statistics.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    setActivityLoading(true);
    setActivityError(null);
    try {
      const res = await dashboardApi.getRecentActivity(20);
      setActivity(res.data);
    } catch {
      setActivityError('Could not load recent activity.');
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchActivity();
  }, [fetchStats, fetchActivity]);

  const handleRefresh = () => {
    fetchStats();
    fetchActivity();
  };

  const statCards = buildStatCards(stats);

  return (
    <Box>
      <PageHeader
        title={`${greeting}, ${user?.name?.split(' ')[0] ?? 'Operator'}`}
        subtitle={todayLabel}
      />

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      {statsError && (
        <Alert severity="error" onClose={() => setStatsError(null)} sx={{ mb: 2 }}>
          {statsError}
        </Alert>
      )}

      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {statCards.map((card) => (
          /*<Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}*/ 
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={card.label}>
            <StatCard {...card} loading={statsLoading} />
          </Grid>
        ))}
      </Grid>

      {/* ── Recent Activity ─────────────────────────────────────────────────── */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {/* Card Header */}
          <Box
            sx={{
              px: 2.5, py: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Recent Activity
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Latest master data changes across all modules
              </Typography>
            </Box>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={handleRefresh}>
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Divider />

          {activityError && (
            <Alert severity="error" onClose={() => setActivityError(null)} sx={{ m: 2 }}>
              {activityError}
            </Alert>
          )}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Entity</TableCell>
                  <TableCell>Name / Reference</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Performed By</TableCell>
                  <TableCell>Date & Time</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {activityLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton variant="text" height={20} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : activity.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <AccountTree sx={{ fontSize: '2.5rem', color: 'text.disabled' }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                          No recent activity
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          Activity will appear here as data is entered into the system
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  activity.map((item) => (
                    <TableRow key={item.id}>
                      {/* Entity */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                          <Avatar
                            sx={{
                              width: 30, height: 30,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              backgroundColor: ENTITY_COLORS[item.entity] ?? '#546E7A',
                            }}
                          >
                            {entityInitial(item.entity)}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {item.entity}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Name */}
                      <TableCell>
                        <Typography variant="body2">{item.entityName}</Typography>
                      </TableCell>

                      {/* Action */}
                      <TableCell>
                        <Chip
                          label={item.action}
                          size="small"
                          color={ACTION_COLORS[item.action] ?? 'default'}
                          sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                        />
                      </TableCell>

                      {/* Performed By */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.performedBy}
                        </Typography>
                      </TableCell>

                      {/* Date & Time */}
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(item.performedAt).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(item.performedAt).toLocaleTimeString('en-GB', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}