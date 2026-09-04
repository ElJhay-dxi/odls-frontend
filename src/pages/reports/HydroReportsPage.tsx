import {
  Box, Card, CardContent, CardHeader, Typography, Button, CircularProgress,
  Alert, MenuItem, FormControl, InputLabel, Select, Grid, Chip,
  Stack, TextField, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Tabs, Tab, Collapse, Skeleton, Divider,
  Menu, ListItemIcon, ListItemText,
} from '@mui/material';
import {
  WaterDrop, Assignment, AccessTime, BarChart as BarChartIcon, TableChart,
  PictureAsPdf, ExpandMore, ExpandLess, ArrowDropDown, InsertChartOutlined, TableRows,
} from '@mui/icons-material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, LabelList,
} from 'recharts';
import PageHeader from '../../components/shared/PageHeader';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { getHydroReportsApi, type HydroReportKind } from '../../api/reports/hydroReportsApi';
import type { PowerPlant } from '../../types/masterData';
import type {
  HydroDailyPlantReportRow, HydroHourlySummaryRow, HydroAvailabilityReport,
} from '../../types/hydroReports';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

// ─── Formatting helpers ──────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];
const daysAgoStr = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};
const shortDate = (iso: string) =>
  new Date(`${iso.split('T')[0]}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

const fmtInt = (v?: number | null) => (v === null || v === undefined ? '—' : v.toLocaleString());
const fmt = (v?: number | null, digits = 2) => (v === null || v === undefined ? '—' : v.toFixed(digits));
const fmtPct = (v?: number | null, digits = 1) => (v === null || v === undefined ? '—' : `${v.toFixed(digits)}%`);

const sumOf = (vals: (number | undefined)[]) => vals.reduce((acc: number, v) => acc + (v ?? 0), 0);
const avgOf = (vals: (number | undefined)[]) => {
  const nums = vals.filter((v): v is number => v != null);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : undefined;
};
const maxOf = (vals: (number | undefined)[]) => {
  const nums = vals.filter((v): v is number => v != null);
  return nums.length ? Math.max(...nums) : undefined;
};

const UNIT_COLORS = ['#1565C0', '#1B5E20', '#E65100', '#7B1FA2', '#00838F', '#FFA000'];

const TABS: { label: string; icon: React.ReactElement; kind: HydroReportKind }[] = [
  { label: 'Daily Plant Report', icon: <Assignment fontSize="small" />, kind: 'dailyplant' },
  { label: 'Hourly Summary', icon: <AccessTime fontSize="small" />, kind: 'hourlysummary' },
  { label: 'Availability & Outage', icon: <BarChartIcon fontSize="small" />, kind: 'availability' },
];

// ─── PDF builders (kept outside the component so the component body stays small
// enough for React Compiler to keep memoizing the chart data hooks) ──────────
async function buildChartPdf(node: HTMLElement, filename: string) {
  const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  const pageHeight = pdf.internal.pageSize.getHeight();
  let heightLeft = pdfHeight;
  let position = 0;
  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
  heightLeft -= pageHeight;
  while (heightLeft > 0) {
    position = heightLeft - pdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
  }
  pdf.save(filename);
}

function buildDataPdf(params: {
  activeTab: number;
  plantCode: string;
  plantLabel: string;
  dateFrom: string;
  dateTo: string;
  dailyPlantData: HydroDailyPlantReportRow[] | null;
  filteredHourlyData: HydroHourlySummaryRow[];
  availabilityData: HydroAvailabilityReport | null;
}) {
  const { activeTab, plantCode, plantLabel, dateFrom, dateTo, dailyPlantData, filteredHourlyData, availabilityData } = params;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageHeight = doc.internal.pageSize.getHeight();
  const finalY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  doc.setFontSize(14);
  doc.text(`Hydro ${TABS[activeTab].label}`, 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`${plantLabel}   |   ${dateFrom} to ${dateTo}`, 14, 21);
  doc.setTextColor(0);

  if (activeTab === 0 && dailyPlantData) {
    const totals = {
      energyGeneratedKwh: sumOf(dailyPlantData.map((r) => r.energyGeneratedKwh)),
      totalGenerationMwh: sumOf(dailyPlantData.map((r) => r.totalGenerationMwh)),
      stationServiceMwh: sumOf(dailyPlantData.map((r) => r.stationServiceMwh)),
      netGenerationMwh: sumOf(dailyPlantData.map((r) => r.netGenerationMwh)),
      forebayLevelM: avgOf(dailyPlantData.map((r) => r.forebayLevelM)),
      tailraceLevelM: avgOf(dailyPlantData.map((r) => r.tailraceLevelM)),
      netHeadM: avgOf(dailyPlantData.map((r) => r.netHeadM)),
      peakLoadMw: maxOf(dailyPlantData.map((r) => r.peakLoadMw)),
    };
    autoTable(doc, {
      startY: 26,
      head: [['Date', 'Energy (kWh)', 'Total Gen (MWh)', 'Stn Service (MWh)', 'Net Gen (MWh)',
        'Forebay (m)', 'Tailrace (m)', 'Net Head (m)', 'Peak Load (MW)', 'Shift Leader']],
      body: dailyPlantData.map((r) => [
        r.date?.split('T')[0], fmtInt(r.energyGeneratedKwh), fmt(r.totalGenerationMwh),
        fmt(r.stationServiceMwh), fmt(r.netGenerationMwh), fmt(r.forebayLevelM),
        fmt(r.tailraceLevelM), fmt(r.netHeadM), fmt(r.peakLoadMw), r.shiftLeader || '—',
      ]),
      foot: [['Totals / Averages', fmtInt(totals.energyGeneratedKwh), fmt(totals.totalGenerationMwh),
        fmt(totals.stationServiceMwh), fmt(totals.netGenerationMwh), fmt(totals.forebayLevelM),
        fmt(totals.tailraceLevelM), fmt(totals.netHeadM), fmt(totals.peakLoadMw), '']],
      showFoot: 'lastPage',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [21, 101, 192] },
      footStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold' },
    });
  } else if (activeTab === 1) {
    autoTable(doc, {
      startY: 26,
      head: [['Date', 'Hour', 'Unit', 'Active (MW)', 'Reactive (MVar)', 'Voltage (kV)', 'Frequency', 'PF', 'Gate (%)']],
      body: filteredHourlyData.map((r, idx) => {
        const isNewDate = idx === 0 || r.date !== filteredHourlyData[idx - 1].date;
        return [
          isNewDate ? r.date?.split('T')[0] : '', String(r.hour), r.unitName || r.unitCode,
          fmt(r.activePowerMW), fmt(r.reactivePowerMVar), fmt(r.voltageKV),
          fmt(r.frequency), fmt(r.powerFactor, 3), fmt(r.gatePosition),
        ];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [21, 101, 192] },
    });
  } else if (activeTab === 2 && availabilityData) {
    const { summary, availability, trips, reliability } = availabilityData;
    let y = 26;
    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - 15) { doc.addPage(); y = 15; }
    };

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value']],
      body: [
        ['Total Service Hours', fmt(summary.totalServiceHours, 1)],
        ['Total Run Hours', fmt(summary.totalRunHours, 1)],
        ['Total Forced Outage Hours', fmt(summary.totalForcedOutageHours, 1)],
        ['Total Maintenance Outage Hours', fmt(summary.totalMaintenanceOutageHours, 1)],
        ['Total Planned Outage Hours', fmt(summary.totalPlannedOutageHours, 1)],
        ['Total Trips', String(summary.totalTrips ?? 0)],
        ['Avg Starting Reliability', fmtPct(summary.averageStartingReliabilityPct)],
        ['Avg Load Factor', fmtPct(summary.averageLoadFactorPct)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [21, 101, 192] },
      tableWidth: 100,
    });
    y = finalY() + 10;

    ensureSpace(20);
    doc.setFontSize(11); doc.text('Daily Availability', 14, y); y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Service', 'Run', 'Reserve Shutdown', 'Forced Outage', 'Maintenance', 'Planned']],
      body: availability.map((r) => [
        r.date?.split('T')[0], fmt(r.serviceHours, 1), fmt(r.runHours, 1), fmt(r.reserveShutdownHours, 1),
        fmt(r.forcedOutageHours, 1), fmt(r.maintenanceOutageHours, 1), fmt(r.plannedOutageHours, 1),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [27, 94, 32] },
    });
    y = finalY() + 10;

    ensureSpace(20);
    doc.setFontSize(11); doc.text('Plant Trips', 14, y); y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Date', 'PLS', 'Shutdown', 'Low Load', 'High Load', 'Pre-Ign', 'Pre-Sync', 'Partial', 'Full', 'Total']],
      body: trips.map((r) => [
        r.date?.split('T')[0], String(r.pls ?? '—'), String(r.shutdown ?? '—'), String(r.lowLoadTrip ?? '—'),
        String(r.highLoadTrip ?? '—'), String(r.preIgnition ?? '—'), String(r.preSync ?? '—'),
        String(r.partialLoadTrip ?? '—'), String(r.fullLoadTrip ?? '—'), String(r.totalTrips ?? '—'),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [183, 28, 28] },
    });
    y = finalY() + 10;

    ensureSpace(20);
    doc.setFontSize(11); doc.text('Reliability Metrics', 14, y); y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Date', 'MTBF', 'Successful Starts', 'Unsuccessful', 'Attempts', 'Reliability %']],
      body: reliability.map((r) => [
        r.date?.split('T')[0], fmt(r.mtbf, 1), String(r.successfulStarts ?? '—'),
        String(r.unsuccessfulStarts ?? '—'), String(r.startAttempts ?? '—'), fmt(r.startingReliabilityPct, 1),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [230, 81, 0] },
    });
  }

  doc.save(`HydroReport_${TABS[activeTab].kind}_Data_${plantCode}_${dateFrom}_${dateTo}.pdf`);
}

// ─── Reusable presentational pieces ──────────────────────────────────────────
function MetricCard({ label, value, unit, color }: { label: string; value: string; unit?: string; color: string }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderLeft: `4px solid ${color}`, height: '100%' }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary"
          sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, display: 'block' }}>
          {label}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
          {value}
          {unit && <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.75 }}>{unit}</Typography>}
        </Typography>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, height = 260, children }: { title: string; height?: number; children: React.ReactNode }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardHeader
        title={
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            {title}
          </Typography>
        }
        sx={{ pb: 0 }}
      />
      <CardContent>
        <Box sx={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}

function CollapsibleCard({
  title, defaultCollapsed = true, headerColor = '#1565C0', children,
}: { title: string; defaultCollapsed?: boolean; headerColor?: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{
        px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', backgroundColor: `${headerColor}0F`,
        borderBottom: collapsed ? 'none' : '1px solid', borderColor: 'divider',
      }} onClick={() => setCollapsed((p) => !p)}>
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: headerColor }}>
          {title}
        </Typography>
        <IconButton size="small">
          {collapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
        </IconButton>
      </Box>
      <Collapse in={!collapsed}>
        <CardContent>{children}</CardContent>
      </Collapse>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[0, 1, 2, 3].map((i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <Skeleton variant="rectangular" height={104} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}><Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} /></Grid>
        <Grid size={{ xs: 12 }}><Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} /></Grid>
      </Grid>
    </Box>
  );
}

function EmptyState({ variant }: { variant: 'initial' | 'noData' }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ textAlign: 'center', py: 8 }}>
        {variant === 'initial'
          ? <WaterDrop sx={{ fontSize: 80, color: '#1565C0', opacity: 0.3, mb: 2 }} />
          : <BarChartIcon sx={{ fontSize: 80, color: '#1565C0', opacity: 0.3, mb: 2 }} />}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
          {variant === 'initial' ? 'Select a plant and date range' : 'No data found for the selected period.'}
        </Typography>
        {variant === 'initial' && (
          <Typography variant="body2" color="text.secondary">
            Choose your filters above and click Generate to load the report.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function HydroReportsPage() {
  const navigate = useNavigate();
  const isWrongPlantType = usePlantTypeGuard('hydro');
  const { canView, canExport } = useSectionPermissions('reports');

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [dateFrom, setDateFrom] = useState(daysAgoStr(7));
  const [dateTo, setDateTo] = useState(todayStr());
  const [activeTab, setActiveTab] = useState(0);
  const [selectedHourlyDate, setSelectedHourlyDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState<'chart' | 'data' | null>(null);
  const [pdfMenuAnchor, setPdfMenuAnchor] = useState<HTMLElement | null>(null);

  const [dailyPlantData, setDailyPlantData] = useState<HydroDailyPlantReportRow[] | null>(null);
  const [hourlyData, setHourlyData] = useState<HydroHourlySummaryRow[] | null>(null);
  const [availabilityData, setAvailabilityData] = useState<HydroAvailabilityReport | null>(null);

  // Scoped to the metric cards + charts section only (not the raw data tables),
  // so the "Chart" PDF export captures the visual dashboard, not the tabular data.
  const chartsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    powerPlantApi.getAll().then((res) =>
      setPlants(res.data.filter((p) => p.classificationType?.toLowerCase() === 'hydro'))
    );
  }, []);

  useEffect(() => {
    if (autoPlantCode) setSelectedPlant(autoPlantCode);
  }, [autoPlantCode]);

  const handleGenerate = async () => {
    if (!selectedPlant || !dateFrom || !dateTo) return;
    if (dateFrom > dateTo) { setError('Date From must be on or before Date To.'); return; }

    setLoading(true); setError(null);
    try {
      const [dailyRes, hourlyRes, availRes] = await Promise.all([
        getHydroReportsApi.getDailyPlant(selectedPlant, dateFrom, dateTo),
        getHydroReportsApi.getHourlySummary(selectedPlant, dateFrom, dateTo),
        getHydroReportsApi.getAvailability(selectedPlant, dateFrom, dateTo),
      ]);
      setDailyPlantData(dailyRes.data);
      setHourlyData(hourlyRes.data);
      setAvailabilityData(availRes.data);
      setSelectedHourlyDate('');
      setHasGenerated(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!selectedPlant) return;
    getHydroReportsApi.exportExcel(TABS[activeTab].kind, selectedPlant, dateFrom, dateTo);
  };

  const handleExportPdfChart = async () => {
    setPdfMenuAnchor(null);
    if (!chartsRef.current) return;
    setExportingPdf('chart');
    try {
      await buildChartPdf(chartsRef.current,
        `HydroReport_${TABS[activeTab].kind}_Chart_${selectedPlant}_${dateFrom}_${dateTo}.pdf`);
    } catch {
      setError('Failed to export chart PDF.');
    } finally {
      setExportingPdf(null);
    }
  };

  const handleExportPdfData = () => {
    setPdfMenuAnchor(null);
    if (!hasGenerated) return;
    setExportingPdf('data');
    try {
      buildDataPdf({
        activeTab,
        plantCode: selectedPlant,
        plantLabel: plantDisplayName || selectedPlant,
        dateFrom,
        dateTo,
        dailyPlantData,
        filteredHourlyData,
        availabilityData,
      });
    } catch {
      setError('Failed to export data PDF.');
    } finally {
      setExportingPdf(null);
    }
  };

  // ── Tab 1: Daily Plant Report ──────────────────────────────────────────────
  const dailyChartData = useMemo(() => (dailyPlantData ?? []).map((r) => ({
    date: shortDate(r.date),
    energyGeneratedKwh: r.energyGeneratedKwh ?? undefined,
    netGenerationMwh: r.netGenerationMwh ?? undefined,
    forebayLevelM: r.forebayLevelM ?? undefined,
    tailraceLevelM: r.tailraceLevelM ?? undefined,
  })), [dailyPlantData]);

  const renderDailyPlantTab = () => {
    if (loading) return <LoadingSkeleton />;
    if (!hasGenerated) return <EmptyState variant="initial" />;
    if (!dailyPlantData || dailyPlantData.length === 0) return <EmptyState variant="noData" />;

    const totals = {
      energyGeneratedKwh: sumOf(dailyPlantData.map((r) => r.energyGeneratedKwh)),
      totalGenerationMwh: sumOf(dailyPlantData.map((r) => r.totalGenerationMwh)),
      stationServiceMwh: sumOf(dailyPlantData.map((r) => r.stationServiceMwh)),
      netGenerationMwh: sumOf(dailyPlantData.map((r) => r.netGenerationMwh)),
      forebayLevelM: avgOf(dailyPlantData.map((r) => r.forebayLevelM)),
      tailraceLevelM: avgOf(dailyPlantData.map((r) => r.tailraceLevelM)),
      netHeadM: avgOf(dailyPlantData.map((r) => r.netHeadM)),
      peakLoadMw: maxOf(dailyPlantData.map((r) => r.peakLoadMw)),
    };

    return (
      <Box>
        <div ref={chartsRef} style={{ backgroundColor: '#fff' }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Total Energy Generated" value={fmtInt(totals.energyGeneratedKwh)} unit="kWh" color="#1565C0" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Total Net Generation" value={fmt(totals.netGenerationMwh)} unit="MWh" color="#1B5E20" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Average Forebay Level" value={fmt(totals.forebayLevelM)} unit="m" color="#0277BD" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Average Net Head" value={fmt(totals.netHeadM)} unit="m" color="#00838F" />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ChartCard title="Daily Energy Generated (kWh)" height={260}>
                <LineChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="energyGeneratedKwh" name="Energy (kWh)"
                    stroke="#1565C0" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ChartCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ChartCard title="Water Levels (m)" height={260}>
                <AreaChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend verticalAlign="bottom" />
                  <Area type="monotone" dataKey="forebayLevelM" name="Forebay Level" stroke="#1B5E20" fill="#1B5E20" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="tailraceLevelM" name="Tailrace Level" stroke="#E65100" fill="#E65100" fillOpacity={0.2} />
                </AreaChart>
              </ChartCard>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <ChartCard title="Net Generation (MWh) per Day" height={240}>
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="netGenerationMwh" name="Net Generation (MWh)" fill="#0277BD">
                    <LabelList dataKey="netGenerationMwh" position="top" fontSize={11}
                      formatter={(v) => (typeof v === 'number' ? v.toFixed(1) : '')} />
                  </Bar>
                </BarChart>
              </ChartCard>
            </Grid>
          </Grid>
        </div>

        <Divider sx={{ my: 3 }} />

        <CollapsibleCard title="Raw Data" defaultCollapsed>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#E3F2FD' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Energy (kWh)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Total Gen (MWh)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Stn Service (MWh)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Net Gen (MWh)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Forebay (m)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tailrace (m)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Net Head (m)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Peak Load (MW)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Shift Leader</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dailyPlantData.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{row.date?.split('T')[0]}</TableCell>
                    <TableCell>{fmtInt(row.energyGeneratedKwh)}</TableCell>
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
                  <TableCell sx={{ fontWeight: 700 }}>{fmtInt(totals.energyGeneratedKwh)}</TableCell>
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
        </CollapsibleCard>
      </Box>
    );
  };

  // ── Tab 2: Hourly Summary ──────────────────────────────────────────────────
  // Plain consts (not useMemo) — the datasets here are small (a handful of
  // units × 24 hours), so recomputing per render is cheap and keeps this
  // chain simple for React Compiler to reason about.
  const hourlyAvailableDates = [...new Set((hourlyData ?? []).map((r) => r.date.split('T')[0]))].sort();
  const showDaySelector = hourlyAvailableDates.length > 1;
  const effectiveHourlyDate = showDaySelector
    ? (selectedHourlyDate || hourlyAvailableDates[0])
    : hourlyAvailableDates[0];
  const filteredHourlyData = (hourlyData ?? []).filter(
    (r) => !showDaySelector || r.date.split('T')[0] === effectiveHourlyDate
  );

  const hourlyUnits = [...new Set(filteredHourlyData.map((r) => r.unitCode))];
  const hourlyHours = [...new Set(filteredHourlyData.map((r) => r.hour))].sort((a, b) => a - b);
  const hourlyChartData = hourlyHours.map((h) => {
    const row: Record<string, string | number | undefined> = { hour: `${String(h).padStart(2, '0')}:00` };
    hourlyUnits.forEach((code) => {
      const rec = filteredHourlyData.find((r) => r.hour === h && r.unitCode === code);
      row[code] = rec?.activePowerMW;
    });
    return row;
  });

  const chartUnitsMap = new Map<string, string>();
  filteredHourlyData.forEach((r) => { if (!chartUnitsMap.has(r.unitCode)) chartUnitsMap.set(r.unitCode, r.unitName || r.unitCode); });
  const chartUnits = [...chartUnitsMap.entries()];

  const renderHourlyTab = () => {
    if (loading) return <LoadingSkeleton />;
    if (!hasGenerated) return <EmptyState variant="initial" />;
    if (!hourlyData || hourlyData.length === 0) return <EmptyState variant="noData" />;

    const peakActivePower = maxOf(filteredHourlyData.map((r) => r.activePowerMW));
    const avgActivePower = avgOf(filteredHourlyData.map((r) => r.activePowerMW));
    const avgPowerFactor = avgOf(filteredHourlyData.map((r) => r.powerFactor));
    const unitsReporting = new Set(filteredHourlyData.map((r) => r.unitCode)).size;

    return (
      <Box>
        {showDaySelector && (
          <FormControl size="small" sx={{ minWidth: 200, mb: 3 }}>
            <InputLabel>Day</InputLabel>
            <Select label="Day" value={effectiveHourlyDate} onChange={(e) => setSelectedHourlyDate(e.target.value)}>
              {hourlyAvailableDates.map((d) => (
                <MenuItem key={d} value={d}>{shortDate(d)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <div ref={chartsRef} style={{ backgroundColor: '#fff' }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Peak Active Power" value={fmt(peakActivePower)} unit="MW" color="#1565C0" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Average Active Power" value={fmt(avgActivePower)} unit="MW" color="#1B5E20" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Average Power Factor" value={fmt(avgPowerFactor, 3)} color="#E65100" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Units Reporting" value={String(unitsReporting)} color="#7B1FA2" />
            </Grid>
          </Grid>

          <ChartCard title="Active Power (MW) per Hour" height={300}>
            <LineChart data={hourlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend verticalAlign="bottom" />
              {chartUnits.map(([code, name], i) => (
                <Line key={code} type="monotone" dataKey={code} name={name}
                  stroke={UNIT_COLORS[i % UNIT_COLORS.length]} strokeWidth={2} dot={{ r: 2 }} connectNulls />
              ))}
            </LineChart>
          </ChartCard>
        </div>

        <Divider sx={{ my: 3 }} />

        <CollapsibleCard title="Raw Data" defaultCollapsed>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#E3F2FD' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Hour</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Active (MW)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reactive (MVar)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Voltage (kV)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Frequency</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>PF</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Gate (%)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredHourlyData.map((row, idx) => {
                  const isNewDate = idx === 0 || row.date !== filteredHourlyData[idx - 1].date;
                  return (
                    <TableRow key={idx} hover>
                      <TableCell sx={{
                        fontWeight: isNewDate ? 700 : 400,
                        color: isNewDate ? 'text.primary' : 'text.disabled',
                        borderLeft: isNewDate ? 'none' : '3px solid',
                        borderLeftColor: 'divider',
                      }}>
                        {isNewDate ? row.date?.split('T')[0] : ''}
                      </TableCell>
                      <TableCell>{row.hour}</TableCell>
                      <TableCell>{row.unitName || row.unitCode}</TableCell>
                      <TableCell>{fmt(row.activePowerMW)}</TableCell>
                      <TableCell>{fmt(row.reactivePowerMVar)}</TableCell>
                      <TableCell>{fmt(row.voltageKV)}</TableCell>
                      <TableCell>{fmt(row.frequency)}</TableCell>
                      <TableCell>{fmt(row.powerFactor, 3)}</TableCell>
                      <TableCell>{fmt(row.gatePosition)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CollapsibleCard>
      </Box>
    );
  };

  // ── Tab 3: Availability & Outage ───────────────────────────────────────────
  const renderAvailabilityTab = () => {
    if (loading) return <LoadingSkeleton />;
    if (!hasGenerated) return <EmptyState variant="initial" />;
    if (!availabilityData
      || (availabilityData.availability.length === 0
        && availabilityData.trips.length === 0
        && availabilityData.reliability.length === 0)) {
      return <EmptyState variant="noData" />;
    }

    const { summary, availability, trips, reliability } = availabilityData;

    const hoursChartData = availability.map((r) => ({
      date: shortDate(r.date),
      runHours: r.runHours,
      reserveShutdownHours: r.reserveShutdownHours,
      forcedOutageHours: r.forcedOutageHours,
      maintenanceOutageHours: r.maintenanceOutageHours,
      plannedOutageHours: r.plannedOutageHours,
    }));
    const tripsChartData = trips.map((r) => ({ date: shortDate(r.date), totalTrips: r.totalTrips }));
    const reliabilityChartData = reliability.map((r) => ({ date: shortDate(r.date), startingReliabilityPct: r.startingReliabilityPct }));

    return (
      <Box>
        <div ref={chartsRef} style={{ backgroundColor: '#fff' }}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Total Service Hours" value={fmt(summary.totalServiceHours, 1)} unit="hrs" color="#1B5E20" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Total Run Hours" value={fmt(summary.totalRunHours, 1)} unit="hrs" color="#1565C0" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Total Forced Outage Hours" value={fmt(summary.totalForcedOutageHours, 1)} unit="hrs" color="#B71C1C" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Total Trips" value={String(summary.totalTrips ?? 0)} color="#B71C1C" />
            </Grid>
          </Grid>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Total Maintenance Outage Hours" value={fmt(summary.totalMaintenanceOutageHours, 1)} unit="hrs" color="#E65100" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Total Planned Outage Hours" value={fmt(summary.totalPlannedOutageHours, 1)} unit="hrs" color="#7B1FA2" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Avg Starting Reliability" value={fmtPct(summary.averageStartingReliabilityPct)} color="#1565C0" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Avg Load Factor" value={fmtPct(summary.averageLoadFactorPct)} color="#1B5E20" />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <ChartCard title="Hours Breakdown per Day" height={280}>
                <BarChart data={hoursChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend verticalAlign="bottom" />
                  <Bar dataKey="runHours" name="Run Hours" stackId="hrs" fill="#1B5E20" />
                  <Bar dataKey="reserveShutdownHours" name="Reserve Shutdown" stackId="hrs" fill="#FFA000" />
                  <Bar dataKey="forcedOutageHours" name="Forced Outage" stackId="hrs" fill="#B71C1C" />
                  <Bar dataKey="maintenanceOutageHours" name="Maintenance" stackId="hrs" fill="#E65100" />
                  <Bar dataKey="plannedOutageHours" name="Planned" stackId="hrs" fill="#7B1FA2" />
                </BarChart>
              </ChartCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ChartCard title="Total Trips per Day" height={240}>
                <BarChart data={tripsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="totalTrips" name="Trips" fill="#B71C1C" />
                </BarChart>
              </ChartCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ChartCard title="Starting Reliability (%) Trend" height={240}>
                <LineChart data={reliabilityChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip />
                  <ReferenceLine y={95} stroke="#9E9E9E" strokeDasharray="4 4" label={{ value: '95% target', fontSize: 11, position: 'insideTopRight' }} />
                  <Line type="monotone" dataKey="startingReliabilityPct" name="Reliability %" stroke="#1565C0" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ChartCard>
            </Grid>
          </Grid>
        </div>

        <Divider sx={{ my: 3 }} />

        <Stack spacing={2}>
          <CollapsibleCard title="Daily Availability" defaultCollapsed headerColor="#1B5E20">
            {availability.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>
                No availability data for this period.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#E3F2FD' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Service</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Run</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Reserve Shutdown</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Forced Outage</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Maintenance</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Planned</TableCell>
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
            )}
          </CollapsibleCard>

          <CollapsibleCard title="Plant Trips" defaultCollapsed headerColor="#B71C1C">
            {trips.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>
                No trips recorded for this period.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#E3F2FD' }}>
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
                        <TableCell>{row.lowLoadTrip ?? '—'}</TableCell>
                        <TableCell>{row.highLoadTrip ?? '—'}</TableCell>
                        <TableCell>{row.preIgnition ?? '—'}</TableCell>
                        <TableCell>{row.preSync ?? '—'}</TableCell>
                        <TableCell>{row.partialLoadTrip ?? '—'}</TableCell>
                        <TableCell>{row.fullLoadTrip ?? '—'}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{row.totalTrips ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CollapsibleCard>

          <CollapsibleCard title="Reliability Metrics" defaultCollapsed headerColor="#E65100">
            {reliability.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>
                No reliability data for this period.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#E3F2FD' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>MTBF</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Successful Starts</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Unsuccessful</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Attempts</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Reliability %</TableCell>
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
            )}
          </CollapsibleCard>
        </Stack>
      </Box>
    );
  };

  const plantDisplayName = availablePlants.find((p) => p.plantCode === selectedPlant)?.plantName ?? selectedPlant;

  // ── Guards ────────────────────────────────────────────────────────────────
  if (isWrongPlantType) {
    return (
      <Box>
        <PageHeader title="Hydro Reports" breadcrumbs={[{ label: 'Reports' }, { label: 'Hydro Reports' }]} />
        <Alert severity="warning"
          action={<Button color="inherit" size="small" onClick={() => navigate(-1)}>Go Back</Button>}>
          Your plant assignment is for a thermal plant. You don't have access to hydro reports.
        </Alert>
      </Box>
    );
  }

  if (!canView) {
    return (
      <Box>
        <PageHeader title="Hydro Reports" breadcrumbs={[{ label: 'Reports' }, { label: 'Hydro Reports' }]} />
        <Alert severity="error">You don't have permission to view reports.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Hydro Reports"
        subtitle="Daily, hourly and availability reports for hydro power stations"
        breadcrumbs={[{ label: 'Reports' }, { label: 'Hydro Reports' }]}
      />

      {/* Shared controls */}
      <Card elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
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
            <Button variant="contained" size="small" sx={{ backgroundColor: '#1565C0' }}
              startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
              onClick={handleGenerate} disabled={loading || !selectedPlant || !dateFrom || !dateTo}>
              {loading ? 'Generating...' : 'Generate'}
            </Button>

            {hasGenerated && canExport && (
              <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
                <Button variant="outlined" size="small"
                  startIcon={exportingPdf ? <CircularProgress size={14} /> : <PictureAsPdf />}
                  endIcon={<ArrowDropDown />}
                  onClick={(e) => setPdfMenuAnchor(e.currentTarget)} disabled={!!exportingPdf}>
                  Export PDF
                </Button>
                <Menu anchorEl={pdfMenuAnchor} open={!!pdfMenuAnchor} onClose={() => setPdfMenuAnchor(null)}>
                  <MenuItem onClick={handleExportPdfChart}>
                    <ListItemIcon><InsertChartOutlined fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Chart View" secondary="Visual snapshot of metrics & charts" />
                  </MenuItem>
                  <MenuItem onClick={handleExportPdfData}>
                    <ListItemIcon><TableRows fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Data Table" secondary="Raw data as a formatted table" />
                  </MenuItem>
                </Menu>
                <Button variant="outlined" size="small"
                  startIcon={<TableChart />}
                  onClick={handleExportExcel}>
                  Export Excel
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

      <Card elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            px: 1.5, py: 1,
            minHeight: 0,
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTabs-flexContainer': { gap: 1 },
            '& .MuiTab-root': {
              minHeight: 40, textTransform: 'none', fontWeight: 600,
              borderRadius: '20px', px: 2.5, color: 'text.secondary',
            },
            '& .MuiTab-root.Mui-selected': { backgroundColor: '#1565C0', color: '#fff' },
          }}
        >
          {TABS.map((t) => (
            <Tab key={t.kind} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Card>

      {activeTab === 0 && renderDailyPlantTab()}
      {activeTab === 1 && renderHourlyTab()}
      {activeTab === 2 && renderAvailabilityTab()}
    </Box>
  );
}
