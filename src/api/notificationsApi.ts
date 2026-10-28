import axiosInstance from './axiosInstance';

/** One entry in the notification bell — worked out live, so it disappears once the work is done. */
export interface NotificationItem {
  key: string;
  category: 'todo' | 'admin';
  type: string;
  severity: 'warning' | 'info';
  title: string;
  detail: string;
  plantCode?: string | null;
  date?: string | null;
  /** App path to open, e.g. "/hourly/thermal-units?plant=TTPC&date=2026-10-27" */
  link: string;
  count: number;
}

export interface NotificationsResponse {
  generatedAt: string;
  total: number;
  items: NotificationItem[];
}

export const notificationsApi = {
  get: () => axiosInstance.get<NotificationsResponse>('/notifications'),
};
