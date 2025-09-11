import axios from 'axios';

function getEnv(key: string): string | undefined {
  const runtime = (globalThis as any)?.__ENV__?.[key];
  const proc = typeof process !== 'undefined' ? (process as any).env?.[key] : undefined;
  const vite = (import.meta as any)?.env?.[key];
  return runtime ?? proc ?? vite;
}

// Create a pre-configured Axios instance for API calls
// The base URL can be configured via VITE_API_URL; by default it uses the same origin.
const api = axios.create({
  baseURL: getEnv('VITE_API_URL') ?? '',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Automatically inject auth headers on each request.
// Prefer a token from localStorage; fall back to API key headers
// configured via VITE_API_KEY and VITE_COMPANY_ID.
api.interceptors.request.use((config) => {
  const lsToken = localStorage.getItem('token');
  const ssToken = sessionStorage.getItem('token');
  const token = lsToken || ssToken;
  const selectedCompanyId = localStorage.getItem('companyId');

  config.headers = config.headers ?? {};

  if (token) {
    (config.headers as any).Authorization = `Bearer ${token}`;
  }

  if (selectedCompanyId) {
    (config.headers as any)['x-company-id'] = selectedCompanyId;
  }

  if (!token) {
    const apiKey = getEnv('VITE_API_KEY');
    const companyId = getEnv('VITE_COMPANY_ID');
    if (apiKey && companyId) {
      (config.headers as any)['x-api-key'] = apiKey;
      (config.headers as any)['x-company-id'] = companyId;
    }
  }

  return config;
});

export default api;
