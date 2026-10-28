import { useSearchParams } from 'react-router-dom';

/**
 * Values passed by the global search when it opens a page:
 *   /lab/analysis?plant=T1&date=2026-10-06&record=<id>
 * Pages use `plant` and `date` as the initial selection; `record` identifies the exact row.
 */
export function useSearchDeepLink() {
  const [params] = useSearchParams();
  const date = params.get('date');
  const time = params.get('time');
  return {
    plant: params.get('plant') ?? undefined,
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
    record: params.get('record') ?? undefined,
    /** Reading time "HH:mm" for pages with timed readings (e.g. 00:00 / 05:00) */
    time: time && /^\d{2}:\d{2}$/.test(time) ? time : undefined,
  };
}
