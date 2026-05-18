import axiosInstance from '../axiosInstance';
import type { PlantLocation, PlantLocationForm } from '../../types/masterData';

const BASE = '/plantlocations';

export const plantLocationApi = {
  getAll: () =>
    axiosInstance.get<PlantLocation[]>(BASE),

  getById: (id: string) =>
    axiosInstance.get<PlantLocation>(`${BASE}/${id}`),

  // Only sends locationName — backend auto-generates code and audit fields
  create: (data: PlantLocationForm) =>
    axiosInstance.post<PlantLocation>(BASE, data),

  // Only sends locationName — location code is immutable after creation
  update: (id: string, data: PlantLocationForm) =>
    axiosInstance.put<PlantLocation>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};