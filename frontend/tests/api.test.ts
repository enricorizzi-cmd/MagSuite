import { describe, it, expect } from 'vitest';
import api from '../src/services/api';

describe('api service', () => {
  it('uses /api as base URL', () => {
    expect(api.defaults.baseURL).toBe('/api');
  });
});
