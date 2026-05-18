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

  // Only sends typeName + classificationCode — backend auto-generates code and audit fields
  create: (data: GenerationTypeForm) =>
    axiosInstance.post<GenerationType>(BASE, data),

  // Only sends typeName + classificationCode — type code is immutable after creation
  update: (id: string, data: GenerationTypeForm) =>
    axiosInstance.put<GenerationType>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};