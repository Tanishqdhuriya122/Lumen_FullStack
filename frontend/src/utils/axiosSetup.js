import axios from 'axios';
import { API_BASE } from '../config';

const API_ORIGIN = `${API_BASE}`;

// Auth endpoints that must never trigger a refresh attempt
const SKIP = ['/users/login', '/users/register', '/users/refresh-token', '/users/login-otp'];

const isApiRequest = (config) => (config?.url || '').startsWith(API_ORIGIN);
const shouldSkip = (url = '') => SKIP.some((p) => url.includes(p));

const forceLogout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  if (window.location.pathname !== '/login') window.location.href = '/login';
};

// One shared in-flight refresh. Your backend rotates the refresh token on every
// use, so if several requests failed at once and each refreshed separately,
// all but the first would be rejected.
let refreshPromise = null;

export const refreshAccessToken = () => {
  if (!refreshPromise) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return Promise.reject(new Error('No refresh token'));

    refreshPromise = axios
      .post(`${API_ORIGIN}/api/v1/users/refresh-token`, { refreshToken })
      .then((res) => {
        const { accessToken, refreshToken: newRefreshToken } = res.data.data;
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// Always send the latest token, even if a component captured an old one
axios.interceptors.request.use((config) => {
  if (isApiRequest(config) && !shouldSkip(config.url)) {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On a 401, refresh the token once and retry the original request
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (
      !original ||
      !isApiRequest(original) ||
      shouldSkip(original.url) ||
      error.response?.status !== 401 ||
      original._retry
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      const newToken = await refreshAccessToken();
      original.headers.Authorization = `Bearer ${newToken}`;
      return axios(original);
    } catch (refreshError) {
      // The refresh token is expired too, so a fresh login is needed
      forceLogout();
      return Promise.reject(error);
    }
  }
);