import axiosInstance from '../axiosInstance';
import type { CurrentUserProfile, PlantOption } from '../../types/userManagement';

export const meApi = {
  getProfile: () => axiosInstance.get<CurrentUserProfile>('/me'),

  /** Plants a new user can pick on the access-request form. */
  getPlantOptions: () => axiosInstance.get<PlantOption[]>('/me/plant-options'),

  /** A pending user's details for the admin (can be sent again to update them). */
  submitAccessRequest: (data: {
    employeeId?: string; designation?: string; phoneNumber?: string; requestedPlantCodes: string[]; note?: string;
  }) => axiosInstance.post<{ message: string }>('/me/access-request', data),
};
