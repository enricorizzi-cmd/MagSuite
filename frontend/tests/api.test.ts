import { describe, it, expect, beforeEach } from 'vitest';
import api from '../src/services/api';

describe('api service', () => {
  beforeEach(() => {
    // Reset environment and storage before each test
    localStorage.clear();
    delete import.meta.env.VITE_API_KEY;
    delete import.meta.env.VITE_COMPANY_ID;
  });

  it('defaults to the same origin when no VITE_API_URL is set', () => {
    expect(api.defaults.baseURL).toBe('');
  });

  it('injects API key headers when env vars are set', async () => {
    process.env.VITE_API_KEY = 'k';
    process.env.VITE_COMPANY_ID = '1';
    const config = await (api as any).interceptors.request.handlers[0].fulfilled({ headers: {} });
    expect(config.headers['x-api-key']).toBe('k');
    expect(config.headers['x-company-id']).toBe('1');
  });

  it('prefers bearer token over API key headers', async () => {
    localStorage.setItem('token', 'abc');
    process.env.VITE_API_KEY = 'k';
    process.env.VITE_COMPANY_ID = '1';
    const config = await (api as any).interceptors.request.handlers[0].fulfilled({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer abc');
    expect(config.headers['x-api-key']).toBeUndefined();
  });
});
