import axiosInstance from '../axiosInstance';
import type { AppUser, Role, Permission } from '../../types/userManagement';

export const permissionsApi = {
  getAll: (group?: string) =>
    axiosInstance.get<Permission[]>('/permissions', { params: group ? { group } : undefined }),
  create: (data: Record<string, unknown>) =>
    axiosInstance.post<Permission>('/permissions', data),
  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put<Permission>(`/permissions/${id}`, data),
  delete: (id: string) =>
    axiosInstance.delete(`/permissions/${id}`),
};

export const rolesApi = {
  getAll: () => axiosInstance.get<Role[]>('/roles'),
  getById: (id: string) => axiosInstance.get<Role>(`/roles/${id}`),
  create: (data: Record<string, unknown>) => axiosInstance.post<Role>('/roles', data),
  update: (id: string, data: Record<string, unknown>) => axiosInstance.put<Role>(`/roles/${id}`, data),
  updatePermissions: (id: string, permissionIds: string[]) =>
    axiosInstance.put<Role>(`/roles/${id}/permissions`, { permissionIds }),
  delete: (id: string) => axiosInstance.delete(`/roles/${id}`),
};

export const appUsersApi = {
  /** Approved users by default; pass status 'Pending' / 'Declined' for access requests. */
  getAll: (params?: { activeOnly?: boolean; plantCode?: string; status?: string }) =>
    axiosInstance.get<AppUser[]>('/appusers', { params }),
  getById: (id: string) => axiosInstance.get<AppUser>(`/appusers/${id}`),
  create: (data: Record<string, unknown>) => axiosInstance.post<AppUser>('/appusers', data),
  update: (id: string, data: Record<string, unknown>) => axiosInstance.put<AppUser>(`/appusers/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/appusers/${id}`),
  /** Give a pending (or declined) user a role and plants. */
  approve: (id: string, data: { roleId: string; plantCodes: string[]; fullName?: string; employeeId?: string; designation?: string; phoneNumber?: string }) =>
    axiosInstance.put<AppUser>(`/appusers/${id}/approve`, data),
  decline: (id: string, reason?: string) =>
    axiosInstance.put<AppUser>(`/appusers/${id}/decline`, { reason }),
};