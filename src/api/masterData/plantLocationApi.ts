import axiosInstance from '../axiosInstance';
import type { PlantLocation } from '../../types/masterData';

const BASE = '/plantlocations';

export const plantLocationApi = {
  getAll: () =>
    axiosInstance.get<PlantLocation[]>(BASE),
};