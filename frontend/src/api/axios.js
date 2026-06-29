// Centralized Axios instance used for all API calls.
// Using a single instance means token attachment and error handling
// are written once here instead of repeated in every component.

import axios from 'axios';

// baseURL '/api' is proxied to localhost:5000 by Vite in development,
// and forwarded to the backend container by Nginx in production.
const api = axios.create({ baseURL: '/api' });

// REQUEST INTERCEPTOR — runs before every outgoing request.
// Reads the JWT token from localStorage and attaches it to the Authorization header.
// This is why individual components don't need to manually add the token.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// RESPONSE INTERCEPTOR — runs after every response comes back.
// First function: pass successful responses through unchanged.
// Second function: handle errors globally.
// 401 Unauthorized means the token is expired or invalid — clear storage and redirect to login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err); // re-throw so the calling component's catch() still runs
  }
);

export default api;
