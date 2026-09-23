import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../auth/authConfig';
import { useState } from 'react';
import logo from '../../assets/logo.png';

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
        flexDirection: 'row',
      }}
    >
      {/* Left panel — image + gradient, hidden on small screens */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: '0 0 58%',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          p: 6,
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
        }}
      >
        <Box
          component="img"
          src={logo}
          alt="ODLS logo"
          sx={{
            height: 110,
            width: 'auto',
            alignSelf: 'flex-start',
            mb: 3,
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
          }}
        />

        <Typography
          variant="h4"
          sx={{
            color: '#fff',
            fontWeight: 700,
            textShadow: '0 2px 8px rgba(0,0,0,0.35)',
          }}
        >
          Operational Data Logging System
        </Typography>

        <Typography
          variant="subtitle1"
          sx={{
            color: 'rgba(255,255,255,0.9)',
            mt: 1,
            textShadow: '0 1px 6px rgba(0,0,0,0.35)',
          }}
        >
          Power Plant Operations Platform
        </Typography>
      </Box>

      {/* Right panel — login content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'background.default',
          px: { xs: 3, sm: 6, md: 8 },
          py: 5,
        }}
      >
        <Box
          sx={{
            maxWidth: 420,
            width: '100%',
            textAlign: 'center',
          }}
        >
          {/* Logo shown here only on small screens, where the left panel is hidden */}
          <Box
            component="img"
            src={logo}
            alt="ODLS logo"
            sx={{
              display: { xs: 'block', md: 'none' },
              height: 80,
              width: 'auto',
              mx: 'auto',
              mb: 4,
            }}
          />

          <Typography
            variant="h4"
            color="text.primary"
            sx={{ fontWeight: 700, mb: 1.5 }}
          >
            Welcome Back
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 5, lineHeight: 1.7 }}
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

          <Divider sx={{ mt: 5, mb: 2.5 }} />

          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ display: 'block' }}
          >
            Authorized personnel only. All activity is
            monitored and logged.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
