import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  Alert, MenuItem, FormControl, InputLabel, Select, Grid, Chip,
  Stack, Paper, TextField, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Tabs, Tab, Collapse,
} from '@mui/material';
import {
  WaterDrop, Assignment, AccessTime, BarChart, Search,
  Download, PictureAsPdf, ExpandMore, ExpandLess, Assessment,
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { getHydroReportsApi, type HydroReportKind } from '../../api/reports/hydroReportsApi';
import type { PowerPlant } from '../../types/masterData';
import type {
  HydroDailyPlantReportRow, HydroHourlySummaryRow, HydroAvailabilityReport,
} from '../../types/hydroReports';
import { useSectionPermissions, usePlantFilter, usePermission } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

const todayStr = () => new Date().toISOString().split('T')[0];
const daysAgoStr = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

const fmt = (v?: number | null, digits = 2) => (v === null || v === undefined ? '—' : v.toFixed(digits));

const sumBy = (rows: HydroDailyPlantReportRow[], sel: (r: HydroDailyPlantReportRow) => number | undefined) =>
  rows.reduce((acc, r) => acc + (sel(r) ?? 0), 0);
const avgBy = (rows: HydroDailyPlantReportRow[], sel: (r: HydroDailyPlantReportRow) => number | undefined) => {
  const vals = rows.map(sel).filter((v): v is number => v != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
};
const maxBy = (rows: HydroDailyPlantReportRow[], sel: (r: HydroDailyPlantReportRow) => number | undefined) => {
  const vals = rows.map(sel).filter((v): v is number => v != null);
  return vals.length ? Math.max(...vals) : undefined;
};

const TABS: { label: string; icon: React.ReactElement; kind: HydroReportKind }[] = [
  { label: 'Daily Plant Report', icon: <Assignment fontSize="small" />, kind: 'dailyplant' },
  { label: 'Hourly Summary', icon: <AccessTime fontSize="small" />, kind: 'hourlysummary' },
  { label: 'Availability & Outage', icon: <BarChart fontSize="small" />, kind: 'availability' },
];

export default function HydroReportsPage() {
  const { canView } = useSectionPermissions('reports');
  const canExport = usePermission('reports.export');
  const isWrongPlantType = usePlantTypeGuard('hydro');

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [dateFrom, setDateFrom] = useState(daysAgoStr(7));
  const [dateTo, setDateTo] = useState(todayStr());
  const [activeTab, setActiveTab] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const [dailyPlantData, setDailyPlantData] = useState<HydroDailyPlantReportRow[] | null>(null);
  const [hourlyData, setHourlyData] = useState<HydroHourlySummaryRow[] | null>(null);
  const [availabilityData, setAvailabilityData] = useState<HydroAvailabilityReport | null>(null);

  const [availCollapsed, setAvailCollapsed] = useState<Record<string, boolean>>({
    summary: false, availability: false, trips: false, reliability: false,
  });

  useEffect(() => {
    powerPlantApi.getAll().then((res) =>
      setPlants(res.data.filter((p) => p.classificationType?.toLowerCase() === 'hydro'))
    );
  }, []);

  useEffect(() => {
    if (autoPlantCode) setSelectedPlant(autoPlantCode);
  }, [autoPlantCode]);

  const hasResult = activeTab === 0 ? dailyPlantData !== null
    : activeTab === 1 ? hourlyData !== null
    : availabilityData !== null;

  const isEmpty = activeTab === 0 ? dailyPlantData?.length === 0
    : activeTab === 1 ? hourlyData?.length === 0
    : !!availabilityData && availabilityData.availability.length === 0
      && availabilityData.trips.length === 0 && availabilityData.reliability.length === 0;

  const handleGenerate = async () => {
    if (!selectedPlant || !dateFrom || !dateTo) return;
    if (dateFrom > dateTo) { setError('Date From must be on or before Date To.'); return; }

    setLoading(true); setError(null);
    try {
      if (activeTab === 0) {
        const res = await getHydroReportsApi.getDailyPlant(selectedPlant, dateFrom, dateTo);
        setDailyPlantData(res.data);
      } else if (activeTab === 1) {
        const res = await getHydroReportsApi.getHourlySummary(selectedPlant, dateFrom, dateTo);
        setHourlyData(res.data);
      } else {
        const res = await getHydroReportsApi.getAvailability(selectedPlant, dateFrom, dateTo);
        setAvailabilityData(res.data);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!selectedPlant) return;
    setExporting(format); setError(null);
    try {
      const kind = TABS[activeTab].kind;
      const res = format === 'excel'
        ? await getHydroReportsApi.exportExcel(kind, selectedPlant, dateFrom, dateTo)
        : await getHydroReportsApi.exportPdf(kind, selectedPlant, dateFrom, dateTo);

      const blob = new Blob([res.data], {
        type: format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hydro-${kind}-${selectedPlant}-${dateFrom}-to-${dateTo}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError(`Failed to export ${format === 'excel' ? 'Excel' : 'PDF'} report.`);
    } finally {
      setExporting(null);
    }
  };

  const renderCollapsibleSection = (
    key: string, title: string, color: string, children: React.ReactNode,
  ) => (
    <Card sx={{ mb: 3 }}>
      <Box sx={{
        px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', backgroundColor: `${color}14`,
        borderBottom: availCollapsed[key] ? 'none' : '1px solid', borderColor: 'divider',
      }} onClick={() => setAvailCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))}>
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color }}>
          {title}
        </Typography>
        <IconButton size="small">
          {availCollapsed[key] ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
        </IconButton>
      </Box>
      <Collapse in={!availCollapsed[key]}>
        <CardContent>{children}</CardContent>
      </Collapse>
    </Card>
  );

  const renderEmptyState = () => (
    <Card>
      <CardContent sx={{ textAlign: 'center', py: 6 }}>
        <Assessment sx={{ fontSize: '3rem', color: 'text.disabled', mb: 1 }} />
        <Typography variant="body1" color="text.secondary">
          {hasResult && isEmpty
            ? 'No data found for the selected period.'
            : 'Select a plant and date range, then click Generate.'}
        </Typography>
      </CardContent>
    </Card>
  );

  const renderDailyPlantTab = () => {
    if (!hasResult || isEmpty || !dailyPlantData) return renderEmptyState();
    const totals = {
      energyGeneratedKwh: sumBy(dailyPlantData, (r) => r.energyGeneratedKwh),
      totalGenerationMwh: sumBy(dailyPlantData, (r) => r.totalGenerationMwh),
      stationServiceMwh: sumBy(dailyPlantData, (r) => r.stationServiceMwh),
      netGenerationMwh: sumBy(dailyPlantData, (r) => r.netGenerationMwh),
      forebayLevelM: avgBy(dailyPlantData, (r) => r.forebayLevelM),
      tailraceLevelM: avgBy(dailyPlantData, (r) => r.tailraceLevelM),
      netHeadM: avgBy(dailyPlantData, (r) => r.netHeadM),
      peakLoadMw: maxBy(dailyPlantData, (r) => r.peakLoadMw),
    };

    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Energy Generated (kWh)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Total Generation (MWh)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Station Service (MWh)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Net Generation (MWh)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Forebay Level (m)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Tailrace Level (m)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Net Head (m)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Peak Load (MW)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Shift Leader</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dailyPlantData.map((row, idx) => (
              <TableRow key={idx} hover>
                <TableCell>{row.date?.split('T')[0]}</TableCell>
                <TableCell>{fmt(row.energyGeneratedKwh, 0)}</TableCell>
                <TableCell>{fmt(row.totalGenerationMwh)}</TableCell>
                <TableCell>{fmt(row.stationServiceMwh)}</TableCell>
                <TableCell>{fmt(row.netGenerationMwh)}</TableCell>
                <TableCell>{fmt(row.forebayLevelM)}</TableCell>
                <TableCell>{fmt(row.tailraceLevelM)}</TableCell>
                <TableCell>{fmt(row.netHeadM)}</TableCell>
                <TableCell>{fmt(row.peakLoadMw)}</TableCell>
                <TableCell>{row.shiftLeader || '—'}</TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ backgroundColor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700 }}>Totals / Averages</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{fmt(totals.energyGeneratedKwh, 0)}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{fmt(totals.totalGenerationMwh)}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{fmt(totals.stationServiceMwh)}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{fmt(totals.netGenerationMwh)}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{fmt(totals.forebayLevelM)}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{fmt(totals.tailraceLevelM)}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{fmt(totals.netHeadM)}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{fmt(totals.peakLoadMw)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderHourlyTab = () => {
    if (!hasResult || isEmpty || !hourlyData) return renderEmptyState();

    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Hour</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Active Power (MW)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Reactive Power (MVar)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Voltage (kV)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Frequency (Hz)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Power Factor</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Gate Position (%)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {hourlyData.map((row, idx) => {
              const isNewDate = idx === 0 || row.date !== hourlyData[idx - 1].date;
              return (
                <TableRow key={idx} hover sx={{ backgroundColor: isNewDate ? 'inherit' : 'action.hover' }}>
                  <TableCell sx={{ fontWeight: isNewDate ? 700 : 400, color: isNewDate ? 'text.primary' : 'text.disabled' }}>
                    {isNewDate ? row.date?.split('T')[0] : ''}
                  </TableCell>
                  <TableCell>{row.hour}</TableCell>
                  <TableCell>{row.unitName || row.unitCode}</TableCell>
                  <TableCell>{fmt(row.activePowerMW)}</TableCell>
                  <TableCell>{fmt(row.reactivePowerMVar)}</TableCell>
                  <TableCell>{fmt(row.voltageKV)}</TableCell>
                  <TableCell>{fmt(row.frequency)}</TableCell>
                  <TableCell>{fmt(row.powerFactor)}</TableCell>
                  <TableCell>{fmt(row.gatePosition)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderAvailabilityTab = () => {
    if (!hasResult || isEmpty || !availabilityData) return renderEmptyState();
    const { summary, availability, trips, reliability } = availabilityData;

    const metrics = [
      { label: 'Total Service Hrs', value: fmt(summary.totalServiceHours, 1) },
      { label: 'Run Hrs', value: fmt(summary.totalRunHours, 1) },
      { label: 'Forced Outage Hrs', value: fmt(summary.totalForcedOutageHours, 1) },
      { label: 'Total Trips', value: String(summary.totalTrips ?? 0) },
      { label: 'Avg Reliability %', value: fmt(summary.averageStartingReliabilityPct, 1) },
      { label: 'Avg Load Factor %', value: fmt(summary.averageLoadFactorPct, 1) },
    ];

    return (
      <>
        {renderCollapsibleSection('summary', 'Summary', '#1565C0', (
          <Grid container spacing={2}>
            {metrics.map((m) => (
              <Grid key={m.label} size={{ xs: 6, sm: 4, md: 2 }}>
                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {m.label}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{m.value}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        ))}

        {renderCollapsibleSection('availability', 'Daily Availability', '#1B5E20', (
          availability.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>
              No availability data for this period.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Service Hrs</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Run Hrs</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Reserve Shutdown</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Forced Outage</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Maintenance Outage</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Planned Outage</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availability.map((row, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{row.date?.split('T')[0]}</TableCell>
                      <TableCell>{fmt(row.serviceHours, 1)}</TableCell>
                      <TableCell>{fmt(row.runHours, 1)}</TableCell>
                      <TableCell>{fmt(row.reserveShutdownHours, 1)}</TableCell>
                      <TableCell>{fmt(row.forcedOutageHours, 1)}</TableCell>
                      <TableCell>{fmt(row.maintenanceOutageHours, 1)}</TableCell>
                      <TableCell>{fmt(row.plannedOutageHours, 1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        ))}

        {renderCollapsibleSection('trips', 'Plant Trips', '#B71C1C', (
          trips.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>
              No trips recorded for this period.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>PLS</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Shutdown</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Low Load</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>High Load</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Pre-Ign</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Pre-Sync</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Partial</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Full</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trips.map((row, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{row.date?.split('T')[0]}</TableCell>
                      <TableCell>{row.pls ?? '—'}</TableCell>
                      <TableCell>{row.shutdown ?? '—'}</TableCell>
                      <TableCell>{row.lowLoad ?? '—'}</TableCell>
                      <TableCell>{row.highLoad ?? '—'}</TableCell>
                      <TableCell>{row.preIgnition ?? '—'}</TableCell>
                      <TableCell>{row.preSynchronization ?? '—'}</TableCell>
                      <TableCell>{row.partial ?? '—'}</TableCell>
                      <TableCell>{row.full ?? '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{row.total ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        ))}

        {renderCollapsibleSection('reliability', 'Reliability', '#E65100', (
          reliability.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>
              No reliability data for this period.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>MTBF</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Successful Starts</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Unsuccessful Starts</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Start Attempts</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Starting Reliability (%)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reliability.map((row, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{row.date?.split('T')[0]}</TableCell>
                      <TableCell>{fmt(row.mtbf, 1)}</TableCell>
                      <TableCell>{row.successfulStarts ?? '—'}</TableCell>
                      <TableCell>{row.unsuccessfulStarts ?? '—'}</TableCell>
                      <TableCell>{row.startAttempts ?? '—'}</TableCell>
                      <TableCell>{fmt(row.startingReliabilityPct, 1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        ))}
      </>
    );
  };

  const plantDisplayName = availablePlants.find((p) => p.plantCode === selectedPlant)?.plantName ?? selectedPlant;

  return (
    <Box>
      <PageHeader
        title="Hydro Reports"
        subtitle="Daily, hourly and availability reports for hydro power stations"
        breadcrumbs={[{ label: 'Reports' }, { label: 'Hydro Reports' }]}
      />

      {isWrongPlantType && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Your plant assignment is for a thermal plant. You may not have the right data here.
        </Alert>
      )}

      {/* Shared controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: '14px !important' }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <WaterDrop sx={{ color: '#1565C0' }} />
            <FormControl size="small" sx={{ minWidth: 240 }} disabled={plantLocked}>
              <InputLabel>Power Plant</InputLabel>
              <Select label="Power Plant" value={selectedPlant} onChange={(e) => setSelectedPlant(e.target.value)}>
                <MenuItem value="">Select plant…</MenuItem>
                {availablePlants.map((p: PowerPlant) => (
                  <MenuItem key={p.id} value={p.plantCode}>{p.plantName} ({p.plantCode})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Date From" type="date" size="small" value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Date To" type="date" size="small" value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }} />
            {canView && (
              <Button variant="contained" size="small"
                startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <Search />}
                onClick={handleGenerate} disabled={loading || !selectedPlant || !dateFrom || !dateTo}>
                {loading ? 'Generating...' : 'Generate'}
              </Button>
            )}
            {loading && <CircularProgress size={20} />}

            {hasResult && canExport && (
              <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
                <Button variant="outlined" size="small"
                  startIcon={exporting === 'excel' ? <CircularProgress size={14} /> : <Download />}
                  onClick={() => handleExport('excel')} disabled={!!exporting}>
                  Export Excel
                </Button>
                <Button variant="outlined" size="small" color="error"
                  startIcon={exporting === 'pdf' ? <CircularProgress size={14} /> : <PictureAsPdf />}
                  onClick={() => handleExport('pdf')} disabled={!!exporting}>
                  Export PDF
                </Button>
              </Stack>
            )}
          </Stack>
          {selectedPlant && (
            <Chip label={plantDisplayName} size="small" color="primary" variant="outlined" sx={{ mt: 1.5 }} />
          )}
        </CardContent>
      </Card>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ px: 2 }}>
          {TABS.map((t) => (
            <Tab key={t.kind} label={t.label} icon={t.icon} iconPosition="start" sx={{ minHeight: 48 }} />
          ))}
        </Tabs>
      </Card>

      {activeTab === 0 && renderDailyPlantTab()}
      {activeTab === 1 && renderHourlyTab()}
      {activeTab === 2 && renderAvailabilityTab()}
    </Box>
  );
}
