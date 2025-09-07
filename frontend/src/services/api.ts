import axios from 'axios';

// Create a pre-configured Axios instance for API calls
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;
