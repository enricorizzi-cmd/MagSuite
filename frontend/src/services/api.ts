import axios from 'axios';

// Create a pre-configured Axios instance for API calls
// The base URL can be configured via VITE_API_URL; by default it uses the same origin.
const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL ?? '',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Automatically inject auth headers on each request.
// Prefer a token from localStorage; fall back to API key headers
// configured via VITE_API_KEY and VITE_COMPANY_ID.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  const apiKey = import.meta.env.VITE_API_KEY;
  const companyId = import.meta.env.VITE_COMPANY_ID;

  if (apiKey && companyId) {
    config.headers = config.headers ?? {};
    config.headers['x-api-key'] = apiKey;
    config.headers['x-company-id'] = companyId;
  }

  return config;
});

export default api;
