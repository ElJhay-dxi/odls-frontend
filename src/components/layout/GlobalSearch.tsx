import {
  Box, InputBase, Paper, Popper, List, ListItemButton, ListItemText, Typography, CircularProgress,
  ClickAwayListener, Divider, alpha,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { searchApi, type SearchGroup, type SearchItem } from '../../api/searchApi';

const MIN_CHARS = 2;

export default function GlobalSearch() {
  const navigate = useNavigate();
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [groups, setGroups] = useState<SearchGroup[]>([]);

  // Ctrl/Cmd+K focuses the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Debounced search; stale requests are cancelled.
  useEffect(() => {
    const term = text.trim();
    if (term.length < MIN_CHARS) { setGroups([]); setLoading(false); setError(false); return; }
    setLoading(true); setError(false);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchApi.search(term, 6, controller.signal)
        .then((res) => { setGroups(res.data.groups); setLoading(false); })
        .catch((err) => {
          if (controller.signal.aborted || err?.code === 'ERR_CANCELED') return;
          setError(true); setGroups([]); setLoading(false);
        });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [text]);

  const go = (group: SearchGroup, item: SearchItem) => {
    const params = new URLSearchParams();
    if (item.plantCode) params.set('plant', item.plantCode);
    if (item.date) params.set('date', item.date);
    if (item.id) params.set('record', item.id);
    params.set('q', text.trim()); // the page highlights this text on arrival
    const qs = params.toString();
    navigate(qs ? `${group.route}?${qs}` : group.route);
    setOpen(false);
    inputRef.current?.blur();
  };

  const showPanel = open && text.trim().length >= MIN_CHARS;

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box ref={anchorRef} sx={{ position: 'relative', width: { xs: 160, sm: 320, md: 420 }, mx: 2 }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', px: 1.5, borderRadius: 2,
          backgroundColor: (t) => alpha(t.palette.common.white, 0.15),
          '&:hover, &:focus-within': { backgroundColor: (t) => alpha(t.palette.common.white, 0.25) },
        }}>
          <SearchIcon fontSize="small" />
          <InputBase
            inputRef={inputRef}
            value={text}
            placeholder="Search everything…  (Ctrl+K)"
            onChange={(e) => { setText(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); } }}
            sx={{ color: 'inherit', ml: 1, flex: 1, fontSize: '0.875rem', py: 0.5 }}
          />
          {loading && <CircularProgress size={16} color="inherit" />}
        </Box>

        <Popper open={showPanel} anchorEl={anchorRef.current} placement="bottom-start" style={{ zIndex: 1400 }}
          modifiers={[{ name: 'offset', options: { offset: [0, 6] } }]}>
          <Paper elevation={8} sx={{ width: anchorRef.current?.clientWidth ?? 420, minWidth: 320, maxHeight: '70vh', overflowY: 'auto' }}>
            {error ? (
              <Typography variant="body2" color="error" sx={{ p: 2 }}>Search failed. Please try again.</Typography>
            ) : groups.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                {loading ? 'Searching…' : 'No results in the sections you have access to.'}
              </Typography>
            ) : groups.map((g, gi) => (
              <Box key={g.label}>
                {gi > 0 && <Divider />}
                <Typography variant="caption" sx={{
                  px: 2, pt: 1.25, pb: 0.25, display: 'block', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: 0.8, color: '#00695C',
                }}>
                  {g.label}{g.hasMore ? ' (top results)' : ''}
                </Typography>
                <List dense disablePadding>
                  {g.items.map((it) => (
                    <ListItemButton key={`${g.label}-${it.id}-${it.title}`} onClick={() => go(g, it)}>
                      <ListItemText
                        primary={it.title}
                        secondary={[it.subtitle, it.plantCode, it.date ? dayjs(it.date).format('DD MMM YYYY') : null]
                          .filter(Boolean).join('  ·  ')}
                        slotProps={{ primary: { noWrap: true, fontWeight: 600 }, secondary: { noWrap: true } }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Box>
            ))}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
