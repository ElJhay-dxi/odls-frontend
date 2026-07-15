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
  getAll: (params?: { activeOnly?: boolean; plantCode?: string }) =>
    axiosInstance.get<AppUser[]>('/appusers', { params }),
  getById: (id: string) => axiosInstance.get<AppUser>(`/appusers/${id}`),
  create: (data: Record<string, unknown>) => axiosInstance.post<AppUser>('/appusers', data),
  update: (id: string, data: Record<string, unknown>) => axiosInstance.put<AppUser>(`/appusers/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/appusers/${id}`),
};