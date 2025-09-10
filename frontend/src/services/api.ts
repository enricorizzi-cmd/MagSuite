import axios from 'axios';

// Create a pre-configured Axios instance for API calls
// The base URL can be configured via VITE_API_URL; by default it uses the same origin.
const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL ?? '',
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;
