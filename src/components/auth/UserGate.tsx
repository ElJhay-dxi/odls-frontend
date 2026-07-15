import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material';
import { useUser } from '../../context/UserContext';

export default function UserGate({ children }: { children: React.ReactNode }) {
  const { profile, loading, error, reload } = useUser();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">Loading your profile…</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2, px: 3 }}>
        <Alert severity="error" sx={{ maxWidth: 480 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>Access Denied</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
        <Button variant="outlined" onClick={reload}>Retry</Button>
      </Box>
    );
  }

  if (!profile) return null;
  return <>{children}</>;
}