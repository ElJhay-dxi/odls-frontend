// The bell in the top bar: the signed-in user's to-dos (missing readings, pending work-order numbers) and admin items.
// Items come from the server, filtered by the user's permissions and plants; clicking one opens the page at that plant/date.
import {
  Badge, Box, Button, Chip, CircularProgress, Divider, IconButton, List, ListItemButton,
  ListSubheader, Popover, Stack, Tooltip, Typography,
} from '@mui/material';
import {
  Notifications, NotificationsNone, WarningAmber, Schedule, AdminPanelSettings, Refresh, CheckCircleOutlined,
} from '@mui/icons-material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { notificationsApi, type NotificationItem } from '../../api/notificationsApi';

const REFRESH_MS = 2 * 60 * 1000; // check every 2 minutes

export default function NotificationBell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const res = await notificationsApi.get();
      setItems(res.data.items);
      setCheckedAt(res.data.generatedAt);
      setError(false);
    } catch {
      setError(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);

  // On start, every couple of minutes, when the tab regains focus, and after moving between pages (work may be done)
  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [load]);
  useEffect(() => { load(); }, [location.pathname, load]);

  const open = (item: NotificationItem) => {
    setAnchorEl(null);
    navigate(item.link);
  };

  // Urgent admin items (e.g. people waiting for access) go first; informational admin notes last
  const urgentAdmin = items.filter((i) => i.category === 'admin' && i.severity === 'warning');
  const todos = items.filter((i) => i.category === 'todo');
  const admin = items.filter((i) => i.category === 'admin' && i.severity !== 'warning');
  const overdue = items.filter((i) => i.severity === 'warning').length;

  const row = (item: NotificationItem) => (
    <ListItemButton key={item.key} onClick={() => open(item)} alignItems="flex-start" sx={{ py: 1.25, gap: 1.5 }}>
      <Box sx={{ pt: 0.25 }}>
        {item.category === 'admin'
          ? <AdminPanelSettings fontSize="small" color="primary" />
          : item.severity === 'warning'
            ? <WarningAmber fontSize="small" color="warning" />
            : <Schedule fontSize="small" color="action" />}
      </Box>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.title}</Typography>
        {item.detail && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>{item.detail}</Typography>
        )}
      </Box>
      {item.date && (
        <Chip size="small" variant="outlined" label={dayjs(item.date).format('DD MMM')} sx={{ fontSize: 11, height: 20 }} />
      )}
    </ListItemButton>
  );

  return (
    <>
      <Tooltip title={items.length ? `${items.length} notification${items.length === 1 ? '' : 's'}` : 'Notifications'}>
        <IconButton color="inherit" size="small" onClick={(e) => { setAnchorEl(e.currentTarget); load(); }}>
          <Badge badgeContent={items.length} color={overdue > 0 ? 'error' : 'warning'} max={99}>
            {items.length ? <Notifications /> : <NotificationsNone />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 420, maxWidth: 'calc(100vw - 24px)', maxHeight: 520, display: 'flex', flexDirection: 'column' } } }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', px: 2, py: 1.25 }} spacing={1}>
          <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>Notifications</Typography>
          {loading ? <CircularProgress size={16} /> : (
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={load}><Refresh fontSize="small" /></IconButton>
            </Tooltip>
          )}
        </Stack>
        <Divider />

        <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
          {error && items.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Couldn't load notifications.</Typography>
              <Button size="small" onClick={load} sx={{ mt: 1 }}>Try again</Button>
            </Box>
          ) : items.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CheckCircleOutlined color="success" sx={{ fontSize: 36, mb: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>You're all caught up</Typography>
              <Typography variant="caption" color="text.secondary">Nothing is missing or waiting for you.</Typography>
            </Box>
          ) : (
            <List dense disablePadding>
              {urgentAdmin.length > 0 && (
                <>
                  <ListSubheader sx={{ lineHeight: '32px', fontWeight: 700 }}>Needs approval ({urgentAdmin.length})</ListSubheader>
                  {urgentAdmin.map(row)}
                </>
              )}
              {todos.length > 0 && (
                <>
                  <ListSubheader sx={{ lineHeight: '32px', fontWeight: 700 }}>To do ({todos.length})</ListSubheader>
                  {todos.map(row)}
                </>
              )}
              {admin.length > 0 && (
                <>
                  <ListSubheader sx={{ lineHeight: '32px', fontWeight: 700 }}>Admin ({admin.length})</ListSubheader>
                  {admin.map(row)}
                </>
              )}
            </List>
          )}
        </Box>

        {checkedAt && (
          <>
            <Divider />
            <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.75 }}>
              Checked {dayjs(checkedAt).format('HH:mm')} · items clear once the work is done
            </Typography>
          </>
        )}
      </Popover>
    </>
  );
}
