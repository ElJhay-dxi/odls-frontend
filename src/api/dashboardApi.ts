import axiosInstance from './axiosInstance';

export interface DashboardStats {
  totalPlants: number;
  thermalPlants: number;
  hydroPlants: number;
  solarPlants: number;
  windPlants: number;
  totalUnits: number;
}

export interface RecentActivityItem {
  id: string;
  action: string;       // e.g. "Created", "Updated", "Deleted"
  entity: string;       // e.g. "Power Plant", "Plant Unit"
  entityName: string;   // e.g. "Akosombo Hydro Plant"
  performedBy: string;
  performedAt: string;  // ISO datetime string
}

export const dashboardApi = {
  getStats: () =>
    axiosInstance.get<DashboardStats>('/dashboard/stats'),

  getRecentActivity: (limit = 20) =>
    axiosInstance.get<RecentActivityItem[]>(`/dashboard/recent-activity?limit=${limit}`),
};