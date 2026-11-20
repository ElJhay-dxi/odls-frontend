import { useEffect, useState } from 'react';
import { Link, Typography } from '@mui/material';
import dayjs from 'dayjs';
import axiosInstance from '../../api/axiosInstance';
import { fmt } from '../../api/vgif/vgifApi';

interface Suggestion { enabled: boolean; pointCode?: string; date?: string; btuPerScf?: number | null }

/** Offers the VGIF heating value for the log date as a one-click suggestion (only when switched on in VGIF Settings). */
export default function VgifHeatingValueHint({ date, onUse }: { date: string; onUse: (value: string) => void }) {
  const [s, setS] = useState<Suggestion | null>(null);
  useEffect(() => {
    if (!date) { setS(null); return; }
    let live = true;
    axiosInstance.get<Suggestion>('/vgif/heating-value', { params: { date: date.slice(0, 10) } })
      .then((r) => { if (live) setS(r.data); }).catch(() => { if (live) setS(null); });
    return () => { live = false; };
  }, [date]);

  if (!s?.enabled) return null;
  if (s.btuPerScf == null) {
    return <Typography variant="caption" color="text.secondary">No VGIF {s.pointCode} reading for {dayjs(date).format('DD MMM')} yet.</Typography>;
  }
  return (
    <Typography variant="caption" color="text.secondary">
      VGIF {s.pointCode} ({dayjs(date).format('DD MMM')}, HHV): {fmt(s.btuPerScf, 2)} BTU/scf.{' '}
      <Link component="button" type="button" variant="caption" onClick={() => onUse(String(s.btuPerScf))}>Use this value</Link>
    </Typography>
  );
}
