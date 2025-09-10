import { describe, it, expect } from 'vitest';
import api from '../src/services/api';

describe('api service', () => {
  it('defaults to the same origin when no VITE_API_URL is set', () => {
    expect(api.defaults.baseURL).toBe('');
  });
});
