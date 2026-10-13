import axiosInstance from '../axiosInstance';
import type { HotWorkPermit, GasFreeCertificate } from '../../types/lab';

type Params = { plantCode?: string; date?: string };

export const labHotWorkApi = {
  getSuggestions: () =>
    axiosInstance.get<{ workAreas: string[]; sections: string[] }>('/labhotworkpermits/suggestions'),
  getAll: (params?: Params) => axiosInstance.get<HotWorkPermit[]>('/labhotworkpermits', { params }),
  create: (data: Record<string, unknown>) => axiosInstance.post<HotWorkPermit>('/labhotworkpermits', data),
  update: (id: string, data: Record<string, unknown>) => axiosInstance.put<HotWorkPermit>(`/labhotworkpermits/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/labhotworkpermits/${id}`),
};

export const labGasFreeApi = {
  getSuggestions: () =>
    axiosInstance.get<{ locations: string[] }>('/labgasfreecertificates/suggestions'),
  getAll: (params?: Params) => axiosInstance.get<GasFreeCertificate[]>('/labgasfreecertificates', { params }),
  create: (data: Record<string, unknown>) => axiosInstance.post<GasFreeCertificate>('/labgasfreecertificates', data),
  update: (id: string, data: Record<string, unknown>) => axiosInstance.put<GasFreeCertificate>(`/labgasfreecertificates/${id}`, data),
  delete: (id: string) => axiosInstance.delete(`/labgasfreecertificates/${id}`),
};
