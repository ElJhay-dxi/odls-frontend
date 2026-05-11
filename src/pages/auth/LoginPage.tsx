import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
} from '@mui/material';
import { ElectricBolt } from '@mui/icons-material';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../auth/authConfig';
import { useState } from 'react';

export default function LoginPage() {
  const { instance } = useMsal();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);

    try {
      await instance.loginRedirect(loginRequest);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `
          linear-gradient(
            135deg,
            rgba(37, 99, 235, 0.7) 0%,
            rgba(6, 214, 160, 0.7) 100%
          ),
          url("https://res.cloudinary.com/dklcizyys/image/upload/v1762165899/sans-titre-1_hvzkyx.png")
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 5,
          maxWidth: 420,
          width: '100%',
          borderRadius: 3,
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          textAlign: 'center',
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(255,255,255,0.3)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            mb: 3,
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 2,
              backgroundColor: '#0A3D62',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(10,61,98,0.35)',
            }}
          >
            <ElectricBolt
              sx={{
                color: '#F0A500',
                fontSize: '1.7rem',
              }}
            />
          </Box>

          <Box sx={{ textAlign: 'left' }}>
            <Typography
              variant="h6"
              color="text.primary"
              sx={{
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              Operational Data Logging System
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
            >
              Power Plant Operations Platform
            </Typography>
          </Box>
        </Box>

        <Typography
          variant="h5"
          color="text.primary"
          gutterBottom
          sx={{ fontWeight: 700 }}
        >
          Welcome Back
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 4 }}
        >
          Sign in with your organization account to access
          the Power Plant Operational Data Logging system.
        </Typography>

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleLogin}
          disabled={loading}
          startIcon={
            loading ? (
              <CircularProgress
                size={18}
                color="inherit"
              />
            ) : (
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
                alt="Microsoft"
                style={{
                  width: 18,
                  height: 18,
                }}
              />
            )
          }
          sx={{
            py: 1.5,
            fontSize: '0.938rem',
          }}
        >
          {loading
            ? 'Signing in...'
            : 'Sign in with Microsoft'}
        </Button>

        <Typography
          variant="caption"
          color="text.disabled"
          sx={{
            display: 'block',
            mt: 3,
          }}
        >
          Authorized personnel only. All activity is
          monitored and logged.
        </Typography>
      </Paper>
    </Box>
  );
}