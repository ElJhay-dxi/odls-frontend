import axiosInstance from '../axiosInstance';
import type { CurrentUserProfile } from '../../types/userManagement';

export const meApi = {
  getProfile: () => axiosInstance.get<CurrentUserProfile>('/me'),
};