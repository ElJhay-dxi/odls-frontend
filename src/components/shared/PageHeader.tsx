import { Box, Typography, Breadcrumbs, Link, Button } from '@mui/material';
import { NavigateNext, Add } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface Breadcrumb {
  label: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

export default function PageHeader({ title, subtitle, breadcrumbs, action }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNext fontSize="small" />}
          sx={{ mb: 1, '& .MuiBreadcrumbs-separator': { color: 'text.disabled' } }}
        >
          {breadcrumbs.map((crumb, index) =>
            crumb.path && index < breadcrumbs.length - 1 ? (
              <Link
                key={crumb.label}
                underline="hover"
                color="text.secondary"
                sx={{ cursor: 'pointer', fontSize: '0.813rem' }}
                onClick={() => crumb.path && navigate(crumb.path)}
              >
                {crumb.label}
              </Link>
            ) : (
              <Typography key={crumb.label} color="text.primary" sx={{ fontSize: '0.813rem', fontWeight: 500 }}>
                {crumb.label}
              </Typography>
            )
          )}
        </Breadcrumbs>
      )}

      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }} color="text.primary" gutterBottom={!!subtitle}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>

        {action && (
          <Button
            variant="contained"
            startIcon={action.icon ?? <Add />}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </Box>
    </Box>
  );
}