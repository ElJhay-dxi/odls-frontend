import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { vgifApi, type VgifPoint, type VgifSettings } from '../../api/vgif/vgifApi';

const KEY = 'odls.vgif';
const read = (k: string, fallback: string) => { try { return localStorage.getItem(`${KEY}.${k}`) ?? fallback; } catch { return fallback; } };
const write = (k: string, v: string) => { try { localStorage.setItem(`${KEY}.${k}`, v); } catch { /* storage unavailable */ } };

/** Points, settings and the remembered point/date shared by the VGIF pages. */
export function useVgif(kind: 'ag15' | 'ag12') {
  const [points, setPoints] = useState<VgifPoint[]>([]);
  const [settings, setSettings] = useState<VgifSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pointId, setPointIdState] = useState(() => read(`${kind}.point`, ''));
  // AG15 is frozen at 05:00 for the day before, so today's export is normally recorded against yesterday.
  const [date, setDate] = useState(() => dayjs().subtract(kind === 'ag15' ? 1 : 0, 'day').format('YYYY-MM-DD'));
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    Promise.all([vgifApi.getPoints(), vgifApi.getSettings()])
      .then(([p, s]) => {
        setPoints(p.data); setSettings(s.data);
        const eligible = p.data.filter((x) => x.isActive && (kind === 'ag15' ? x.hasAg15 : x.hasAg12));
        setPointIdState((cur) => (eligible.some((x) => x.id === cur) ? cur : eligible[0]?.id ?? ''));
      })
      .catch(() => setLoadError('Could not load the VGIF metering points.'));
  }, [kind]);

  const setPointId = useCallback((id: string) => { setPointIdState(id); write(`${kind}.point`, id); }, [kind]);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return { points, settings, loadError, pointId, setPointId, date, setDate, refreshKey, refresh };
}
