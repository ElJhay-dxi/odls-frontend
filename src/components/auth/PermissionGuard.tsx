import { Box, Typography, Button, Paper } from '@mui/material';
import { Lock } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
}

/**
 * Wraps a page and shows Access Denied if the user lacks the required permission.
 * Usage: <PermissionGuard permission="daily.energy_hydro.view"><MyPage /></PermissionGuard>
 */
export default function PermissionGuard({ permission, children }: PermissionGuardProps) {
  const { hasPermission } = useUser();
  const navigate = useNavigate();

  if (!hasPermission(permission)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', maxWidth: 420, borderRadius: 3 }}>
          <Lock sx={{ fontSize: '3rem', color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Access Denied
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            You don't have permission to view this page. Contact your administrator if you need access.
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }

  return <>{children}</>;
}