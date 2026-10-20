// Extra hourly readings set up in Hourly Readings → Hourly Extra Fields, shared by the thermal and hydro hourly pages.
import {
  Alert, Box, Chip, Collapse, Grid, IconButton, MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { hourlyExtraFieldApi } from '../../api/masterData/hourlyExtraFieldApi';
import type {
  HourlyExtraField, HourlyExtraFieldValue, HourlyExtraFieldValueInput, LookupOption,
} from '../../types/hourlyExtraField';

const sameSection = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export interface HourlyExtraFieldsState {
  /** Active fields that apply to the selected plant. */
  fields: HourlyExtraField[];
  /** Values keyed by field ID (lookup fields hold the picked record's ID). */
  values: Record<string, string>;
  setValue: (fieldId: string, value: string) => void;
  /** Choices for each lookup field, keyed by field ID. */
  lookupOptions: Record<string, LookupOption[]>;
  /** Fields whose section matches a built-in section title. */
  inSection: (title: string) => HourlyExtraField[];
  /** Fill the inputs from a reading being edited. */
  loadFrom: (saved?: HourlyExtraFieldValue[]) => void;
  reset: () => void;
  /** Labels of required fields left blank (none while the unit is down). */
  missingRequired: (unitDown: boolean) => string[];
  /** Values to send with the reading — every active field (blank = cleared). */
  payload: () => HourlyExtraFieldValueInput[];
}

/**
 * Loads the extra fields for the plant on the form, their lookup choices, and keeps their values.
 * Values are cleared when the plant changes on a new reading; unit-level lookup picks when the unit changes.
 */
export function useHourlyExtraFields(
  logType: 'thermal' | 'hydro', plantCode: string, unitCode: string, editing: boolean,
): HourlyExtraFieldsState {
  const [fields, setFields] = useState<HourlyExtraField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [lookupOptions, setLookupOptions] = useState<Record<string, LookupOption[]>>({});

  useEffect(() => {
    if (!editing) setValues({});
    if (!plantCode) { setFields([]); return; }
    hourlyExtraFieldApi.getAll({ plantCode, logType, activeOnly: true })
      .then((res) => setFields(res.data))
      .catch(() => setFields([]));
  }, [plantCode, logType]);

  useEffect(() => {
    if (editing) return;
    setValues((prev) => {
      const next = { ...prev };
      fields.filter((f) => f.fieldType === 'lookup' && f.lookupScope === 'unit').forEach((f) => { delete next[f.id]; });
      return next;
    });
  }, [unitCode]);

  useEffect(() => {
    const lookups = fields.filter((f) => f.fieldType === 'lookup' && f.lookupSource);
    if (!plantCode || lookups.length === 0) { setLookupOptions({}); return; }
    let cancelled = false;
    const load = async (f: HourlyExtraField): Promise<[string, LookupOption[]]> => {
      if (f.lookupScope === 'unit' && !unitCode) return [f.id, []];
      try {
        const res = await hourlyExtraFieldApi.getLookupOptions({
          source: f.lookupSource as string, plantCode, unitCode: unitCode || undefined,
        });
        return [f.id, res.data];
      } catch { return [f.id, []]; }
    };
    Promise.all(lookups.map(load)).then((pairs) => { if (!cancelled) setLookupOptions(Object.fromEntries(pairs)); });
    return () => { cancelled = true; };
  }, [fields, plantCode, unitCode]);

  return {
    fields,
    values,
    lookupOptions,
    setValue: (fieldId, value) => setValues((prev) => ({ ...prev, [fieldId]: value })),
    inSection: (title) => fields.filter((f) => sameSection(f.section, title)),
    loadFrom: (saved) => {
      const vals: Record<string, string> = {};
      (saved ?? []).forEach((v) => {
        vals[v.fieldId] = v.refId ? v.refId : v.numberValue != null ? String(v.numberValue) : (v.textValue ?? '');
      });
      setValues(vals);
    },
    reset: () => setValues({}),
    missingRequired: (unitDown) => unitDown ? [] : fields
      .filter((f) => f.isRequired && !(values[f.id] ?? '').trim())
      .map((f) => f.label),
    payload: () => fields.map((f) => {
      const raw = (values[f.id] ?? '').trim();
      if (f.fieldType === 'number') return { fieldId: f.id, numberValue: raw === '' || isNaN(Number(raw)) ? null : Number(raw) };
      if (f.fieldType === 'lookup') return { fieldId: f.id, refId: raw || null };
      return { fieldId: f.id, textValue: raw || null };
    }),
  };
}

interface InputContext {
  state: HourlyExtraFieldsState;
  unitDown: boolean;
  /** A unit is chosen on the form (unit-level lookups need one). */
  unitSelected: boolean;
  /** Values of the reading being edited (to show a lookup pick whose record was since removed). */
  savedValues?: HourlyExtraFieldValue[];
}

/** One extra field as a grid cell: number / text box, own-options dropdown, or master-data dropdown. */
export function ExtraFieldInput({ field: f, state, unitDown, unitSelected, savedValues }: InputContext & { field: HourlyExtraField }) {
  const value = state.values[f.id] ?? '';
  const setValue = (v: string) => state.setValue(f.id, v);
  const required = f.isRequired && !unitDown;

  if (f.fieldType === 'lookup') {
    const options = state.lookupOptions[f.id] ?? [];
    const saved = savedValues?.find((v) => v.fieldId === f.id && v.refId === value);
    const noUnit = f.lookupScope === 'unit' && !unitSelected;
    return (
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <TextField select label={f.label} size="small" fullWidth required={required}
          disabled={noUnit} value={value} onChange={(e) => setValue(e.target.value)}
          helperText={noUnit ? 'Select a unit first' : options.length === 0 ? 'Nothing set up for this in Master Data yet' : undefined}>
          <MenuItem value=""><em>Not recorded</em></MenuItem>
          {options.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
          {value && !options.some((o) => o.id === value) && (
            <MenuItem value={value}>{saved?.textValue ?? 'Previously selected'}</MenuItem>
          )}
        </TextField>
      </Grid>
    );
  }

  if (f.fieldType === 'select') {
    return (
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <TextField select label={f.label} size="small" fullWidth required={required}
          value={value} onChange={(e) => setValue(e.target.value)}>
          <MenuItem value=""><em>Not recorded</em></MenuItem>
          {f.options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          {value && !f.options.includes(value) && <MenuItem value={value}>{value}</MenuItem>}
        </TextField>
      </Grid>
    );
  }

  const num = value.trim() === '' ? null : Number(value);
  const outOfRange = f.fieldType === 'number' && num != null && !isNaN(num) &&
    ((f.minValue != null && num < f.minValue) || (f.maxValue != null && num > f.maxValue));
  const rangeHint = f.minValue != null && f.maxValue != null ? `Expected ${f.minValue} – ${f.maxValue}`
    : f.minValue != null ? `Expected at least ${f.minValue}` : `Expected at most ${f.maxValue}`;
  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <TextField label={f.label} type={f.fieldType === 'number' ? 'number' : 'text'} size="small" fullWidth
        required={required} value={value} onChange={(e) => setValue(e.target.value)}
        error={outOfRange} helperText={outOfRange ? rangeHint : undefined}
        slotProps={{
          input: f.measureUnit
            ? { endAdornment: <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, whiteSpace: 'nowrap' }}>{f.measureUnit}</Typography> }
            : undefined,
          htmlInput: f.fieldType === 'text' ? { maxLength: 500 } : undefined,
        }}
      />
    </Grid>
  );
}

/**
 * Extra fields whose section isn't one of the page's built-in sections, each in its own collapsible block,
 * plus (when editing) values of fields that no longer apply, shown read-only.
 */
export function ExtraFieldSections({
  builtInTitles, collapsed, onToggle, ...ctx
}: InputContext & { builtInTitles: string[]; collapsed: Record<string, boolean>; onToggle: (key: string) => void }) {
  const { state, savedValues } = ctx;
  const custom = Array.from(new Set(
    state.fields.filter((f) => !builtInTitles.some((t) => sameSection(t, f.section))).map((f) => f.section.trim()),
  ));
  const retired = (savedValues ?? []).filter((v) => !state.fields.some((f) => f.id === v.fieldId));

  return (
    <>
      {custom.map((title) => {
        const key = `extra:${title.toLowerCase()}`;
        const fields = state.fields.filter((f) => sameSection(f.section, title));
        return (
          <Paper key={key} variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{
              px: 2, py: 1.2, backgroundColor: '#5D403714',
              borderBottom: collapsed[key] ? 'none' : '1px solid', borderColor: 'divider',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
            }} onClick={() => onToggle(key)}>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#5D4037' }}>
                  {title}
                </Typography>
                <Chip label={`${fields.filter((f) => (state.values[f.id] ?? '').trim() !== '').length}/${fields.length}`} size="small"
                  sx={{ height: 18, fontSize: 11, backgroundColor: '#5D403722', color: '#5D4037' }} />
              </Stack>
              <IconButton size="small">
                {collapsed[key] ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
              </IconButton>
            </Box>
            <Collapse in={!collapsed[key]}>
              <Box sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  {fields.map((f) => <ExtraFieldInput key={f.id} field={f} {...ctx} />)}
                </Grid>
              </Box>
            </Collapse>
          </Paper>
        );
      })}

      {retired.length > 0 && (
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Retired fields on this reading (kept as recorded)</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
            {retired.map((v) => (
              <Chip key={v.fieldId} size="small" variant="outlined"
                label={`${v.label}: ${v.numberValue ?? v.textValue ?? '—'}${v.measureUnit && v.numberValue != null ? ` ${v.measureUnit}` : ''}`} />
            ))}
          </Stack>
        </Alert>
      )}
    </>
  );
}
