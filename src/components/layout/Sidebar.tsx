import {
  Box, Drawer, List, ListItemButton, ListItemIcon,
  ListItemText, Collapse, Typography, Divider, Tooltip,
} from '@mui/material';
import {
  Dashboard, Factory, ElectricBolt, AccountTree,
  ExpandLess, ExpandMore, Tune, WaterDrop,
  Science, Assignment, BarChart, Settings,
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const DRAWER_WIDTH = 260;

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
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
    children: [
      { label: 'Plant Classifications', icon: <Tune />, path: '/master/plant-classifications' },
      { label: 'Generation Types', icon: <ElectricBolt />, path: '/master/generation-types' },
      { label: 'Power Plants', icon: <Factory />, path: '/master/power-plants' },
      { label: 'Plant Units', icon: <AccountTree />, path: '/master/plant-units' },
      { label: 'Unit Systems', icon: <AccountTree />, path: '/master/unit-systems' },
      { label: 'Unit Sub-Systems', icon: <AccountTree />, path: '/master/unit-subsystems' },
      { label: 'Unit Equipment', icon: <Tune />, path: '/master/unit-equipment' },
      { label: 'Balance of Plant', icon: <AccountTree />, path: '/master/bop' },
      { label: 'BOP Systems', icon: <AccountTree />, path: '/master/bop-systems' },
      { label: 'BOP Sub-Systems', icon: <AccountTree />, path: '/master/bop-subsystems' },
      { label: 'BOP Equipment', icon: <Tune />, path: '/master/bop-equipment' },
    ],
  },
  {
    label: 'Hourly Readings',
    icon: <ElectricBolt />,
    children: [
      { label: 'Unit Readings (Hydro)', icon: <WaterDrop />, path: '/hourly/hydro-units' },
      { label: 'Unit Readings (Thermal)', icon: <ElectricBolt />, path: '/hourly/thermal-units' },
      { label: 'System Conditions', icon: <BarChart />, path: '/hourly/system-conditions' },
      { label: 'Exchange Generation', icon: <ElectricBolt />, path: '/hourly/exchange-generation' },
      { label: 'Line Voltage (Hydro)', icon: <ElectricBolt />, path: '/hourly/line-voltage' },
      { label: 'Peak Period Readings', icon: <BarChart />, path: '/hourly/peak-period' },
    ],
  },
  {
    label: 'Daily Readings',
    icon: <Assignment />,
    children: [
      { label: 'Energy Generation (Hydro)', icon: <WaterDrop />, path: '/daily/energy-hydro' },
      { label: 'Energy Generation (Thermal)', icon: <ElectricBolt />, path: '/daily/energy-thermal' },
      { label: 'Reactive Power', icon: <ElectricBolt />, path: '/daily/reactive-power' },
      { label: 'LCO Readings', icon: <Tune />, path: '/daily/lco' },
      { label: 'DFO Readings', icon: <Tune />, path: '/daily/dfo' },
      { label: 'Natural Gas (Turbine)', icon: <Tune />, path: '/daily/gas-turbine' },
      { label: 'Natural Gas (Chromatograph)', icon: <Tune />, path: '/daily/gas-chromatograph' },
      { label: 'Station Consumption', icon: <ElectricBolt />, path: '/daily/station-consumption' },
      { label: 'Plant Availability', icon: <BarChart />, path: '/daily/availability' },
      { label: 'Plant Trips', icon: <Assignment />, path: '/daily/trips' },
      { label: 'Reliability Metrics', icon: <BarChart />, path: '/daily/reliability' },
      { label: 'Water System', icon: <WaterDrop />, path: '/daily/water-system' },
    ],
  },
  {
    label: 'Station Logs',
    icon: <Assignment />,
    children: [
      { label: 'Thermal Station Logs', icon: <ElectricBolt />, path: '/station-logs/thermal' },
      { label: 'Hydro Station Logs', icon: <WaterDrop />, path: '/station-logs/hydro' },
    ],
  },
  {
    label: 'Chemical Lab',
    icon: <Science />,
    children: [
      { label: 'Shift Logs', icon: <Assignment />, path: '/lab/shift-logs' },
      { label: 'Lab Analysis', icon: <Science />, path: '/lab/analysis' },
      { label: 'Sample Records', icon: <Assignment />, path: '/lab/samples' },
      { label: 'Sea Water Monitoring', icon: <WaterDrop />, path: '/lab/seawater' },
      { label: 'Desalination Logs', icon: <WaterDrop />, path: '/lab/desalination' },
      { label: 'Chemical Dosing', icon: <Science />, path: '/lab/dosing' },
    ],
  },
  {
    label: 'Reports',
    icon: <BarChart />,
    path: '/reports',
  },
];

interface SidebarProps {
  open: boolean;
}

export default function Sidebar({ open }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState<string[]>(['Master Data']);

  const toggleExpand = (label: string) => {
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const isActive = (path?: string) => path && location.pathname === path;

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
                isExpanded ? <ExpandLess sx={{ fontSize: '1rem', opacity: 0.7 }} /> : <ExpandMore sx={{ fontSize: '1rem', opacity: 0.7 }} />
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
          {renderItems(navItems)}
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
            OP
          </Typography>
        </Box>
        {open && (
          <Box>
            <Typography variant="caption" sx={{ color: '#FFF', fontWeight: 600, display: 'block', fontSize: '0.75rem' }}>
              Operator
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem' }}>
              operator@vra.com
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}