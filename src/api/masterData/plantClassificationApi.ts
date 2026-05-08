import axiosInstance from '../axiosInstance';
import type { PlantClassification, PlantClassificationForm } from '../../types/masterData';

const BASE = '/plantclassifications';

export const plantClassificationApi = {
  getAll: () =>
    axiosInstance.get<PlantClassification[]>(BASE),

  getById: (id: string) =>
    axiosInstance.get<PlantClassification>(`${BASE}/${id}`),

  create: (data: PlantClassificationForm) =>
    axiosInstance.post<PlantClassification>(BASE, data),

  update: (id: string, data: PlantClassificationForm) =>
    axiosInstance.put<PlantClassification>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};