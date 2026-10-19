import { useMemo, useState } from 'react';
import {
  Autocomplete, Box, Button, Checkbox, Chip, FormControlLabel, MenuItem, Stack, Switch, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import type { StationServiceRow } from '../../types/stationService';

export const STATION_SERVICE_STATUSES = ['In Service', 'On Standby', 'Not Available', 'Under Permit'];

export interface TransformerOption {
  equipmentCode: string;
  equipmentName: string;
  groupLabel?: string | null;
}

/** Station service transformers are the TSS / SST units - match on code or name, or an explicit "station service" label. */
export const isStationServiceTransformer = (o: TransformerOption) => {
  const code = (o.equipmentCode ?? '').toLowerCase();
  const name = (o.equipmentName ?? '').toLowerCase();
  const group = (o.groupLabel ?? '').toLowerCase();
  return /tss|sst/.test(code) || /tss|sst/.test(name) || /station[\s-]*service/.test(`${name} ${group}`);
};

interface Props {
  /** Every transformer of the plant from master data; the editor narrows it to TSS */
  options: TransformerOption[];
  rows: StationServiceRow[];
  onChange: (rows: StationServiceRow[]) => void;
  editing: boolean;
}

/** Station service transformers (TSS): pick which are on the log (or all), then give each one a status. */
export default function StationServiceEditor({ options, rows, onChange, editing }: Props) {
  const [showAll, setShowAll] = useState(false);

  const tss = useMemo(() => options.filter(isStationServiceTransformer), [options]);
  const pool = showAll || tss.length === 0 ? options : tss;
  const byCode = useMemo(() => {
    const m = new Map<string, TransformerOption>();
    pool.forEach((o) => m.set(o.equipmentCode, o));
    return m;
  }, [pool]);

  // keep rows that are no longer in the master list selectable, so they can be removed
  const selectedOptions: TransformerOption[] = rows.map((r) => byCode.get(r.equipmentCode) ?? { equipmentCode: r.equipmentCode, equipmentName: r.equipmentName });
  const allOptions = [...pool, ...selectedOptions.filter((s) => !byCode.has(s.equipmentCode))];

  const setSelection = (selected: TransformerOption[]) => {
    onChange(selected.map((o) => rows.find((r) => r.equipmentCode === o.equipmentCode)
      ?? { equipmentCode: o.equipmentCode, equipmentName: o.equipmentName, status: 'In Service', remarks: '' }));
  };
  const patch = (code: string, p: Partial<StationServiceRow>) =>
    onChange(rows.map((r) => (r.equipmentCode === code ? { ...r, ...p } : r)));

  const label = (
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      Station Service (TSS)
    </Typography>
  );

  if (!editing) {
    return (
      <Box>
        {label}
        {rows.length === 0 ? (
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#999', mt: 0.25 }}>Not specified</Typography>
        ) : (
          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
            {rows.map((r) => (
              <Stack key={r.equipmentCode} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip size="small" color="warning" variant="outlined" label={r.equipmentName || r.equipmentCode} />
                <Typography variant="body2">{r.status}</Typography>
                {r.remarks ? <Typography variant="body2" color="text.secondary">– {r.remarks}</Typography> : null}
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {label}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
        <Autocomplete
          multiple size="small" disableCloseOnSelect sx={{ flex: 1, minWidth: 260 }}
          options={allOptions}
          value={selectedOptions}
          onChange={(_, v) => setSelection(v)}
          isOptionEqualToValue={(a, b) => a.equipmentCode === b.equipmentCode}
          getOptionLabel={(o) => o.equipmentName || o.equipmentCode}
          noOptionsText="No station service transformers found for this plant"
          renderOption={(props, o, { selected }) => {
            const { key, ...rest } = props as typeof props & { key: string };
            return (
              <li key={key} {...rest}>
                <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                {o.equipmentName || o.equipmentCode}{o.groupLabel ? <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>{o.groupLabel}</Typography> : null}
              </li>
            );
          }}
          renderTags={() => null}
          renderInput={(p) => <TextField {...p} placeholder={rows.length ? `${rows.length} selected` : 'Select transformers'} />}
        />
        <Button size="small" variant="outlined" disabled={pool.length === 0} onClick={() => setSelection(pool)}>Select all</Button>
        <Button size="small" disabled={rows.length === 0} onClick={() => onChange([])}>Clear</Button>
        {tss.length > 0 && tss.length < options.length && (
          <FormControlLabel control={<Switch size="small" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />}
            label={<Typography variant="caption">Show all transformers</Typography>} />
        )}
      </Stack>
      {tss.length === 0 && options.length > 0 && (
        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
          No transformer is named TSS / SST / "station service" in master data, so all transformers are listed.
        </Typography>
      )}

      {rows.length > 0 && (
        <Table size="small" sx={{ mt: 1 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Transformer</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 190 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.equipmentCode}>
                <TableCell>{r.equipmentName || r.equipmentCode}</TableCell>
                <TableCell>
                  <TextField select size="small" fullWidth value={r.status} onChange={(e) => patch(r.equipmentCode, { status: e.target.value })}>
                    {[...new Set([...STATION_SERVICE_STATUSES, r.status].filter(Boolean))].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </TextField>
                </TableCell>
                <TableCell>
                  <TextField size="small" fullWidth placeholder="Optional" value={r.remarks ?? ''} onChange={(e) => patch(r.equipmentCode, { remarks: e.target.value })} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
