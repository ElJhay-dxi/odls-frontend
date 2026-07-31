import {
  Box, Drawer, List, ListItemButton, ListItemIcon,
  ListItemText, Collapse, Typography, Divider, Tooltip,
} from '@mui/material';
import {
  Dashboard, Factory, ElectricBolt, AccountTree,
  ExpandLess, ExpandMore, Tune, WaterDrop,
  Science, Assignment, BarChart, Settings, LocationOn,
  AdminPanelSettings, Security, People,
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

export const DRAWER_WIDTH = 260;

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  permission?: string;   // required permission code to show this item
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: <Dashboard />,
    path: '/',
  },
  {
    label: 'Master Data',
    icon: <Settings />,
    permission: 'master.view',
    children: [
      { label: 'Plant Classifications', icon: <Tune />, path: '/master/plant-classifications', permission: 'master.view' },
      { label: 'Generation Types', icon: <ElectricBolt />, path: '/master/generation-types', permission: 'master.view' },
      { label: 'Plant Locations', icon: <LocationOn />, path: '/master/plant-locations', permission: 'master.view' },
      { label: 'Power Plants', icon: <Factory />, path: '/master/power-plants', permission: 'master.view' },
      { label: 'Plant Units', icon: <AccountTree />, path: '/master/plant-units', permission: 'master.view' },
      { label: 'Unit Systems', icon: <AccountTree />, path: '/master/unit-systems', permission: 'master.view' },
      { label: 'Unit Sub-Systems', icon: <AccountTree />, path: '/master/unit-subsystems', permission: 'master.view' },
      { label: 'Unit Equipment', icon: <Tune />, path: '/master/unit-equipment', permission: 'master.view' },
      { label: 'Balance of Plant', icon: <AccountTree />, path: '/master/bop', permission: 'master.view' },
      { label: 'BOP Systems', icon: <AccountTree />, path: '/master/bop-systems', permission: 'master.view' },
      { label: 'BOP Sub-Systems', icon: <AccountTree />, path: '/master/bop-subsystems', permission: 'master.view' },
      { label: 'BOP Equipment', icon: <Tune />, path: '/master/bop-equipment', permission: 'master.view' },
      { label: 'Bearing Metals', icon: <Settings />, path: '/master/bearing-metals', permission: 'master.view' },
      { label: 'Bearing Drains', icon: <Settings />, path: '/master/bearing-drains', permission: 'master.view' },
      { label: 'Plant Buses', icon: <Settings />, path: '/master/plant-buses', permission: 'master.view' },
    ],
  },
  {
    label: 'Hourly Readings',
    icon: <ElectricBolt />,
    children: [
      { label: 'Unit Readings (Hydro)', icon: <WaterDrop />, path: '/hourly/hydro-units', permission: 'hourly.hydro_units.view' },
      { label: 'Unit Readings (Thermal)', icon: <ElectricBolt />, path: '/hourly/thermal-units', permission: 'hourly.thermal_units.view' },
      { label: 'System Conditions', icon: <BarChart />, path: '/hourly/system-conditions', permission: 'hourly.system_conditions.view' },
      { label: 'Exchange Generation', icon: <ElectricBolt />, path: '/hourly/exchange-generation', permission: 'hourly.exchange_generation.view' },
      { label: 'Bus Voltages', icon: <ElectricBolt />, path: '/hourly/bus-voltages', permission: 'hourly.bus_voltages.view' },
      { label: 'Peak Period Readings', icon: <BarChart />, path: '/hourly/peak-period', permission: 'hourly.peak_period.view' },
    ],
  },
  {
    label: 'Daily Readings',
    icon: <Assignment />,
    children: [
      { label: 'Energy Generation (Hydro)', icon: <WaterDrop />, path: '/daily/energy-generation-hydro', permission: 'daily.energy_hydro.view' },
      { label: 'Energy Generation (Thermal)', icon: <ElectricBolt />, path: '/daily/energy-generation-thermal', permission: 'daily.energy_thermal.view' },
      { label: 'Reactive Power', icon: <ElectricBolt />, path: '/daily/reactive-power', permission: 'daily.reactive_power.view' },
      { label: 'LCO Readings', icon: <Tune />, path: '/daily/lco-readings', permission: 'daily.lco.view' },
      { label: 'DFO Readings', icon: <Tune />, path: '/daily/dfo-readings', permission: 'daily.dfo.view' },
      { label: 'Natural Gas (Turbine)', icon: <Tune />, path: '/daily/natural-gas-turbine', permission: 'daily.gas_turbine.view' },
      { label: 'Natural Gas (Chromatograph)', icon: <Tune />, path: '/daily/natural-gas-chromatograph', permission: 'daily.gas_chromatograph.view' },
      { label: 'Station Energy Consumption', icon: <Tune />, path: '/daily/station-energy-consumption', permission: 'daily.station_energy.view' },
      { label: 'SCC System Readings', icon: <Tune />, path: '/daily/scc-readings', permission: 'daily.scc.view' },
      { label: 'Plant Availability', icon: <BarChart />, path: '/daily/plant-availability', permission: 'daily.plant_availability.view' },
      { label: 'Plant Trips', icon: <Assignment />, path: '/daily/plant-trips', permission: 'daily.plant_trips.view' },
      { label: 'Reliability Metrics', icon: <BarChart />, path: '/daily/plant-reliability', permission: 'daily.plant_reliability.view' },
      { label: 'Plant Load Factor', icon: <BarChart />, path: '/daily/plant-load-factor', permission: 'daily.plant_load_factor.view' },
      { label: 'Water System', icon: <WaterDrop />, path: '/daily/water-system', permission: 'daily.water_system.view' },
      { label: 'Hydrology', icon: <WaterDrop />, path: '/hydrology', permission: 'daily.hydrology.view' },
    ],
  },
  {
    label: 'Station Logs',
    icon: <Assignment />,
    children: [
      { label: 'Thermal Station Logs', icon: <ElectricBolt />, path: '/station-logs/thermal', permission: 'station_logs.thermal.view' },
      { label: 'Hydro Station Logs', icon: <WaterDrop />, path: '/station-logs/hydro', permission: 'station_logs.hydro.view' },
    ],
  },
  {
    label: 'Chemical Lab',
    icon: <Science />,
    children: [
      { label: 'Shift Logs', icon: <Assignment />, path: '/lab/shift-logs', permission: 'lab.shift_logs.view' },
      { label: 'Lab Analysis', icon: <Science />, path: '/lab/analysis', permission: 'lab.analysis.view' },
      { label: 'Sample Records', icon: <Assignment />, path: '/lab/samples', permission: 'lab.samples.view' },
      { label: 'Sea Water Monitoring', icon: <WaterDrop />, path: '/lab/seawater', permission: 'lab.seawater.view' },
      { label: 'Desalination Logs', icon: <WaterDrop />, path: '/lab/desalination', permission: 'lab.desalination.view' },
      { label: 'Chemical Dosing', icon: <Science />, path: '/lab/dosing', permission: 'lab.dosing.view' },
    ],
  },
  {
    label: 'Reports',
    icon: <BarChart />,
    path: '/reports',
    permission: 'reports.view',
  },
  {
    label: 'Admin',
    icon: <AdminPanelSettings />,
    permission: 'users.view',
    children: [
      { label: 'Permissions', icon: <Security />, path: '/admin/permissions', permission: 'permissions.view' },
      { label: 'Roles', icon: <AdminPanelSettings />, path: '/admin/roles', permission: 'roles.view' },
      { label: 'Role Permissions', icon: <Security />, path: '/admin/role-permissions', permission: 'roles.edit' },
      { label: 'Users', icon: <People />, path: '/admin/users', permission: 'users.view' },
    ],
  },
];

interface SidebarProps {
  open: boolean;
}

export default function Sidebar({ open }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, hasPermission } = useUser();
  const [expanded, setExpanded] = useState<string[]>(['Master Data']);

  const toggleExpand = (label: string) => {
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const isActive = (path?: string) => path && location.pathname === path;

  // Filter items the user has permission to see
  const canSee = (item: NavItem): boolean => {
    if (!item.permission) return true; // no permission required — always show
    return hasPermission(item.permission);
  };

  const filterItems = (items: NavItem[]): NavItem[] =>
    items
      .filter(canSee)
      .map((item) => ({
        ...item,
        children: item.children ? filterItems(item.children) : undefined,
      }))
      .filter((item) => !item.children || item.children.length > 0); // hide parent if all children hidden

  const visibleItems = filterItems(navItems);

  const renderItems = (items: NavItem[], depth = 0) =>
    items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expanded.includes(item.label);

      return (
        <Box key={item.label}>
          <Tooltip title={!open ? item.label : ''} placement="right">
            <ListItemButton
              onClick={() => {
                if (hasChildren) toggleExpand(item.label);
                else if (item.path) navigate(item.path);
              }}
              sx={{
                pl: depth === 0 ? 2 : 3.5,
                py: 0.9,
                mx: 1,
                borderRadius: 1.5,
                mb: 0.3,
                color: isActive(item.path) ? '#F0A500' : 'rgba(255,255,255,0.78)',
                backgroundColor: isActive(item.path)
                  ? 'rgba(240,165,0,0.12)'
                  : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#FFFFFF',
                },
                transition: 'all 0.15s ease',
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: isActive(item.path) ? '#F0A500' : 'rgba(255,255,255,0.6)',
                  '& svg': { fontSize: depth === 0 ? '1.3rem' : '1.1rem' },
                }}
              >
                {item.icon}
              </ListItemIcon>
              {open && (
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: {
                      sx: {
                        fontSize: depth === 0 ? '0.875rem' : '0.813rem',
                        fontWeight: depth === 0 ? 600 : 400,
                      },
                    },
                  }}
                />
              )}
              {open && hasChildren && (
                isExpanded
                  ? <ExpandLess sx={{ fontSize: '1rem', opacity: 0.7 }} />
                  : <ExpandMore sx={{ fontSize: '1rem', opacity: 0.7 }} />
              )}
            </ListItemButton>
          </Tooltip>

          {hasChildren && (
            <Collapse in={isExpanded && open} timeout="auto" unmountOnExit>
              <List disablePadding>
                {renderItems(item.children!, depth + 1)}
              </List>
            </Collapse>
          )}
        </Box>
      );
    });

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? DRAWER_WIDTH : 64,
        flexShrink: 0,
        transition: 'width 0.25s ease',
        '& .MuiDrawer-paper': {
          width: open ? DRAWER_WIDTH : 64,
          overflowX: 'hidden',
          transition: 'width 0.25s ease',
          boxSizing: 'border-box',
        },
      }}
    >
      {/* Logo area */}
      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          px: 2,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <ElectricBolt sx={{ color: '#F0A500', fontSize: '1.6rem', mr: open ? 1.5 : 0 }} />
        {open && (
          <Box>
            <Typography variant="subtitle1" sx={{ color: '#FFFFFF', fontWeight: 700, lineHeight: 1.2, fontSize: '0.95rem' }}>
              ODL System
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
              Operational Data Logging
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, py: 1 }}>
        <List disablePadding>
          {renderItems(visibleItems)}
        </List>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
      <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 32, height: 32, borderRadius: '50%',
            backgroundColor: '#F0A500',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#000' }}>
            {profile?.fullName?.charAt(0)?.toUpperCase() ?? 'U'}
          </Typography>
        </Box>
        {open && (
          <Box>
            <Typography variant="caption" sx={{ color: '#FFF', fontWeight: 600, display: 'block', fontSize: '0.75rem' }}>
              {profile?.fullName ?? 'User'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem' }}>
              {profile?.roleName ?? ''}
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}