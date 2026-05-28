import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';

// Master Data
import PlantClassificationPage from './pages/masterData/PlantClassificationPage';
import GenerationTypePage from './pages/masterData/GenerationTypePage';
import PowerPlantPage from './pages/masterData/PowerPlantPage';
import PlantLocationPage from './pages/masterData/PlantLocationPage';
import PlantUnitPage from './pages/masterData/PlantUnitPage';
import PlantUnitSystemPage from './pages/masterData/PlantUnitSystemPage';
import PlantUnitSubSystemPage from './pages/masterData/PlantUnitSubSystemPage';
import PlantUnitEquipmentPage from './pages/masterData/PlantUnitEquipmentPage';
import BalanceOfPlantPage from './pages/masterData/BalanceOfPlantPage';
import BopSystemPage from './pages/masterData/BopSystemPage';
import BopSubSystemPage from './pages/masterData/BopSubSystemPage';
import BopEquipmentPage from './pages/masterData/BopEquipmentPage';
import BearingMetalPage from './pages/masterData/BearingMetalPage';
import BearingDrainPage from './pages/masterData/BearingDrainPage';

// Hourly Readings
import HourlyHydroReadingPage from './pages/hourly/HourlyHydroReadingPage';
import HourlyThermalReadingPage from './pages/hourly/HourlyThermalReadingPage';
import HourlySystemConditionPage from './pages/hourly/HourlySystemConditionPage';

export default function App() {
  return (
    <BrowserRouter>
      <UnauthenticatedTemplate>
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </UnauthenticatedTemplate>

      <AuthenticatedTemplate>
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

            {/* Hourly Readings */}
            <Route path="hourly/hydro-units" element={<HourlyHydroReadingPage />} />
            <Route path="hourly/thermal-units" element={<HourlyThermalReadingPage />} />
            <Route path="hourly/system-conditions" element={<HourlySystemConditionPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthenticatedTemplate>
    </BrowserRouter>
  );
}