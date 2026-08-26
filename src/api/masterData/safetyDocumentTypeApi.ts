import axiosInstance from '../axiosInstance';
import type { SafetyDocumentType, SaveSafetyDocumentTypeDto } from '../../types/safetyDocumentType';

const BASE = '/safetydocumenttypes';

export const safetyDocumentTypeApi = {
  getAll: (params?: { classification?: string; activeOnly?: boolean }) =>
    axiosInstance.get<SafetyDocumentType[]>(BASE, { params }),

  getById: (id: string) =>
    axiosInstance.get<SafetyDocumentType>(`${BASE}/${id}`),

  create: (data: SaveSafetyDocumentTypeDto) =>
    axiosInstance.post<SafetyDocumentType>(BASE, data),

  update: (id: string, data: SaveSafetyDocumentTypeDto) =>
    axiosInstance.put<SafetyDocumentType>(`${BASE}/${id}`, data),

  delete: (id: string) =>
    axiosInstance.delete(`${BASE}/${id}`),
};