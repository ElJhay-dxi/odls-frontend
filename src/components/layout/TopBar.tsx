import {
  AppBar, Toolbar, IconButton, Typography,
  Box, Tooltip, Avatar, Menu, MenuItem,
  ListItemIcon, Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications,
  Logout,
  Person,
} from '@mui/icons-material';
import { useState } from 'react';
import { useMsal } from '@azure/msal-react';

interface TopBarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  drawerWidth: number;
}

export default function TopBar({ sidebarOpen, onToggleSidebar, drawerWidth }: TopBarProps) {
  const { instance, accounts } = useMsal();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const user = accounts[0];
  const displayName = user?.name ?? 'User';
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = async () => {
  setAnchorEl(null);

  try {
    await instance.logoutRedirect({
      postLogoutRedirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI,
    });
  } catch (e) {
    console.error(e);
  }
};

  return (
    <AppBar
      position="fixed"
      sx={{
        width: `calc(100% - ${sidebarOpen ? drawerWidth : 64}px)`,
        ml: `${sidebarOpen ? drawerWidth : 64}px`,
        transition: 'width 0.25s ease, margin-left 0.25s ease',
        zIndex: (theme) => theme.zIndex.drawer - 1,
      }}
    >
      <Toolbar sx={{ minHeight: 64 }}>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onToggleSidebar}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', flexGrow: 1 }}>
          Power Plant Operational Data Logging
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Notifications">
            <IconButton color="inherit" size="small">
              <Notifications />
            </IconButton>
          </Tooltip>

          <Tooltip title={displayName}>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small" sx={{ ml: 0.5 }}>
              <Avatar
                sx={{
                  width: 34, height: 34,
                  backgroundColor: '#F0A500',
                  color: '#000',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {initials}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{ paper: { sx: { mt: 1, minWidth: 180 } } }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.username}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => setAnchorEl(null)}>
            <ListItemIcon><Person fontSize="small" /></ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon>
            Sign Out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}