import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react';
import { Box, CircularProgress } from '@mui/material';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/auth/LoginPage';

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
const DailyReactivePowerPage = lazy(() => import('./pages/daily/DailyReactivePowerPage'));
const DailyLcoReadingPage = lazy(() => import('./pages/daily/DailyLcoReadingPage'));
const DailyDfoReadingPage = lazy(() => import('./pages/daily/DailyDfoReadingPage'));
const DailyNaturalGasTurbinePage = lazy(() => import('./pages/daily/DailyNaturalGasTurbinePage'));
const DailyNaturalGasChromatographPage = lazy(() => import('./pages/daily/DailyNaturalGasChromatographPage'));
const DailyStationEnergyConsumptionPage = lazy(() => import('./pages/daily/DailyStationEnergyConsumptionPage'));
const DailySccReadingPage = lazy(() => import('./pages/daily/DailySccReadingPage'));
const DailyPlantAvailabilityPage = lazy(() => import('./pages/daily/DailyPlantAvailabilityPage'));
const DailyPlantTripPage = lazy(() => import('./pages/daily/DailyPlantTripPage'));
const DailyPlantReliabilityPage = lazy(() => import('./pages/daily/DailyPlantReliabilityPage'));
const DailyPlantLoadFactorPage = lazy(() => import('./pages/daily/DailyPlantLoadFactorPage'));
const WaterSystemReadingsPage = lazy(() => import('./pages/daily/WaterSystemReadingsPage'));

// Dashboard
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));

function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress />
    </Box>
  );
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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<AppShell />}>
              <Route index element={<DashboardPage />} />

              {/* Master Data */}
              <Route path="master/plant-classifications" element={<PlantClassificationPage />} />
              <Route path="master/generation-types" element={<GenerationTypePage />} />
              <Route path="master/plant-locations" element={<PlantLocationPage />} />
              <Route path="master/power-plants" element={<PowerPlantPage />} />
              <Route path="master/plant-units" element={<PlantUnitPage />} />
              <Route path="master/unit-systems" element={<PlantUnitSystemPage />} />
              <Route path="master/unit-subsystems" element={<PlantUnitSubSystemPage />} />
              <Route path="master/unit-equipment" element={<PlantUnitEquipmentPage />} />
              <Route path="master/bop" element={<BalanceOfPlantPage />} />
              <Route path="master/bop-systems" element={<BopSystemPage />} />
              <Route path="master/bop-subsystems" element={<BopSubSystemPage />} />
              <Route path="master/bop-equipment" element={<BopEquipmentPage />} />
              <Route path="master/bearing-metals" element={<BearingMetalPage />} />
              <Route path="master/bearing-drains" element={<BearingDrainPage />} />
              <Route path="master/plant-buses" element={<PlantBusPage />} />

              {/* Hourly Readings */}
              <Route path="hourly/hydro-units" element={<HourlyHydroReadingPage />} />
              <Route path="hourly/thermal-units" element={<HourlyThermalReadingPage />} />
              <Route path="hourly/system-conditions" element={<HourlySystemConditionPage />} />
              <Route path="hourly/exchange-generation" element={<HourlyExchangeGenerationPage />} />
              <Route path="hourly/bus-voltages" element={<HourlyBusVoltagePage />} />
            <Route path="hourly/peak-period" element={<PeakPeriodPage />} />

              {/* Daily Readings */}
            <Route path="daily/energy-generation-hydro" element={<DailyEnergyGenerationHydroPage />} />
            <Route path="daily/energy-generation-thermal" element={<DailyEnergyGenerationThermalPage />} />
            <Route path="daily/reactive-power" element={<DailyReactivePowerPage />} />
            <Route path="daily/lco-readings" element={<DailyLcoReadingPage />} />
            <Route path="daily/dfo-readings" element={<DailyDfoReadingPage />} />
            <Route path="daily/natural-gas-turbine" element={<DailyNaturalGasTurbinePage />} />
            <Route path="daily/natural-gas-chromatograph" element={<DailyNaturalGasChromatographPage />} />
            <Route path="daily/station-energy-consumption" element={<DailyStationEnergyConsumptionPage />} />
            <Route path="daily/scc-readings" element={<DailySccReadingPage />} />
            <Route path="daily/plant-availability" element={<DailyPlantAvailabilityPage />} />
            <Route path="daily/plant-trips" element={<DailyPlantTripPage />} />
            <Route path="daily/plant-reliability" element={<DailyPlantReliabilityPage />} />
            <Route path="daily/plant-load-factor" element={<DailyPlantLoadFactorPage />} />
            <Route path="daily/water-system" element={<WaterSystemReadingsPage />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthenticatedTemplate>
    </BrowserRouter>
  );
}