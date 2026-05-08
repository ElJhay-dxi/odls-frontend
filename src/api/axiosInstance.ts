import axios from 'axios';
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';
import { msalConfig, apiConfig } from '../auth/authConfig';

const msalInstance = new PublicClientApplication(msalConfig);

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Bearer token to every request
axiosInstance.interceptors.request.use(async (config) => {
  const accounts = msalInstance.getAllAccounts();

  if (accounts.length === 0) return config;

  const request = {
    scopes: apiConfig.scopes,
    account: accounts[0],
  };

  try {
    const response = await msalInstance.acquireTokenSilent(request);
    config.headers.Authorization = `Bearer ${response.accessToken}`;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      await msalInstance.acquireTokenPopup(request);
    }
  }

  return config;
});

// Global response error handler
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