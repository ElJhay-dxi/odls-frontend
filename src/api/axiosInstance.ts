import axios from 'axios';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { apiConfig } from '../auth/authConfig';
import { msalInstance } from '../auth/msalInstance';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(async (config) => {
  const accounts = msalInstance.getAllAccounts();

  if (accounts.length === 0) {
    return config;
  }

  const request = {
    scopes: apiConfig.scopes,
    account: accounts[0],
  };

  try {
    const response = await msalInstance.acquireTokenSilent(request);
    config.headers.Authorization = `Bearer ${response.accessToken}`;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      const response = await msalInstance.acquireTokenPopup(request);
      config.headers.Authorization = `Bearer ${response.accessToken}`;
    }
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Unauthorized – redirecting to login');
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;