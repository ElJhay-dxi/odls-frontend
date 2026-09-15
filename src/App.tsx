import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react';
import { Box, CircularProgress } from '@mui/material';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/auth/LoginPage';
import { UserProvider } from './context/UserContext';
import UserGate from './components/auth/UserGate';
import PermissionGuard from './components/auth/PermissionGuard';

// Master Data
const PlantClassificationPage = lazy(() => import('./pages/masterData/PlantClassificationPage'));
const GenerationTypePage = lazy(() => import('./pages/masterData/GenerationTypePage'));
const PowerPlantPage = lazy(() => import('./pages/masterData/PowerPlantPage'));
const PlantLocationPage = lazy(() => import('./pages/masterData/PlantLocationPage'));
const PlantUnitPage = lazy(() => import('./pages/masterData/PlantUnitPage'));
const PlantUnitSystemPage = lazy(() => import('./pages/masterData/PlantUnitSystemPage'));
const PlantUnitSubSystemPage = lazy(() => import('./pages/masterData/PlantUnitSubSystemPage'));
const PlantUnitEquipmentPage = lazy(() => import('./pages/masterData/PlantUnitEquipmentPage'));
const BalanceOfPlantPage = lazy(() => import('./pages/masterData/BalanceOfPlantPage'));
const BopSystemPage = lazy(() => import('./pages/masterData/BopSystemPage'));
const BopSubSystemPage = lazy(() => import('./pages/masterData/BopSubSystemPage'));
const BopEquipmentPage = lazy(() => import('./pages/masterData/BopEquipmentPage'));
const BearingMetalPage = lazy(() => import('./pages/masterData/BearingMetalPage'));
const BearingDrainPage = lazy(() => import('./pages/masterData/BearingDrainPage'));
const PlantBusPage = lazy(() => import('./pages/masterData/PlantBusPage'));
const PlantLinePage = lazy(() => import('./pages/masterData/PlantLinePage'));
const SafetyDocumentTypesPage = lazy(() => import('./pages/masterData/SafetyDocumentTypesPage'));

// Hourly Readings
const HourlyHydroReadingPage = lazy(() => import('./pages/hourly/HourlyHydroReadingPage'));
const HourlyThermalReadingPage = lazy(() => import('./pages/hourly/HourlyThermalReadingPage'));
const HourlySystemConditionPage = lazy(() => import('./pages/hourly/HourlySystemConditionPage'));
const HourlyExchangeGenerationPage = lazy(() => import('./pages/hourly/HourlyExchangeGenerationPage'));
const HourlyBusVoltagePage = lazy(() => import('./pages/hourly/HourlyBusVoltagePage'));
const PeakPeriodPage = lazy(() => import('./pages/hourly/PeakPeriodPage'));

// Daily Readings
const DailyEnergyGenerationHydroPage = lazy(() => import('./pages/daily/DailyEnergyGenerationHydroPage'));
const DailyEnergyGenerationThermalPage = lazy(() => import('./pages/daily/DailyEnergyGenerationThermalPage'));
const FuelReadingsPage = lazy(() => import('./pages/daily/FuelReadingsPage'));
const DailyStationEnergyConsumptionPage = lazy(() => import('./pages/daily/DailyStationEnergyConsumptionPage'));
const DailySccReadingPage = lazy(() => import('./pages/daily/DailySccReadingPage'));
const DailyUnitAvailabilityPage = lazy(() => import('./pages/daily/DailyUnitAvailabilityPage'));
const DailyUnitTripsPage = lazy(() => import('./pages/daily/DailyUnitTripsPage'));
const DailyPlantReliabilityPage = lazy(() => import('./pages/daily/DailyPlantReliabilityPage'));
const DailyPlantLoadFactorPage = lazy(() => import('./pages/daily/DailyPlantLoadFactorPage'));
const WaterSystemReadingsPage = lazy(() => import('./pages/daily/WaterSystemReadingsPage'));
const HydrologyPage = lazy(() => import('./pages/daily/HydrologyPage'));

// Station Logs
const ShiftLogPage = lazy(() => import('./pages/stationLog/ShiftLogPage'));
const HydroStationLogPage = lazy(() => import('./pages/stationLog/HydroStationLogPage'));
const ThermalStationLogPage = lazy(() => import('./pages/stationLog/ThermalStationLogPage'));

// Chemical Lab
const LabShiftLogPage = lazy(() => import('./pages/lab/LabShiftLogPage'));
const LabAnalysisPage = lazy(() => import('./pages/lab/LabAnalysisPage'));
const LabSampleRecordsPage = lazy(() => import('./pages/lab/LabSampleRecordsPage'));
const LabSeaWaterPage = lazy(() => import('./pages/lab/LabSeaWaterPage'));
const LabDesalinationPage = lazy(() => import('./pages/lab/LabDesalinationPage'));
const LabChemicalDosingPage = lazy(() => import('./pages/lab/LabChemicalDosingPage'));
const LabLubeOilPage = lazy(() => import('./pages/lab/LabLubeOilPage'));
const LabEnvironmentalPage = lazy(() => import('./pages/lab/LabEnvironmentalPage'));
const LabCoolingWaterPage = lazy(() => import('./pages/lab/LabCoolingWaterPage'));
const LabReportsPage = lazy(() => import('./pages/lab/LabReportsPage'));
const LabAdminPage = lazy(() => import('./pages/lab/LabAdminPage'));

// Dashboard
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));

// Reports
const HydroReportsPage = lazy(() => import('./pages/reports/HydroReportsPage'));

// Admin
const PermissionsPage = lazy(() => import('./pages/admin/PermissionsPage'));
const RolesPage = lazy(() => import('./pages/admin/RolesPage'));
const RolePermissionsPage = lazy(() => import('./pages/admin/RolePermissionsPage'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'));

function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress />
    </Box>
  );
}

// Helper to wrap a page with a PermissionGuard
function G({ p, children }: { p: string; children: React.ReactNode }) {
  return <PermissionGuard permission={p}>{children}</PermissionGuard>;
}

export default function App() {
  return (
    <BrowserRouter>
      <UnauthenticatedTemplate>
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </UnauthenticatedTemplate>

      <AuthenticatedTemplate>
        <UserProvider>
          <UserGate>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<AppShell />}>
                  <Route index element={<DashboardPage />} />

                  {/* Master Data */}
                  <Route path="master/plant-classifications" element={<G p="master.view"><PlantClassificationPage /></G>} />
                  <Route path="master/generation-types" element={<G p="master.view"><GenerationTypePage /></G>} />
                  <Route path="master/plant-locations" element={<G p="master.view"><PlantLocationPage /></G>} />
                  <Route path="master/power-plants" element={<G p="master.view"><PowerPlantPage /></G>} />
                  <Route path="master/plant-units" element={<G p="master.view"><PlantUnitPage /></G>} />
                  <Route path="master/unit-systems" element={<G p="master.view"><PlantUnitSystemPage /></G>} />
                  <Route path="master/unit-subsystems" element={<G p="master.view"><PlantUnitSubSystemPage /></G>} />
                  <Route path="master/unit-equipment" element={<G p="master.view"><PlantUnitEquipmentPage /></G>} />
                  <Route path="master/bop" element={<G p="master.view"><BalanceOfPlantPage /></G>} />
                  <Route path="master/bop-systems" element={<G p="master.view"><BopSystemPage /></G>} />
                  <Route path="master/bop-subsystems" element={<G p="master.view"><BopSubSystemPage /></G>} />
                  <Route path="master/bop-equipment" element={<G p="master.view"><BopEquipmentPage /></G>} />
                  <Route path="master/bearing-metals" element={<G p="master.view"><BearingMetalPage /></G>} />
                  <Route path="master/bearing-drains" element={<G p="master.view"><BearingDrainPage /></G>} />
                  <Route path="master/plant-buses" element={<G p="master.view"><PlantBusPage /></G>} />
                  <Route path="master/plant-lines" element={<G p="master.view"><PlantLinePage /></G>} />
                  <Route path="master/safety-document-types" element={<G p="master.view"><SafetyDocumentTypesPage /></G>} />
                  {/* Hourly Readings */}
                  <Route path="hourly/hydro-units" element={<G p="hourly.hydro_units.view"><HourlyHydroReadingPage /></G>} />
                  <Route path="hourly/thermal-units" element={<G p="hourly.thermal_units.view"><HourlyThermalReadingPage /></G>} />
                  <Route path="hourly/system-conditions" element={<G p="hourly.system_conditions.view"><HourlySystemConditionPage /></G>} />
                  <Route path="hourly/exchange-generation" element={<G p="hourly.exchange_generation.view"><HourlyExchangeGenerationPage /></G>} />
                  <Route path="hourly/bus-voltages" element={<G p="hourly.bus_voltages.view"><HourlyBusVoltagePage /></G>} />
                  <Route path="hourly/peak-period" element={<G p="hourly.peak_period.view"><PeakPeriodPage /></G>} />

                  {/* Daily Readings */}
                  <Route path="daily/energy-generation-hydro" element={<G p="daily.energy_hydro.view"><DailyEnergyGenerationHydroPage /></G>} />
                  <Route path="daily/energy-generation-thermal" element={<G p="daily.energy_thermal.view"><DailyEnergyGenerationThermalPage /></G>} />
                  <Route path="daily/fuel-readings" element={<G p="daily.fuel_readings.view"><FuelReadingsPage /></G>} />
                  <Route path="daily/station-energy-consumption" element={<G p="daily.station_energy.view"><DailyStationEnergyConsumptionPage /></G>} />
                  <Route path="daily/scc-readings" element={<G p="daily.scc.view"><DailySccReadingPage /></G>} />
                  <Route path="daily/unit-availability" element={<G p="daily.plant_availability.view"><DailyUnitAvailabilityPage /></G>} />
                  <Route path="daily/unit-trips" element={<G p="daily.plant_trips.view"><DailyUnitTripsPage /></G>} />
                  <Route path="daily/plant-reliability" element={<G p="daily.plant_reliability.view"><DailyPlantReliabilityPage /></G>} />
                  <Route path="daily/plant-load-factor" element={<G p="daily.plant_load_factor.view"><DailyPlantLoadFactorPage /></G>} />
                  <Route path="daily/water-system" element={<G p="daily.water_system.view"><WaterSystemReadingsPage /></G>} />
                  <Route path="hydrology" element={<G p="daily.hydrology.view"><HydrologyPage /></G>} />

                  {/* Station Logs */}
                  <Route path="station-logs/shift-logs" element={<G p="station_logs.shift_logs.view"><ShiftLogPage /></G>} />
                  <Route path="station-logs/hydro" element={<G p="station_logs.hydro.view"><HydroStationLogPage /></G>} />
                  <Route path="station-logs/thermal" element={<G p="station_logs.thermal.view"><ThermalStationLogPage /></G>} />

                  {/* Chemical Lab */}
                  <Route path="lab/shift-log" element={<G p="lab.shift_logs.view"><LabShiftLogPage /></G>} />
                  <Route path="lab/analysis" element={<G p="lab.analysis.view"><LabAnalysisPage /></G>} />
                  <Route path="lab/samples" element={<G p="lab.samples.view"><LabSampleRecordsPage /></G>} />
                  <Route path="lab/seawater" element={<G p="lab.seawater.view"><LabSeaWaterPage /></G>} />
                  <Route path="lab/desalination" element={<G p="lab.desalination.view"><LabDesalinationPage /></G>} />
                  <Route path="lab/dosing" element={<G p="lab.dosing.view"><LabChemicalDosingPage /></G>} />
                  <Route path="lab/lube-oil" element={<G p="lab.lubeoil.view"><LabLubeOilPage /></G>} />
                  <Route path="lab/environmental" element={<G p="lab.environmental.view"><LabEnvironmentalPage /></G>} />
                  <Route path="lab/cooling-water" element={<G p="lab.coolingwater.view"><LabCoolingWaterPage /></G>} />
                  <Route path="lab/reports" element={<G p="lab.reports.view"><LabReportsPage /></G>} />
                  <Route path="lab/admin" element={<G p="lab.control_limits.view"><LabAdminPage /></G>} />

                  {/* Reports */}
                  <Route path="reports/hydro" element={<G p="reports.view"><HydroReportsPage /></G>} />

                  {/* Admin */}
                  <Route path="admin/permissions" element={<G p="permissions.view"><PermissionsPage /></G>} />
                  <Route path="admin/roles" element={<G p="roles.view"><RolesPage /></G>} />
                  <Route path="admin/role-permissions" element={<G p="roles.edit"><RolePermissionsPage /></G>} />
                  <Route path="admin/users" element={<G p="users.view"><UsersPage /></G>} />
                  <Route path="admin/audit-log" element={<G p="admin.audit.view"><AuditLogPage /></G>} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </UserGate>
        </UserProvider>
      </AuthenticatedTemplate>
    </BrowserRouter>
  );
}