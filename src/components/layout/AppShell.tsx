import { Box } from '@mui/material';
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar, { DRAWER_WIDTH } from './Sidebar';
import TopBar from './TopBar';
import RecordHighlighter from './RecordHighlighter';

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Sidebar open={sidebarOpen} />
      <TopBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        drawerWidth={DRAWER_WIDTH}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: '64px',
          p: 3,
          minHeight: 'calc(100vh - 64px)',
          transition: 'margin-left 0.25s ease',
          overflow: 'auto',
        }}
      >
        {/* Re-open the page when only its link's ?plant=&date= changes (notifications, search) so it picks the new values */}
        <Outlet key={location.search} />
        <RecordHighlighter />
      </Box>
    </Box>
  );
}