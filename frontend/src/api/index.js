import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear auth and redirect to login — but NOT if we're already on the login page
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginPage = window.location.pathname.includes('giris');
    if (error.response?.status === 401 && !isLoginPage) {
      useAuthStore.getState().logout();
      window.location.href = '/giris';
    }
    return Promise.reject(error);
  }
);

export default api;
