import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import { CheckCircle, RadioButtonUnchecked, Schedule } from '@mui/icons-material';
import dayjs from 'dayjs';
import { vgifApi, fmt, type VgifChecklistItem, type VgifKind } from '../../api/vgif/vgifApi';

interface Props {
  date: string;
  /** Bump to reload after an import. */
  refreshKey: number;
  /** Which part to emphasise; both are always shown. */
  focus: VgifKind;
  onPick?: (pointId: string) => void;
  selectedPointId?: string;
}

/** Which metering points already have readings stored for the day. */
export default function VgifChecklist({ date, refreshKey, focus, onPick, selectedPointId }: Props) {
  const [items, setItems] = useState<VgifChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) return;
    let live = true;
    setLoading(true);
    vgifApi.checklist(date)
      .then((r) => { if (live) setItems(r.data); })
      .catch(() => { if (live) setItems([]); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [date, refreshKey]);

  const ag15Due = items.filter((i) => i.hasAg15);
  const ag12Due = items.filter((i) => i.hasAg12);
  const done15 = ag15Due.filter((i) => i.ag15Done).length;
  const done12 = ag12Due.filter((i) => i.ag12Rows >= i.ag12Expected).length;

  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Recorded for {dayjs(date).format('DD MMM YYYY')}</Typography>
          <Typography variant="caption" color="text.secondary">
            AG15 {done15}/{ag15Due.length} · AG12 {done12}/{ag12Due.length}
          </Typography>
        </Stack>
        {loading && <LinearProgress sx={{ mb: 1 }} />}
        <Stack spacing={0.5}>
          {items.map((i) => {
            const pct = i.ag12Expected ? Math.min(100, (i.ag12Rows / i.ag12Expected) * 100) : 0;
            return (
              <Box key={i.pointId} onClick={() => onPick?.(i.pointId)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.75, borderRadius: 1,
                  cursor: onPick ? 'pointer' : 'default',
                  bgcolor: selectedPointId === i.pointId ? 'action.selected' : 'transparent',
                  '&:hover': onPick ? { bgcolor: 'action.hover' } : undefined,
                }}>
                <Typography variant="body2" sx={{ fontWeight: 600, width: 64 }}>{i.pointCode}</Typography>
                <Box sx={{ flex: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  {i.hasAg15 && (
                    <Tooltip title={i.ag15Done ? `Consumption ${fmt(i.ag15Consumption, 0)} MMBtu` : 'AG15 daily reading not recorded yet'}>
                      <Chip size="small" variant={focus === 'ag15' ? 'filled' : 'outlined'}
                        color={i.ag15Done ? 'success' : 'default'}
                        icon={i.ag15Done ? <CheckCircle /> : <RadioButtonUnchecked />}
                        label={i.ag15Done ? `AG15 · ${fmt(i.ag15Consumption, 0)}` : 'AG15'} />
                    </Tooltip>
                  )}
                  {i.hasAg12 && (
                    <Tooltip title={`${i.ag12Rows} of ${i.ag12Expected} five-minute readings`}>
                      <Chip size="small" variant={focus === 'ag12' ? 'filled' : 'outlined'}
                        color={i.ag12Rows >= i.ag12Expected ? 'success' : i.ag12Rows > 0 ? 'warning' : 'default'}
                        icon={i.ag12Rows >= i.ag12Expected ? <CheckCircle /> : i.ag12Rows > 0 ? <Schedule /> : <RadioButtonUnchecked />}
                        label={`AG12 · ${Math.round(pct)}%`} />
                    </Tooltip>
                  )}
                </Box>
              </Box>
            );
          })}
          {!loading && items.length === 0 && (
            <Typography variant="body2" color="text.secondary">No metering points set up yet (VGIF Settings).</Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
