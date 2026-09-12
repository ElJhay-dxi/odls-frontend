import {
  Box, Card, CardContent, CardHeader, Typography, Button, CircularProgress,
  Alert, MenuItem, FormControl, InputLabel, Select, Grid, Chip,
  Stack, TextField, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Tabs, Tab, Collapse, Skeleton, Divider,
  Menu, ListItemIcon, ListItemText,
} from '@mui/material';
import {
  Science, Biotech, LocalPharmacy, OilBarrel, Park, FilterAlt, Assignment,
  TableChart, PictureAsPdf, ExpandMore, ExpandLess, ArrowDropDown, InsertChartOutlined, TableRows,
} from '@mui/icons-material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import PageHeader from '../../components/shared/PageHeader';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { labReportsApi, type LabReportKind } from '../../api/lab/labReportsApi';
import type { PowerPlant } from '../../types/masterData';
import type {
  LabWaterQualityRow, LabChemicalConsumptionRow, LabLubeOilRow,
  LabEnvironmentalReport, LabDesalinationRow, LabShiftSummaryReport,
} from '../../types/labReports';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

const ACCENT = '#1B5E20';

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

const sumOf = (vals: (number | undefined)[]) => vals.reduce((acc: number, v) => acc + (v ?? 0), 0);
const avgOf = (vals: (number | undefined)[]) => {
  const nums = vals.filter((v): v is number => v != null);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : undefined;
};

const PALETTE = ['#1565C0', '#1B5E20', '#E65100', '#7B1FA2', '#00838F', '#FFA000', '#B71C1C', '#0277BD'];

const STATUS_TEXT_COLORS: Record<string, string> = {
  Normal: '#1B5E20', Warning: '#F57C00', OutOfRange: '#B71C1C', Unknown: '#9E9E9E',
};
const CONDITION_COLORS: Record<string, string> = { Good: '#1B5E20', Monitor: '#FFA000', Replace: '#B71C1C' };

const SAMPLE_TYPES = ['All', 'Raw Water', 'Treated Water', 'Steam', 'Condensate', 'Cooling Water'];

const TABS: { label: string; icon: React.ReactElement; kind: LabReportKind }[] = [
  { label: 'Water Quality', icon: <Biotech fontSize="small" />, kind: 'waterquality' },
  { label: 'Chemical Consumption', icon: <LocalPharmacy fontSize="small" />, kind: 'chemicalconsumption' },
  { label: 'Lube Oil', icon: <OilBarrel fontSize="small" />, kind: 'lubeoil' },
  { label: 'Environmental', icon: <Park fontSize="small" />, kind: 'environmental' },
  { label: 'Desalination', icon: <FilterAlt fontSize="small" />, kind: 'desalination' },
  { label: 'Shift Summary', icon: <Assignment fontSize="small" />, kind: 'shiftsummary' },
];

const findParam = (row: LabWaterQualityRow, name: string) =>
  row.parameters.find((p) => p.parameterName.trim().toLowerCase() === name);

// Builds one row per date with one column per distinct sample point/equipment,
// so a multi-series line chart can be drawn from an otherwise flat record list.
function buildTrendSeries<T extends { date: string }>(
  rows: T[], seriesKey: (r: T) => string, valueOf: (r: T) => number | undefined,
) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const series = [...new Set(sorted.map(seriesKey))];
  const dates = [...new Set(sorted.map((r) => r.date))];
  const data = dates.map((d) => {
    const entry: Record<string, string | number | undefined> = { date: shortDate(d) };
    series.forEach((s) => {
      const rec = sorted.find((r) => r.date === d && seriesKey(r) === s);
      entry[s] = rec ? valueOf(rec) : undefined;
    });
    return entry;
  });
  return { data, series };
}

// ─── PDF chart export (identical to HydroReportsPage's) ─────────────────────
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
  activeTab: number; plantCode: string; plantLabel: string; dateFrom: string; dateTo: string;
  waterQualityData: LabWaterQualityRow[]; chemicalData: LabChemicalConsumptionRow[];
  lubeOilData: LabLubeOilRow[]; environmentalData: LabEnvironmentalReport | null;
  desalinationData: LabDesalinationRow[]; shiftSummaryData: LabShiftSummaryReport | null;
}) {
  const {
    activeTab, plantCode, plantLabel, dateFrom, dateTo,
    waterQualityData, chemicalData, lubeOilData, environmentalData, desalinationData, shiftSummaryData,
  } = params;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(14);
  doc.text(`Lab ${TABS[activeTab].label} Report`, 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`${plantLabel}   |   ${dateFrom} to ${dateTo}`, 14, 21);
  doc.setTextColor(0);

  if (activeTab === 0) {
    const paramNames = [...new Set(waterQualityData.flatMap((r) => r.parameters.map((p) => p.parameterName)))];
    autoTable(doc, {
      startY: 26,
      head: [['Date', 'Time', 'Sample Point', 'Sample Type', ...paramNames]],
      body: waterQualityData.map((r) => [
        r.date?.split('T')[0], r.analysisTime?.slice(0, 5) ?? '—', r.samplePoint, r.sampleType,
        ...paramNames.map((n) => {
          const p = findParam(r, n.trim().toLowerCase());
          return p?.value != null ? String(p.value) : '—';
        }),
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [27, 94, 32] },
    });
  } else if (activeTab === 1) {
    autoTable(doc, {
      startY: 26,
      head: [['Date', 'Chemical', 'Dosing Point', 'Opening', 'Consumption', 'Closing', 'Unit']],
      body: chemicalData.map((r) => [
        r.date?.split('T')[0], r.chemicalName, r.dosingPoint ?? '—',
        fmt(r.openingStock, 1), fmt(r.consumption, 1), fmt(r.closingStock, 1), r.unit ?? '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [230, 81, 0] },
    });
  } else if (activeTab === 2) {
    autoTable(doc, {
      startY: 26,
      head: [['Date', 'Equipment', 'Oil Type', 'Viscosity', 'Acid No.', 'Water %', 'Flash Pt.', 'Particles', 'Condition', 'Remarks']],
      body: lubeOilData.map((r) => [
        r.date?.split('T')[0], r.equipment, r.oilType ?? '—', fmt(r.viscosity, 1), fmt(r.acidNumber, 2),
        fmt(r.waterContent, 2), fmt(r.flashPoint, 1), fmtInt(r.particleCount), r.condition ?? '—', r.remarks ?? '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [27, 94, 32] },
    });
  } else if (activeTab === 3 && environmentalData) {
    autoTable(doc, {
      startY: 26,
      head: [['Metric', 'Value']],
      body: [
        ['Period', environmentalData.period],
        ['Total Seawater Abstracted (m³)', fmt(environmentalData.totalSeaWaterAbstractedM3, 1)],
        ['Total Product Water Generated (m³)', fmt(environmentalData.totalProductWaterGeneratedM3, 1)],
        ['Compliance Rate (%)', fmt(environmentalData.compliancePct, 1)],
        ['Out of Range Parameters', String(environmentalData.outOfRangeCount)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [21, 101, 192] },
      tableWidth: 120,
    });
    const finalY1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    autoTable(doc, {
      startY: finalY1 + 10,
      head: [['Date', 'Time', 'pH', 'Conductivity', 'Turbidity', 'Chlorine (mg/L)', 'Intake Flow (m³/h)', 'Temp (°C)']],
      body: environmentalData.seaWaterTrend.map((r) => [
        r.date?.split('T')[0], r.readingTime?.slice(0, 5) ?? '—', fmt(r.ph, 2), fmt(r.conductivity, 0),
        fmt(r.turbidity, 1), fmt(r.chlorineResidual, 2), fmt(r.intakeFlow, 1), fmt(r.temperature, 1),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [21, 101, 192] },
    });
    const finalY2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    autoTable(doc, {
      startY: finalY2 + 10,
      head: [['Chemical Name', 'Dosing Point', 'Total Consumption', 'Unit']],
      body: environmentalData.chemicalSummary.map((r) => [
        r.chemicalName, r.dosingPoint ?? '—', fmt(r.totalConsumption, 1), r.unit ?? '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [230, 81, 0] },
    });
  } else if (activeTab === 4) {
    autoTable(doc, {
      startY: 26,
      head: [['Date', 'SWRO Rec.', 'Salt Rej.', 'SWRO Cond.', 'BWRO Rec.', 'BWRO Cond.', 'UF SDI', 'Prod. Flow', 'Prod. pH', 'Prod. Cond.', 'Prod. TDS']],
      body: desalinationData.map((r) => [
        r.date?.split('T')[0], fmt(r.swroRecoveryRate, 1), fmt(r.swroSaltRejection, 1), fmt(r.swroConductivity, 0),
        fmt(r.bwroRecoveryRate, 1), fmt(r.bwroConductivity, 0), fmt(r.ufSdi, 2), fmt(r.productWaterFlowRate, 1),
        fmt(r.productWaterPh, 2), fmt(r.productWaterConductivity, 0), fmt(r.productWaterTds, 0),
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [0, 131, 143] },
    });
  } else if (activeTab === 5 && shiftSummaryData) {
    autoTable(doc, {
      startY: 26,
      head: [['Metric', 'Value']],
      body: [
        ['Total Shifts', String(shiftSummaryData.totalShifts)],
        ['Total Entries', String(shiftSummaryData.totalEntries)],
        ['Observations', String(shiftSummaryData.totalObservations)],
        ['Actions', String(shiftSummaryData.totalActions)],
        ['Samples Taken', String(shiftSummaryData.totalSamplesTaken)],
        ['Incidents', String(shiftSummaryData.totalIncidents)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [27, 94, 32] },
      tableWidth: 100,
    });
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    autoTable(doc, {
      startY: finalY + 10,
      head: [['Date', 'Shifts', 'Entries', 'Observations', 'Actions', 'Samples', 'Incidents', 'Shift Leaders']],
      body: shiftSummaryData.dailyBreakdown.map((r) => [
        r.date?.split('T')[0], String(r.shiftCount), String(r.totalEntries), String(r.observations),
        String(r.actions), String(r.samplesTaken), String(r.incidents), r.shiftLeaders.join(', ') || '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [21, 101, 192] },
    });
  }

  doc.save(`LabReport_${TABS[activeTab].kind}_Data_${plantCode}_${dateFrom}_${dateTo}.pdf`);
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
  title, defaultCollapsed = true, headerColor = ACCENT, children,
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
        <Science sx={{ fontSize: 80, color: ACCENT, opacity: 0.3, mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
          {variant === 'initial' ? 'Select a plant and date range' : 'No data found for the selected period.'}
        </Typography>
        {variant === 'initial' && (
          <Typography variant="body2" color="text.secondary">
            Select a plant and date range, then click Generate.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function LabReportsPage() {
  const { canView, canExport } = useSectionPermissions('lab.reports');
  const isWrongPlantType = usePlantTypeGuard('thermal');
  const navigate = useNavigate();

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [dateFrom, setDateFrom] = useState(daysAgoStr(30));
  const [dateTo, setDateTo] = useState(todayStr());
  const [activeTab, setActiveTab] = useState(0);
  const [envPeriod, setEnvPeriod] = useState('quarterly');

  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState<'chart' | 'data' | null>(null);
  const [pdfMenuAnchor, setPdfMenuAnchor] = useState<HTMLElement | null>(null);

  const [waterQualityData, setWaterQualityData] = useState<LabWaterQualityRow[]>([]);
  const [chemicalData, setChemicalData] = useState<LabChemicalConsumptionRow[]>([]);
  const [lubeOilData, setLubeOilData] = useState<LabLubeOilRow[]>([]);
  const [environmentalData, setEnvironmentalData] = useState<LabEnvironmentalReport | null>(null);
  const [desalinationData, setDesalinationData] = useState<LabDesalinationRow[]>([]);
  const [shiftSummaryData, setShiftSummaryData] = useState<LabShiftSummaryReport | null>(null);

  // Tab 1 local filters
  const [samplePointFilter, setSamplePointFilter] = useState('');
  const [sampleTypeFilter, setSampleTypeFilter] = useState('All');

  const chartsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    powerPlantApi.getAll().then((res) =>
      setPlants(res.data.filter((p) => p.classificationType?.toLowerCase() === 'thermal'))
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
      const [waterRes, chemRes, oilRes, envRes, desalRes, shiftRes] = await Promise.all([
        labReportsApi.getWaterQuality(selectedPlant, dateFrom, dateTo),
        labReportsApi.getChemicalConsumption(selectedPlant, dateFrom, dateTo),
        labReportsApi.getLubeOil(selectedPlant, dateFrom, dateTo),
        labReportsApi.getEnvironmental(selectedPlant, dateFrom, dateTo, envPeriod),
        labReportsApi.getDesalination(selectedPlant, dateFrom, dateTo),
        labReportsApi.getShiftSummary(selectedPlant, dateFrom, dateTo),
      ]);
      setWaterQualityData(waterRes.data);
      setChemicalData(chemRes.data);
      setLubeOilData(oilRes.data);
      setEnvironmentalData(envRes.data);
      setDesalinationData(desalRes.data);
      setShiftSummaryData(shiftRes.data);
      setSamplePointFilter('');
      setSampleTypeFilter('All');
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
    labReportsApi.exportExcel(TABS[activeTab].kind, selectedPlant, dateFrom, dateTo, envPeriod);
  };

  const handleExportPdfChart = async () => {
    setPdfMenuAnchor(null);
    if (!chartsRef.current) return;
    setExportingPdf('chart');
    try {
      await buildChartPdf(chartsRef.current,
        `LabReport_${TABS[activeTab].kind}_Chart_${selectedPlant}_${dateFrom}_${dateTo}.pdf`);
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
        activeTab, plantCode: selectedPlant, plantLabel: plantDisplayName || selectedPlant, dateFrom, dateTo,
        waterQualityData: filteredWaterQuality, chemicalData, lubeOilData, environmentalData, desalinationData, shiftSummaryData,
      });
    } catch {
      setError('Failed to export data PDF.');
    } finally {
      setExportingPdf(null);
    }
  };

  // ── Tab 1: Water Quality ───────────────────────────────────────────────────
  const distinctSamplePoints = [...new Set(waterQualityData.map((r) => r.samplePoint))];

  const filteredWaterQuality = waterQualityData.filter((r) =>
    (!samplePointFilter || r.samplePoint === samplePointFilter) &&
    (sampleTypeFilter === 'All' || r.sampleType === sampleTypeFilter)
  );

  const renderWaterQualityTab = () => {
    if (loading) return <LoadingSkeleton />;
    if (!hasGenerated) return <EmptyState variant="initial" />;
    if (waterQualityData.length === 0) return <EmptyState variant="noData" />;

    const totalAnalyses = filteredWaterQuality.length;
    const samplePointCount = new Set(filteredWaterQuality.map((r) => r.samplePoint)).size;
    const outOfRangeCount = filteredWaterQuality.reduce((s, r) => s + r.parameters.filter((p) => p.status === 'OutOfRange').length, 0);
    const warningCount = filteredWaterQuality.reduce((s, r) => s + r.parameters.filter((p) => p.status === 'Warning').length, 0);

    const phSeries = buildTrendSeries(filteredWaterQuality, (r) => r.samplePoint, (r) => findParam(r, 'ph')?.value);
    const condSeries = buildTrendSeries(filteredWaterQuality, (r) => r.samplePoint, (r) => findParam(r, 'conductivity')?.value);
    const tdsSeries = buildTrendSeries(filteredWaterQuality, (r) => r.samplePoint, (r) => findParam(r, 'tds')?.value);

    const paramNames = [...new Set(filteredWaterQuality.flatMap((r) => r.parameters.map((p) => p.parameterName)))].sort();

    return (
      <Box>
        <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }} useFlexGap>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Sample Point</InputLabel>
            <Select label="Sample Point" value={samplePointFilter} onChange={(e) => setSamplePointFilter(e.target.value)}>
              <MenuItem value="">All Sample Points</MenuItem>
              {distinctSamplePoints.map((sp) => <MenuItem key={sp} value={sp}>{sp}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Sample Type</InputLabel>
            <Select label="Sample Type" value={sampleTypeFilter} onChange={(e) => setSampleTypeFilter(e.target.value)}>
              {SAMPLE_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>

        <div ref={chartsRef} style={{ backgroundColor: '#fff' }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Total Analyses" value={fmtInt(totalAnalyses)} color="#1565C0" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Sample Points" value={fmtInt(samplePointCount)} color="#1B5E20" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Out of Range Parameters" value={fmtInt(outOfRangeCount)} color="#B71C1C" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Warning Parameters" value={fmtInt(warningCount)} color="#FFA000" />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ChartCard title="pH Trend" height={260}>
                <LineChart data={phSeries.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  {phSeries.series.length > 1 && <Legend verticalAlign="bottom" />}
                  {phSeries.series.map((sp, i) => (
                    <Line key={sp} type="monotone" dataKey={sp} name={sp}
                      stroke={phSeries.series.length > 1 ? PALETTE[i % PALETTE.length] : '#1565C0'}
                      strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  ))}
                </LineChart>
              </ChartCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ChartCard title="Conductivity Trend" height={260}>
                <LineChart data={condSeries.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  {condSeries.series.length > 1 && <Legend verticalAlign="bottom" />}
                  {condSeries.series.map((sp, i) => (
                    <Line key={sp} type="monotone" dataKey={sp} name={sp}
                      stroke={condSeries.series.length > 1 ? PALETTE[i % PALETTE.length] : '#1B5E20'}
                      strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  ))}
                </LineChart>
              </ChartCard>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <ChartCard title="TDS Trend" height={240}>
                <LineChart data={tdsSeries.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  {tdsSeries.series.length > 1 && <Legend verticalAlign="bottom" />}
                  {tdsSeries.series.map((sp, i) => (
                    <Line key={sp} type="monotone" dataKey={sp} name={sp}
                      stroke={tdsSeries.series.length > 1 ? PALETTE[i % PALETTE.length] : '#E65100'}
                      strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  ))}
                </LineChart>
              </ChartCard>
            </Grid>
          </Grid>
        </div>

        <Divider sx={{ my: 3 }} />

        <CollapsibleCard title="Raw Data" defaultCollapsed>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#E8F5E9' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Sample Point</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Sample Type</TableCell>
                  {paramNames.map((n) => <TableCell key={n} sx={{ fontWeight: 700 }}>{n}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredWaterQuality.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{row.date?.split('T')[0]}</TableCell>
                    <TableCell>{row.analysisTime?.slice(0, 5) ?? '—'}</TableCell>
                    <TableCell>{row.samplePoint}</TableCell>
                    <TableCell>{row.sampleType}</TableCell>
                    {paramNames.map((n) => {
                      const p = findParam(row, n.trim().toLowerCase());
                      return (
                        <TableCell key={n} sx={{ color: STATUS_TEXT_COLORS[p?.status ?? 'Unknown'], fontWeight: 600 }}>
                          {p?.value != null ? p.value : '—'}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CollapsibleCard>
      </Box>
    );
  };

  // ── Tab 2: Chemical Consumption ────────────────────────────────────────────
  const renderChemicalConsumptionTab = () => {
    if (loading) return <LoadingSkeleton />;
    if (!hasGenerated) return <EmptyState variant="initial" />;
    if (chemicalData.length === 0) return <EmptyState variant="noData" />;

    const totalChemicals = new Set(chemicalData.map((r) => r.chemicalName)).size;
    const totalConsumption = sumOf(chemicalData.map((r) => r.consumption));

    const byChemical = new Map<string, number>();
    chemicalData.forEach((r) => byChemical.set(r.chemicalName, (byChemical.get(r.chemicalName) ?? 0) + (r.consumption ?? 0)));
    const chemicalTotals = [...byChemical.entries()].map(([chemicalName, total]) => ({ chemicalName, total }))
      .sort((a, b) => b.total - a.total);
    const highestConsumer = chemicalTotals[0]?.chemicalName ?? '—';

    const byDate = new Map<string, number>();
    chemicalData.forEach((r) => byDate.set(r.date, (byDate.get(r.date) ?? 0) + (r.consumption ?? 0)));
    const dailyChartData = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, total]) => ({ date: shortDate(date), total }));

    return (
      <Box>
        <div ref={chartsRef} style={{ backgroundColor: '#fff' }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Total Chemicals" value={fmtInt(totalChemicals)} color="#E65100" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Total Consumption" value={fmt(totalConsumption, 1)} color="#B71C1C" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Highest Consumer" value={highestConsumer} color="#1565C0" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Total Records" value={fmtInt(chemicalData.length)} color="#1B5E20" />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <ChartCard title="Total Consumption per Chemical" height={280}>
                <BarChart data={chemicalTotals.map((c) => ({ chemicalName: c.chemicalName, total: c.total }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="chemicalName" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" name="Total Consumption" fill="#E65100" />
                </BarChart>
              </ChartCard>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <ChartCard title="Daily Total Consumption Trend" height={240}>
                <LineChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" name="Total Consumption" stroke="#1565C0" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ChartCard>
            </Grid>
          </Grid>
        </div>

        <Divider sx={{ my: 3 }} />

        <CollapsibleCard title="Raw Data" defaultCollapsed>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#E8F5E9' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Chemical</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Dosing Point</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Opening Stock</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Consumption</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Closing Stock</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {chemicalData.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{row.date?.split('T')[0]}</TableCell>
                    <TableCell>{row.chemicalName}</TableCell>
                    <TableCell>{row.dosingPoint ?? '—'}</TableCell>
                    <TableCell>{fmt(row.openingStock, 1)}</TableCell>
                    <TableCell>{fmt(row.consumption, 1)}</TableCell>
                    <TableCell>{fmt(row.closingStock, 1)}</TableCell>
                    <TableCell>{row.unit ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CollapsibleCard>
      </Box>
    );
  };

  // ── Tab 3: Lube Oil Condition ──────────────────────────────────────────────
  const renderLubeOilTab = () => {
    if (loading) return <LoadingSkeleton />;
    if (!hasGenerated) return <EmptyState variant="initial" />;
    if (lubeOilData.length === 0) return <EmptyState variant="noData" />;

    const goodCount = lubeOilData.filter((r) => r.condition === 'Good').length;
    const monitorCount = lubeOilData.filter((r) => r.condition === 'Monitor').length;
    const replaceCount = lubeOilData.filter((r) => r.condition === 'Replace').length;

    const equipments = [...new Set(lubeOilData.map((r) => r.equipment))];
    const conditionChartData = equipments.map((eq) => {
      const recs = lubeOilData.filter((r) => r.equipment === eq);
      return {
        equipment: eq,
        Good: recs.filter((r) => r.condition === 'Good').length,
        Monitor: recs.filter((r) => r.condition === 'Monitor').length,
        Replace: recs.filter((r) => r.condition === 'Replace').length,
      };
    });

    const viscositySeries = buildTrendSeries(lubeOilData, (r) => r.equipment, (r) => r.viscosity);

    return (
      <Box>
        <div ref={chartsRef} style={{ backgroundColor: '#fff' }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Total Records" value={fmtInt(lubeOilData.length)} color="#1B5E20" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Good Condition" value={fmtInt(goodCount)} color="#1B5E20" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Monitor" value={fmtInt(monitorCount)} color="#FFA000" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Replace" value={fmtInt(replaceCount)} color="#B71C1C" />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <ChartCard title="Condition Distribution per Equipment" height={280}>
                <BarChart data={conditionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="equipment" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend verticalAlign="bottom" />
                  <Bar dataKey="Good" name="Good" stackId="cond" fill={CONDITION_COLORS.Good} />
                  <Bar dataKey="Monitor" name="Monitor" stackId="cond" fill={CONDITION_COLORS.Monitor} />
                  <Bar dataKey="Replace" name="Replace" stackId="cond" fill={CONDITION_COLORS.Replace} />
                </BarChart>
              </ChartCard>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <ChartCard title="Viscosity Trend per Equipment" height={240}>
                <LineChart data={viscositySeries.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend verticalAlign="bottom" />
                  {viscositySeries.series.map((eq, i) => (
                    <Line key={eq} type="monotone" dataKey={eq} name={eq}
                      stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  ))}
                </LineChart>
              </ChartCard>
            </Grid>
          </Grid>
        </div>

        <Divider sx={{ my: 3 }} />

        <CollapsibleCard title="Raw Data" defaultCollapsed>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#E8F5E9' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Equipment</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Oil Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Viscosity</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Acid No.</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Water Content</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Flash Point</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Particle Count</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Condition</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lubeOilData.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{row.date?.split('T')[0]}</TableCell>
                    <TableCell>{row.equipment}</TableCell>
                    <TableCell>{row.oilType ?? '—'}</TableCell>
                    <TableCell>{fmt(row.viscosity, 1)}</TableCell>
                    <TableCell>{fmt(row.acidNumber, 2)}</TableCell>
                    <TableCell>{fmt(row.waterContent, 2)}</TableCell>
                    <TableCell>{fmt(row.flashPoint, 1)}</TableCell>
                    <TableCell>{fmtInt(row.particleCount)}</TableCell>
                    <TableCell>
                      {row.condition ? (
                        <Chip label={row.condition} size="small"
                          sx={{ backgroundColor: CONDITION_COLORS[row.condition] ?? '#9E9E9E', color: '#fff', fontWeight: 600 }} />
                      ) : '—'}
                    </TableCell>
                    <TableCell>{row.remarks ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CollapsibleCard>
      </Box>
    );
  };

  // ── Tab 4: Environmental Compliance ────────────────────────────────────────
  const renderEnvironmentalTab = () => {
    if (loading) return <LoadingSkeleton />;
    if (!hasGenerated) return <EmptyState variant="initial" />;
    if (!environmentalData) return <EmptyState variant="noData" />;

    const env = environmentalData;
    const seaWaterChartData = env.seaWaterTrend.map((r) => ({
      date: shortDate(r.date), ph: r.ph, turbidity: r.turbidity, chlorineResidual: r.chlorineResidual,
    }));
    const chemicalChartData = env.chemicalSummary.map((c) => ({
      chemicalName: c.chemicalName, totalConsumption: c.totalConsumption, unit: c.unit,
    }));
    const sludgeChartData = env.sludgeTrend.map((r) => ({ date: shortDate(r.date), sludgeLevel: r.sludgeLevel }));

    return (
      <Box>
        <div ref={chartsRef} style={{ backgroundColor: '#fff' }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Total Seawater Abstracted" value={fmt(env.totalSeaWaterAbstractedM3, 1)} unit="m³" color="#1565C0" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Total Product Water Generated" value={fmt(env.totalProductWaterGeneratedM3, 1)} unit="m³" color="#1B5E20" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Compliance Rate" value={fmt(env.compliancePct, 1)} unit="%"
                color={env.compliancePct >= 95 ? '#1B5E20' : '#B71C1C'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Out of Range Parameters" value={fmtInt(env.outOfRangeCount)} color="#B71C1C" />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <ChartCard title="Sea Water Quality Trend" height={280}>
                <LineChart data={seaWaterChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend verticalAlign="bottom" />
                  <Line type="monotone" dataKey="ph" name="pH" stroke="#1565C0" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="turbidity" name="Turbidity" stroke="#E65100" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="chlorineResidual" name="Chlorine Residual" stroke="#B71C1C" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ChartCard>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <ChartCard title="Chemical Consumption by Chemical" height={260}>
                <BarChart data={chemicalChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="chemicalName" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value, _name, item) =>
                    [`${value} ${(item.payload as { unit?: string })?.unit ?? ''}`, 'Total Consumption']} />
                  <Bar dataKey="totalConsumption" name="Total Consumption" fill="#E65100" />
                </BarChart>
              </ChartCard>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <ChartCard title="Sludge Level Trend" height={220}>
                <LineChart data={sludgeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sludgeLevel" name="Sludge Level (m)" stroke="#7B1FA2" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ChartCard>
            </Grid>
          </Grid>
        </div>

        <Divider sx={{ my: 3 }} />

        <Stack spacing={2}>
          <CollapsibleCard title="Sea Water Quality" defaultCollapsed>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#E8F5E9' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>pH</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Conductivity</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Turbidity</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Chlorine (mg/L)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Intake Flow (m³/h)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Temp (°C)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {env.seaWaterTrend.map((row, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{row.date?.split('T')[0]}</TableCell>
                      <TableCell>{row.readingTime?.slice(0, 5) ?? '—'}</TableCell>
                      <TableCell>{fmt(row.ph, 2)}</TableCell>
                      <TableCell>{fmt(row.conductivity, 0)}</TableCell>
                      <TableCell>{fmt(row.turbidity, 1)}</TableCell>
                      <TableCell>{fmt(row.chlorineResidual, 2)}</TableCell>
                      <TableCell>{fmt(row.intakeFlow, 1)}</TableCell>
                      <TableCell>{fmt(row.temperature, 1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CollapsibleCard>

          <CollapsibleCard title="Chemical Summary" defaultCollapsed>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#E8F5E9' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Chemical Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Dosing Point</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Total Consumption</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {env.chemicalSummary.map((row, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{row.chemicalName}</TableCell>
                      <TableCell>{row.dosingPoint ?? '—'}</TableCell>
                      <TableCell>{fmt(row.totalConsumption, 1)}</TableCell>
                      <TableCell>{row.unit ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CollapsibleCard>
        </Stack>
      </Box>
    );
  };

  // ── Tab 5: Desalination Performance ────────────────────────────────────────
  const renderDesalinationTab = () => {
    if (loading) return <LoadingSkeleton />;
    if (!hasGenerated) return <EmptyState variant="initial" />;
    if (desalinationData.length === 0) return <EmptyState variant="noData" />;

    const avgRecovery = avgOf(desalinationData.map((r) => r.swroRecoveryRate));
    const avgRejection = avgOf(desalinationData.map((r) => r.swroSaltRejection));
    const avgConductivity = avgOf(desalinationData.map((r) => r.productWaterConductivity));

    const recoveryChartData = desalinationData.map((r) => ({ date: shortDate(r.date), swroRecoveryRate: r.swroRecoveryRate }));
    const rejectionChartData = desalinationData.map((r) => ({ date: shortDate(r.date), swroSaltRejection: r.swroSaltRejection }));
    const productChartData = desalinationData.map((r) => ({
      date: shortDate(r.date), productWaterConductivity: r.productWaterConductivity, productWaterTds: r.productWaterTds,
    }));

    return (
      <Box>
        <div ref={chartsRef} style={{ backgroundColor: '#fff' }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Avg SWRO Recovery Rate" value={fmt(avgRecovery, 1)} unit="%" color="#1565C0" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Avg Salt Rejection" value={fmt(avgRejection, 1)} unit="%" color="#1B5E20" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Avg Product Water Conductivity" value={fmt(avgConductivity, 0)} color="#00838F" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard label="Total Logs" value={fmtInt(desalinationData.length)} color="#E65100" />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ChartCard title="SWRO Recovery Rate (%)" height={240}>
                <LineChart data={recoveryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <ReferenceLine y={40} stroke="#9E9E9E" strokeDasharray="4 4" label={{ value: 'min target', fontSize: 11, position: 'insideTopRight' }} />
                  <Line type="monotone" dataKey="swroRecoveryRate" name="Recovery Rate" stroke="#1565C0" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ChartCard>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ChartCard title="SWRO Salt Rejection (%)" height={240}>
                <LineChart data={rejectionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <ReferenceLine y={99} stroke="#9E9E9E" strokeDasharray="4 4" label={{ value: 'target', fontSize: 11, position: 'insideTopRight' }} />
                  <Line type="monotone" dataKey="swroSaltRejection" name="Salt Rejection" stroke="#1B5E20" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ChartCard>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <ChartCard title="Product Water Conductivity & TDS" height={260}>
                <LineChart data={productChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend verticalAlign="bottom" />
                  <Line type="monotone" dataKey="productWaterConductivity" name="Conductivity" stroke="#E65100" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="productWaterTds" name="TDS" stroke="#7B1FA2" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ChartCard>
            </Grid>
          </Grid>
        </div>

        <Divider sx={{ my: 3 }} />

        <CollapsibleCard title="Raw Data" defaultCollapsed>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#E8F5E9' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>SWRO Recovery</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Salt Rejection</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>SWRO Conductivity</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>BWRO Recovery</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>BWRO Conductivity</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>UF SDI</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Product Flow</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Product pH</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Product Conductivity</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Product TDS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {desalinationData.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{row.date?.split('T')[0]}</TableCell>
                    <TableCell>{fmt(row.swroRecoveryRate, 1)}</TableCell>
                    <TableCell>{fmt(row.swroSaltRejection, 1)}</TableCell>
                    <TableCell>{fmt(row.swroConductivity, 0)}</TableCell>
                    <TableCell>{fmt(row.bwroRecoveryRate, 1)}</TableCell>
                    <TableCell>{fmt(row.bwroConductivity, 0)}</TableCell>
                    <TableCell>{fmt(row.ufSdi, 2)}</TableCell>
                    <TableCell>{fmt(row.productWaterFlowRate, 1)}</TableCell>
                    <TableCell>{fmt(row.productWaterPh, 2)}</TableCell>
                    <TableCell>{fmt(row.productWaterConductivity, 0)}</TableCell>
                    <TableCell>{fmt(row.productWaterTds, 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CollapsibleCard>
      </Box>
    );
  };

  // ── Tab 6: Shift Summary ───────────────────────────────────────────────────
  const renderShiftSummaryTab = () => {
    if (loading) return <LoadingSkeleton />;
    if (!hasGenerated) return <EmptyState variant="initial" />;
    if (!shiftSummaryData || shiftSummaryData.dailyBreakdown.length === 0) return <EmptyState variant="noData" />;

    const s = shiftSummaryData;
    const categoryChartData = s.dailyBreakdown.map((r) => ({
      date: shortDate(r.date), Observations: r.observations, Actions: r.actions,
      'Samples Taken': r.samplesTaken, Incidents: r.incidents,
    }));
    const totalEntriesChartData = s.dailyBreakdown.map((r) => ({ date: shortDate(r.date), totalEntries: r.totalEntries }));

    return (
      <Box>
        <div ref={chartsRef} style={{ backgroundColor: '#fff' }}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <MetricCard label="Total Shifts" value={fmtInt(s.totalShifts)} color="#1565C0" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <MetricCard label="Total Entries" value={fmtInt(s.totalEntries)} color="#1B5E20" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <MetricCard label="Total Incidents" value={fmtInt(s.totalIncidents)} color="#B71C1C" />
            </Grid>
          </Grid>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <MetricCard label="Observations" value={fmtInt(s.totalObservations)} color="#0277BD" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <MetricCard label="Actions" value={fmtInt(s.totalActions)} color="#1B5E20" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <MetricCard label="Samples Taken" value={fmtInt(s.totalSamplesTaken)} color="#E65100" />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <ChartCard title="Entry Categories per Day" height={280}>
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend verticalAlign="bottom" />
                  <Bar dataKey="Observations" stackId="cat" fill="#1565C0" />
                  <Bar dataKey="Actions" stackId="cat" fill="#1B5E20" />
                  <Bar dataKey="Samples Taken" stackId="cat" fill="#E65100" />
                  <Bar dataKey="Incidents" stackId="cat" fill="#B71C1C" />
                </BarChart>
              </ChartCard>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <ChartCard title="Total Entries per Day" height={220}>
                <BarChart data={totalEntriesChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="totalEntries" name="Total Entries" fill="#1565C0" />
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
                <TableRow sx={{ backgroundColor: '#E8F5E9' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Shifts</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Total Entries</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Observations</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Samples Taken</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Incidents</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Shift Leaders</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {s.dailyBreakdown.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{row.date?.split('T')[0]}</TableCell>
                    <TableCell>{row.shiftCount}</TableCell>
                    <TableCell>{row.totalEntries}</TableCell>
                    <TableCell>{row.observations}</TableCell>
                    <TableCell>{row.actions}</TableCell>
                    <TableCell>{row.samplesTaken}</TableCell>
                    <TableCell>{row.incidents}</TableCell>
                    <TableCell>{row.shiftLeaders.join(', ') || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CollapsibleCard>
      </Box>
    );
  };

  const plantDisplayName = availablePlants.find((p) => p.plantCode === selectedPlant)?.plantName ?? selectedPlant;

  // ── Guards ────────────────────────────────────────────────────────────────
  if (isWrongPlantType) return (
    <Alert severity="warning" sx={{ m: 3 }}>
      This section is only available for thermal plants.
      <Button size="small" onClick={() => navigate(-1)} sx={{ ml: 2 }}>Go Back</Button>
    </Alert>
  );

  if (!canView) {
    return (
      <Box>
        <PageHeader title="Lab Reports" breadcrumbs={[{ label: 'Chemical Lab' }, { label: 'Lab Reports' }]} />
        <Alert severity="error">You don't have permission to view reports.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Lab Reports"
        subtitle="Water quality, chemical consumption and compliance reports for the chemical lab"
        breadcrumbs={[{ label: 'Chemical Lab' }, { label: 'Lab Reports' }]}
      />

      {/* Shared controls */}
      <Card elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ py: '14px !important' }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Science sx={{ color: ACCENT }} />
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
            {activeTab === 3 && (
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Report Period</InputLabel>
                <Select value={envPeriod} label="Report Period" onChange={(e) => setEnvPeriod(e.target.value)}>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="annual">Annual</MenuItem>
                </Select>
              </FormControl>
            )}
            <Button variant="contained" size="small" sx={{ backgroundColor: ACCENT }}
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
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1.5, py: 1,
            minHeight: 0,
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTabs-flexContainer': { gap: 1 },
            '& .MuiTab-root': {
              minHeight: 40, textTransform: 'none', fontWeight: 600,
              borderRadius: '20px', px: 2.5, color: 'text.secondary',
            },
            '& .MuiTab-root.Mui-selected': { backgroundColor: ACCENT, color: '#fff' },
          }}
        >
          {TABS.map((t) => (
            <Tab key={t.kind} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Card>

      {activeTab === 0 && renderWaterQualityTab()}
      {activeTab === 1 && renderChemicalConsumptionTab()}
      {activeTab === 2 && renderLubeOilTab()}
      {activeTab === 3 && renderEnvironmentalTab()}
      {activeTab === 4 && renderDesalinationTab()}
      {activeTab === 5 && renderShiftSummaryTab()}
    </Box>
  );
}
