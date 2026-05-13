import axiosInstance from '../axiosInstance';
import type { PlantLocation } from '../../types/masterData';

const BASE = '/plantlocations';

export const plantLocationApi = {
  getAll: () =>
    axiosInstance.get<PlantLocation[]>(BASE),

  getById: (id: string) =>
    axiosInstance.get<PlantLocation>(`${BASE}/${id}`),

  create: (data: Partial<PlantLocation>) =>
    axiosInstance.post<PlantLocation>(BASE, data),

  update: (id: string, data: Partial<PlantLocation>) =>
    axiosInstance.put<PlantLocation>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};