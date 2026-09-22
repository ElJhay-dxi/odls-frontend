import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  Alert, MenuItem, FormControl, InputLabel, Select, Chip,
  Stack, TextField, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Tabs, Tab, Collapse,
} from '@mui/material';
import {
  LocalFireDepartment, Assignment, BarChart as BarChartIcon, Whatshot,
  OilBarrel, Speed, ReportProblem, TableChart, ExpandMore, ExpandLess,
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import { powerPlantApi } from '../../api/masterData/powerPlantApi';
import { thermalReportsApi } from '../../api/reports/thermalReportsApi';
import type {
  ThermalGenerationReport, ThermalAvailabilityReport, ThermalTripsReport,
  ThermalFuelConsumptionReport, ThermalLoadFactorReport, ThermalCriticalIssuesReport,
} from '../../api/reports/thermalReportsApi';
import type { PowerPlant } from '../../types/masterData';
import { useSectionPermissions, usePlantFilter } from '../../hooks/usePermission';
import { usePlantTypeGuard } from '../../hooks/usePlantTypeGuard';

// ─── Formatting helpers ──────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];
const daysAgoStr = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

const fmt = (v?: number | null, digits = 3) => (v === null || v === undefined ? '—' : v.toFixed(digits));
const fmtPct = (v?: number | null, digits = 2) => (v === null || v === undefined ? '—' : `${v.toFixed(digits)}%`);

const FUEL_CHIP_SX: Record<string, { backgroundColor: string; color: string; fontWeight: number }> = {
  Gas: { backgroundColor: '#E8F5E9', color: '#1B5E20', fontWeight: 700 },
  DFO: { backgroundColor: '#FBE9E7', color: '#E65100', fontWeight: 700 },
};
const getFuelChipSx = (fuel: string) => FUEL_CHIP_SX[fuel] ?? { backgroundColor: undefined, color: undefined, fontWeight: 700 };

const RISK_CHIP_SX: Record<string, { color: string; backgroundColor: string }> = {
  Low: { color: '#1B5E20', backgroundColor: '#E8F5E9' },
  Medium: { color: '#F57F17', backgroundColor: '#FFF9C4' },
  High: { color: '#E65100', backgroundColor: '#FBE9E7' },
  Severe: { color: '#B71C1C', backgroundColor: '#FFEBEE' },
};
const getRiskChipSx = (risk?: string) => (risk ? RISK_CHIP_SX[risk] ?? {} : {});

const getLoadFactorChipSx = (pct?: number | null) => {
  if (pct == null) return {};
  if (pct >= 80) return { color: '#1B5E20', backgroundColor: '#E8F5E9' };
  if (pct >= 60) return { color: '#F57F17', backgroundColor: '#FFF9C4' };
  return { color: '#B71C1C', backgroundColor: '#FFEBEE' };
};

type TabKind = 'generation' | 'availability' | 'trips' | 'fuelconsumption' | 'loadfactor' | 'criticalissues';

const TABS: { label: string; icon: React.ReactElement; kind: TabKind }[] = [
  { label: 'Daily Generation', icon: <Assignment fontSize="small" />, kind: 'generation' },
  { label: 'Availability & Reliability', icon: <BarChartIcon fontSize="small" />, kind: 'availability' },
  { label: 'Unit Trips', icon: <Whatshot fontSize="small" />, kind: 'trips' },
  { label: 'Fuel Consumption', icon: <OilBarrel fontSize="small" />, kind: 'fuelconsumption' },
  { label: 'Load Factor', icon: <Speed fontSize="small" />, kind: 'loadfactor' },
  { label: 'Critical Issues', icon: <ReportProblem fontSize="small" />, kind: 'criticalissues' },
];

const EXPORT_FILENAME_PREFIX: Record<TabKind, string> = {
  generation: 'ThermalGeneration',
  availability: 'ThermalAvailability',
  trips: 'ThermalTrips',
  fuelconsumption: 'ThermalFuelConsumption',
  loadfactor: 'ThermalLoadFactor',
  criticalissues: 'ThermalCriticalIssues',
};

// ─── Reusable presentational pieces ──────────────────────────────────────────
function TableHeadRow({ children }: { children: React.ReactNode }) {
  return (
    <TableHead>
      <TableRow sx={{ '& th': { backgroundColor: '#1B3A5C', color: '#fff', fontWeight: 700 } }}>
        {children}
      </TableRow>
    </TableHead>
  );
}

function UnitCell({ code, name }: { code: string; name: string }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <Chip label={code} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
      <Typography variant="body2">{name}</Typography>
    </Stack>
  );
}

function CollapsibleSection({
  title, headerColor = '#1B5E20', children,
}: { title: string; headerColor?: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
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

function TabLoading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress size={32} />
    </Box>
  );
}

function TabEmpty({ initial }: { initial: boolean }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ textAlign: 'center', py: 8 }}>
        <LocalFireDepartment sx={{ fontSize: 80, color: '#B71C1C', opacity: 0.3, mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
          {initial ? 'Select a plant and date range' : 'No data found for selected period'}
        </Typography>
        {initial && (
          <Typography variant="body2" color="text.secondary">
            Choose your filters above and click Generate to load the report.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function ThermalReportsPage() {
  const navigate = useNavigate();
  const isWrongPlantType = usePlantTypeGuard('thermal');
  const { canView, canExport } = useSectionPermissions('reports.thermal');

  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const { availablePlants, plantLocked, autoPlantCode } = usePlantFilter(plants);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [dateFrom, setDateFrom] = useState(daysAgoStr(7));
  const [dateTo, setDateTo] = useState(todayStr());
  const [activeTab, setActiveTab] = useState(0);

  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [hasGenerated, setHasGenerated] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<Record<number, string | null>>({});
  const [exportingExcel, setExportingExcel] = useState(false);

  const [generationData, setGenerationData] = useState<ThermalGenerationReport | null>(null);
  const [availabilityData, setAvailabilityData] = useState<ThermalAvailabilityReport | null>(null);
  const [tripsData, setTripsData] = useState<ThermalTripsReport | null>(null);
  const [fuelData, setFuelData] = useState<ThermalFuelConsumptionReport | null>(null);
  const [loadFactorData, setLoadFactorData] = useState<ThermalLoadFactorReport | null>(null);
  const [criticalIssuesData, setCriticalIssuesData] = useState<ThermalCriticalIssuesReport | null>(null);

  useEffect(() => {
    powerPlantApi.getAll().then((res) =>
      setPlants(res.data.filter((p) => p.classificationType === 'Thermal'))
    );
  }, []);

  useEffect(() => {
    if (autoPlantCode) setSelectedPlant(autoPlantCode);
  }, [autoPlantCode]);

  const handleGenerate = async () => {
    if (!selectedPlant || !dateFrom || !dateTo) return;
    if (dateFrom > dateTo) {
      setError((prev) => ({ ...prev, [activeTab]: 'Date From must be on or before Date To.' }));
      return;
    }

    setLoading((prev) => ({ ...prev, [activeTab]: true }));
    setError((prev) => ({ ...prev, [activeTab]: null }));
    try {
      switch (TABS[activeTab].kind) {
        case 'generation': {
          const res = await thermalReportsApi.getGeneration(selectedPlant, dateFrom, dateTo);
          setGenerationData(res.data);
          break;
        }
        case 'availability': {
          const res = await thermalReportsApi.getAvailability(selectedPlant, dateFrom, dateTo);
          setAvailabilityData(res.data);
          break;
        }
        case 'trips': {
          const res = await thermalReportsApi.getTrips(selectedPlant, dateFrom, dateTo);
          setTripsData(res.data);
          break;
        }
        case 'fuelconsumption': {
          const res = await thermalReportsApi.getFuelConsumption(selectedPlant, dateFrom, dateTo);
          setFuelData(res.data);
          break;
        }
        case 'loadfactor': {
          const res = await thermalReportsApi.getLoadFactor(selectedPlant, dateFrom, dateTo);
          setLoadFactorData(res.data);
          break;
        }
        case 'criticalissues': {
          const res = await thermalReportsApi.getCriticalIssues(selectedPlant, dateFrom, dateTo);
          setCriticalIssuesData(res.data);
          break;
        }
      }
      setHasGenerated((prev) => ({ ...prev, [activeTab]: true }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError((prev) => ({ ...prev, [activeTab]: msg ?? 'Failed to generate report.' }));
    } finally {
      setLoading((prev) => ({ ...prev, [activeTab]: false }));
    }
  };

  const downloadExcel = async (fn: () => Promise<{ data: Blob }>, filename: string) => {
    try {
      const res = await fn();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError((prev) => ({ ...prev, [activeTab]: 'Failed to export Excel file.' }));
    }
  };

  const handleExportExcel = async () => {
    if (!selectedPlant) return;
    const kind = TABS[activeTab].kind;
    const filename = `${EXPORT_FILENAME_PREFIX[kind]}_${selectedPlant}_${dateFrom}_${dateTo}.xlsx`;
    setExportingExcel(true);
    try {
      switch (kind) {
        case 'generation':
          await downloadExcel(() => thermalReportsApi.exportGenerationExcel(selectedPlant, dateFrom, dateTo), filename);
          break;
        case 'availability':
          await downloadExcel(() => thermalReportsApi.exportAvailabilityExcel(selectedPlant, dateFrom, dateTo), filename);
          break;
        case 'trips':
          await downloadExcel(() => thermalReportsApi.exportTripsExcel(selectedPlant, dateFrom, dateTo), filename);
          break;
        case 'fuelconsumption':
          await downloadExcel(() => thermalReportsApi.exportFuelConsumptionExcel(selectedPlant, dateFrom, dateTo), filename);
          break;
        case 'loadfactor':
          await downloadExcel(() => thermalReportsApi.exportLoadFactorExcel(selectedPlant, dateFrom, dateTo), filename);
          break;
        case 'criticalissues':
          await downloadExcel(() => thermalReportsApi.exportCriticalIssuesExcel(selectedPlant, dateFrom, dateTo), filename);
          break;
      }
    } finally {
      setExportingExcel(false);
    }
  };

  // ── Tab 1: Daily Generation ────────────────────────────────────────────────
  const renderGenerationTab = () => {
    if (loading[0]) return <TabLoading />;
    if (!hasGenerated[0]) return <TabEmpty initial />;
    if (!generationData || generationData.rows.length === 0) return <TabEmpty initial={false} />;

    return (
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <TableContainer>
          <Table size="small">
            <TableHeadRow>
              <TableCell>Date</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Fuel Type</TableCell>
              <TableCell>Active (MWh)</TableCell>
              <TableCell>Reactive (MVArh)</TableCell>
              <TableCell>Avg Active (MW)</TableCell>
              <TableCell>Avg Reactive (MVAr)</TableCell>
              <TableCell>Active Prog. Total</TableCell>
              <TableCell>Reactive Prog. Total</TableCell>
            </TableHeadRow>
            <TableBody>
              {generationData.rows.map((row, idx) => (
                <TableRow key={idx} hover sx={{ backgroundColor: idx % 2 === 1 ? 'action.hover' : 'inherit' }}>
                  <TableCell>{row.date?.split('T')[0]}</TableCell>
                  <TableCell><UnitCell code={row.unitCode} name={row.unitName} /></TableCell>
                  <TableCell><Chip label={row.fuelType} size="small" sx={getFuelChipSx(row.fuelType)} /></TableCell>
                  <TableCell>{fmt(row.activeDifference)}</TableCell>
                  <TableCell>{fmt(row.reactiveDifference)}</TableCell>
                  <TableCell>{fmt(row.averageActiveLoad)}</TableCell>
                  <TableCell>{fmt(row.averageReactiveLoad)}</TableCell>
                  <TableCell>{fmt(row.activeProgressiveTotal)}</TableCell>
                  <TableCell>{fmt(row.reactiveProgressiveTotal)}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                <TableCell colSpan={3} sx={{ fontWeight: 700 }}>Totals</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{fmt(generationData.totalActiveMwh)} MWh</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{fmt(generationData.totalReactiveMvarh)} MVArh</TableCell>
                <TableCell colSpan={4} />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    );
  };

  // ── Tab 2: Availability & Reliability ──────────────────────────────────────
  const renderAvailabilityTab = () => {
    if (loading[1]) return <TabLoading />;
    if (!hasGenerated[1]) return <TabEmpty initial />;
    if (!availabilityData
      || (availabilityData.availabilityRows.length === 0
        && availabilityData.reliabilityRows.length === 0
        && availabilityData.tripRows.length === 0)) {
      return <TabEmpty initial={false} />;
    }

    const { availabilityRows, reliabilityRows, tripRows } = availabilityData;

    return (
      <Stack spacing={2}>
        <CollapsibleSection title="Availability" headerColor="#1B5E20">
          {availabilityRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>
              No availability data for this period.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHeadRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Svc Hrs</TableCell>
                  <TableCell>Run Hrs</TableCell>
                  <TableCell>Reserve Shutdown</TableCell>
                  <TableCell>Forced Outage</TableCell>
                  <TableCell>Maint. Outage</TableCell>
                  <TableCell>Planned Outage</TableCell>
                  <TableCell>Available Hrs</TableCell>
                  <TableCell>Unavailable Hrs</TableCell>
                  <TableCell>Avail. (%)</TableCell>
                  <TableCell>Forced (%)</TableCell>
                  <TableCell>Capacity (%)</TableCell>
                  <TableCell>Planned (%)</TableCell>
                  <TableCell>Maint. (%)</TableCell>
                  <TableCell>Scheduled (%)</TableCell>
                </TableHeadRow>
                <TableBody>
                  {availabilityRows.map((row, idx) => (
                    <TableRow key={idx} hover sx={{ backgroundColor: idx % 2 === 1 ? 'action.hover' : 'inherit' }}>
                      <TableCell>{row.date?.split('T')[0]}</TableCell>
                      <TableCell>{fmt(row.serviceHours, 1)}</TableCell>
                      <TableCell>{fmt(row.runHours, 1)}</TableCell>
                      <TableCell>{fmt(row.reserveShutdownHours, 1)}</TableCell>
                      <TableCell>{fmt(row.forcedOutageHours, 1)}</TableCell>
                      <TableCell>{fmt(row.maintenanceOutageHours, 1)}</TableCell>
                      <TableCell>{fmt(row.plannedOutageHours, 1)}</TableCell>
                      <TableCell>{fmt(row.availableHours, 1)}</TableCell>
                      <TableCell>{fmt(row.unavailableHours, 1)}</TableCell>
                      <TableCell>{fmtPct(row.availabilityFactor)}</TableCell>
                      <TableCell>{fmtPct(row.forcedOutageFactor)}</TableCell>
                      <TableCell>{fmtPct(row.capacityFactor)}</TableCell>
                      <TableCell>{fmtPct(row.plannedOutageFactor)}</TableCell>
                      <TableCell>{fmtPct(row.maintenanceOutageFactor)}</TableCell>
                      <TableCell>{fmtPct(row.scheduledOutageFactor)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Reliability" headerColor="#E65100">
          {reliabilityRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>
              No reliability data for this period.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHeadRow>
                  <TableCell>Date</TableCell>
                  <TableCell>MTBF</TableCell>
                  <TableCell>Successful Starts</TableCell>
                  <TableCell>Unsuccessful Starts</TableCell>
                  <TableCell>Start Attempts</TableCell>
                  <TableCell>Starting Reliability (%)</TableCell>
                </TableHeadRow>
                <TableBody>
                  {reliabilityRows.map((row, idx) => (
                    <TableRow key={idx} hover sx={{ backgroundColor: idx % 2 === 1 ? 'action.hover' : 'inherit' }}>
                      <TableCell>{row.date?.split('T')[0]}</TableCell>
                      <TableCell>{fmt(row.mtbf, 1)}</TableCell>
                      <TableCell>{row.successfulStarts ?? '—'}</TableCell>
                      <TableCell>{row.unsuccessfulStarts ?? '—'}</TableCell>
                      <TableCell>{row.startAttempts ?? '—'}</TableCell>
                      <TableCell>{fmtPct(row.startingReliabilityPct, 1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Unit Trips" headerColor="#B71C1C">
          {tripRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontStyle: 'italic' }}>
              No trips recorded for this period.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHeadRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>PLS</TableCell>
                  <TableCell>Shutdown</TableCell>
                  <TableCell>Low Load</TableCell>
                  <TableCell>High Load</TableCell>
                  <TableCell>Pre-Ignition</TableCell>
                  <TableCell>Pre-Sync</TableCell>
                  <TableCell>Partial Load</TableCell>
                  <TableCell>Full Load</TableCell>
                  <TableCell>Total</TableCell>
                </TableHeadRow>
                <TableBody>
                  {tripRows.map((row, idx) => (
                    <TableRow key={idx} hover sx={{ backgroundColor: idx % 2 === 1 ? 'action.hover' : 'inherit' }}>
                      <TableCell>{row.date?.split('T')[0]}</TableCell>
                      <TableCell><UnitCell code={row.unitCode} name={row.unitName} /></TableCell>
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
        </CollapsibleSection>
      </Stack>
    );
  };

  // ── Tab 3: Unit Trips ──────────────────────────────────────────────────────
  const renderTripsTab = () => {
    if (loading[2]) return <TabLoading />;
    if (!hasGenerated[2]) return <TabEmpty initial />;
    if (!tripsData || tripsData.rows.length === 0) return <TabEmpty initial={false} />;

    return (
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <TableContainer>
          <Table size="small">
            <TableHeadRow>
              <TableCell>Date</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>PLS</TableCell>
              <TableCell>Shutdown</TableCell>
              <TableCell>Low Load</TableCell>
              <TableCell>High Load</TableCell>
              <TableCell>Pre-Ignition</TableCell>
              <TableCell>Pre-Sync</TableCell>
              <TableCell>Partial Load</TableCell>
              <TableCell>Full Load</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Remarks</TableCell>
            </TableHeadRow>
            <TableBody>
              {tripsData.rows.map((row, idx) => (
                <TableRow key={idx} hover sx={{ backgroundColor: idx % 2 === 1 ? 'action.hover' : 'inherit' }}>
                  <TableCell>{row.date?.split('T')[0]}</TableCell>
                  <TableCell><UnitCell code={row.unitCode} name={row.unitName} /></TableCell>
                  <TableCell>{row.pls ?? '—'}</TableCell>
                  <TableCell>{row.shutdown ?? '—'}</TableCell>
                  <TableCell>{row.lowLoadTrip ?? '—'}</TableCell>
                  <TableCell>{row.highLoadTrip ?? '—'}</TableCell>
                  <TableCell>{row.preIgnition ?? '—'}</TableCell>
                  <TableCell>{row.preSync ?? '—'}</TableCell>
                  <TableCell>{row.partialLoadTrip ?? '—'}</TableCell>
                  <TableCell>{row.fullLoadTrip ?? '—'}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{row.totalTrips ?? '—'}</TableCell>
                  <TableCell>{row.remarks || '—'}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }} colSpan={2}>Totals</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{tripsData.totalPls}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{tripsData.totalShutdown}</TableCell>
                <TableCell colSpan={6} />
                <TableCell sx={{ fontWeight: 700 }}>{tripsData.grandTotal}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    );
  };

  // ── Tab 4: Fuel Consumption ────────────────────────────────────────────────
  const renderFuelTab = () => {
    if (loading[3]) return <TabLoading />;
    if (!hasGenerated[3]) return <TabEmpty initial />;
    if (!fuelData || fuelData.rows.length === 0) return <TabEmpty initial={false} />;

    return (
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <TableContainer>
          <Table size="small">
            <TableHeadRow>
              <TableCell>Date</TableCell>
              <TableCell>Gas Consumed</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Liquid Fuel (MT)</TableCell>
              <TableCell>Total Generation (MWh)</TableCell>
              <TableCell>Net Generation (MWh)</TableCell>
              <TableCell>Station Service (MWh)</TableCell>
            </TableHeadRow>
            <TableBody>
              {fuelData.rows.map((row, idx) => (
                <TableRow key={idx} hover sx={{ backgroundColor: idx % 2 === 1 ? 'action.hover' : 'inherit' }}>
                  <TableCell>{row.date?.split('T')[0]}</TableCell>
                  <TableCell>{fmt(row.totalGasConsumed)}</TableCell>
                  <TableCell>{row.totalGasConsumedUnit || '—'}</TableCell>
                  <TableCell>{fmt(row.totalLiquidFuelConsumedMt)}</TableCell>
                  <TableCell>{fmt(row.totalGenerationMwh)}</TableCell>
                  <TableCell>{fmt(row.netGenerationMwh)}</TableCell>
                  <TableCell>{fmt(row.totalStationServiceMwh)}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Totals</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{fmt(fuelData.totalGas)}</TableCell>
                <TableCell />
                <TableCell sx={{ fontWeight: 700 }}>{fmt(fuelData.totalLiquidFuel)}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{fmt(fuelData.totalGenerationMwh)}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{fmt(fuelData.totalNetGenerationMwh)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    );
  };

  // ── Tab 5: Load Factor ─────────────────────────────────────────────────────
  const renderLoadFactorTab = () => {
    if (loading[4]) return <TabLoading />;
    if (!hasGenerated[4]) return <TabEmpty initial />;
    if (!loadFactorData || loadFactorData.rows.length === 0) return <TabEmpty initial={false} />;

    return (
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <TableContainer>
          <Table size="small">
            <TableHeadRow>
              <TableCell>Date</TableCell>
              <TableCell>Energy Generated (MWh)</TableCell>
              <TableCell>Plant Peak Load (MW)</TableCell>
              <TableCell>Associated Time</TableCell>
              <TableCell>Load Factor (%)</TableCell>
            </TableHeadRow>
            <TableBody>
              {loadFactorData.rows.map((row, idx) => (
                <TableRow key={idx} hover sx={{ backgroundColor: idx % 2 === 1 ? 'action.hover' : 'inherit' }}>
                  <TableCell>{row.date?.split('T')[0]}</TableCell>
                  <TableCell>{fmt(row.energyGeneratedMwh)}</TableCell>
                  <TableCell>{fmt(row.plantPeakLoadMw)}</TableCell>
                  <TableCell>{row.associatedTime || '—'}</TableCell>
                  <TableCell>
                    <Chip label={fmtPct(row.loadFactorPct)} size="small" sx={getLoadFactorChipSx(row.loadFactorPct)} />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Totals</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{fmt(loadFactorData.totalEnergyMwh)}</TableCell>
                <TableCell colSpan={2} />
                <TableCell sx={{ fontWeight: 700 }}>Avg: {fmtPct(loadFactorData.averageLoadFactorPct)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    );
  };

  // ── Tab 6: Critical Issues ─────────────────────────────────────────────────
  const renderCriticalIssuesTab = () => {
    if (loading[5]) return <TabLoading />;
    if (!hasGenerated[5]) return <TabEmpty initial />;
    if (!criticalIssuesData || criticalIssuesData.rows.length === 0) return <TabEmpty initial={false} />;

    return (
      <Box>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip label={`${criticalIssuesData.totalOpen} Open`} color="error" size="small" />
          <Chip label={`${criticalIssuesData.totalResolved} Resolved`} color="success" size="small" />
        </Stack>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <TableContainer>
            <Table size="small">
              <TableHeadRow>
                <TableCell>Log Date</TableCell>
                <TableCell>Date Observed</TableCell>
                <TableCell>Equipment</TableCell>
                <TableCell>Description of Fault</TableCell>
                <TableCell>Risk</TableCell>
                <TableCell>Impact</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Resolved On</TableCell>
                <TableCell>Resolved By</TableCell>
                <TableCell>Logged By</TableCell>
              </TableHeadRow>
              <TableBody>
                {criticalIssuesData.rows.map((row, idx) => (
                  <TableRow key={idx} hover sx={{ backgroundColor: idx % 2 === 1 ? 'action.hover' : 'inherit' }}>
                    <TableCell>{row.logDate?.split('T')[0]}</TableCell>
                    <TableCell>{row.dateObserved?.split('T')[0] ?? '—'}</TableCell>
                    <TableCell>
                      {row.equipmentCode
                        ? <UnitCell code={row.equipmentCode} name={row.equipmentName ?? ''} />
                        : (row.equipmentName || '—')}
                    </TableCell>
                    <TableCell>{row.descriptionOfFault || '—'}</TableCell>
                    <TableCell>
                      {row.riskInvolved
                        ? <Chip label={row.riskInvolved} size="small" sx={getRiskChipSx(row.riskInvolved)} />
                        : '—'}
                    </TableCell>
                    <TableCell>{row.impact || '—'}</TableCell>
                    <TableCell>
                      <Chip label={row.status} size="small" color={row.status === 'Open' ? 'error' : 'success'} />
                    </TableCell>
                    <TableCell>{row.resolvedOn?.split('T')[0] ?? '—'}</TableCell>
                    <TableCell>{row.resolvedBy || '—'}</TableCell>
                    <TableCell>{row.createdByName || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>
    );
  };

  const plantDisplayName = availablePlants.find((p) => p.plantCode === selectedPlant)?.plantName ?? selectedPlant;

  // ── Guards ────────────────────────────────────────────────────────────────
  if (isWrongPlantType) {
    return (
      <Box>
        <PageHeader title="Thermal Reports" breadcrumbs={[{ label: 'Reports' }, { label: 'Thermal Reports' }]} />
        <Alert severity="warning"
          action={<Button color="inherit" size="small" onClick={() => navigate(-1)}>Go Back</Button>}>
          Your plant assignment is for a hydro plant. You don't have access to thermal reports.
        </Alert>
      </Box>
    );
  }

  if (!canView) {
    return (
      <Box>
        <PageHeader title="Thermal Reports" breadcrumbs={[{ label: 'Reports' }, { label: 'Thermal Reports' }]} />
        <Alert severity="error">You don't have permission to view reports.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Thermal Reports"
        subtitle="Generation metrics and operational reports for thermal plants"
        breadcrumbs={[{ label: 'Reports' }, { label: 'Thermal Reports' }]}
      />

      {/* Shared controls */}
      <Card elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ py: '14px !important' }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <LocalFireDepartment sx={{ color: '#B71C1C' }} />
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
            <Button variant="contained" size="small" sx={{ backgroundColor: '#B71C1C' }}
              startIcon={loading[activeTab] ? <CircularProgress size={14} color="inherit" /> : undefined}
              onClick={handleGenerate} disabled={loading[activeTab] || !selectedPlant || !dateFrom || !dateTo}>
              {loading[activeTab] ? 'Generating...' : 'Generate'}
            </Button>

            {hasGenerated[activeTab] && canExport && (
              <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
                <Button variant="outlined" size="small"
                  startIcon={exportingExcel ? <CircularProgress size={14} /> : <TableChart />}
                  onClick={handleExportExcel} disabled={exportingExcel}>
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

      {error[activeTab] && <Alert severity="error" onClose={() => setError((prev) => ({ ...prev, [activeTab]: null }))} sx={{ mb: 2 }}>{error[activeTab]}</Alert>}

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
            '& .MuiTab-root.Mui-selected': { backgroundColor: '#B71C1C', color: '#fff' },
          }}
        >
          {TABS.map((t) => (
            <Tab key={t.kind} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Card>

      {activeTab === 0 && renderGenerationTab()}
      {activeTab === 1 && renderAvailabilityTab()}
      {activeTab === 2 && renderTripsTab()}
      {activeTab === 3 && renderFuelTab()}
      {activeTab === 4 && renderLoadFactorTab()}
      {activeTab === 5 && renderCriticalIssuesTab()}
    </Box>
  );
}
