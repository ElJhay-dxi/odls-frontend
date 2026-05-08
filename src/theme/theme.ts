import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0A3D62',       // Deep navy — power/authority
      light: '#1565C0',
      dark: '#051E31',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#F0A500',       // Amber — energy/generation
      light: '#FFD04D',
      dark: '#B87800',
      contrastText: '#000000',
    },
    background: {
      default: '#F4F6F9',
      paper: '#FFFFFF',
    },
    success: {
      main: '#2E7D32',
    },
    warning: {
      main: '#ED6C02',
    },
    error: {
      main: '#D32F2F',
    },
    text: {
      primary: '#1A1A2E',
      secondary: '#546E7A',
    },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.5px' },
    h2: { fontWeight: 700, letterSpacing: '-0.3px' },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.3px',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#0A3D62',
          boxShadow: '0 2px 8px rgba(10,61,98,0.3)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#051E31',
          color: '#FFFFFF',
          borderRight: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          borderRadius: 6,
          padding: '8px 20px',

          ...(ownerState.variant === 'contained' &&
            ownerState.color === 'primary' && {
            boxShadow: '0 2px 6px rgba(10,61,98,0.4)',

            '&:hover': {
              boxShadow: '0 4px 12px rgba(10,61,98,0.5)',
            },
          }),
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          borderRadius: 10,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#0A3D62',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '0.813rem',
            letterSpacing: '0.5px',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:nth-of-type(even)': {
            backgroundColor: '#F8FAFC',
          },
          '&:hover': {
            backgroundColor: '#EEF4FB !important',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
        variant: 'outlined',
      },
    },
    MuiFormControl: {
      defaultProps: {
        size: 'small',
      },
    },
  },
});

export default theme;