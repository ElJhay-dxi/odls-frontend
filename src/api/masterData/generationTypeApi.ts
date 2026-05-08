import axiosInstance from '../axiosInstance';
import type { GenerationType, GenerationTypeForm } from '../../types/masterData';

const BASE = '/generationtypes';

export const generationTypeApi = {
  getAll: () =>
    axiosInstance.get<GenerationType[]>(BASE),

  getByClassification: (classificationCode: number) =>
    axiosInstance.get<GenerationType[]>(`${BASE}/classification/${classificationCode}`),

  getById: (id: string) =>
    axiosInstance.get<GenerationType>(`${BASE}/${id}`),

  create: (data: GenerationTypeForm) =>
    axiosInstance.post<GenerationType>(BASE, data),

  update: (id: string, data: GenerationTypeForm) =>
    axiosInstance.put<GenerationType>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};