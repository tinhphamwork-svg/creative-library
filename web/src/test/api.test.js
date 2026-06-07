import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBrands, getCreatives, saveCreative, deleteCreative, addBrand, getDropdowns } from '../api';

const MOCK_URL = 'https://fake-gas.example.com/exec';

beforeEach(() => {
  vi.stubEnv('VITE_GAS_URL', MOCK_URL);
  vi.restoreAllMocks();
});

describe('getBrands', () => {
  it('trả về mảng brand names', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ['Nike', 'Adidas'],
    });

    const result = await getBrands();
    expect(result).toEqual(['Nike', 'Adidas']);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('action=getBrands')
    );
  });

  it('throw error nếu GAS trả về { error: ... }', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'Config sheet không tồn tại' }),
    });

    await expect(getBrands()).rejects.toThrow('Config sheet không tồn tại');
  });

  it('throw error khi HTTP response không ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    await expect(getBrands()).rejects.toThrow('HTTP 500');
  });
});

describe('getCreatives', () => {
  it('trả về array of creative objects', async () => {
    const mockCreatives = [
      { id: 'CR-20260606-1234', product: 'Running', concept: 'Pain Point', hook: 'Hook A' },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCreatives,
    });

    const result = await getCreatives('Nike');
    expect(result).toEqual(mockCreatives);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('action=getCreatives')
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('"brand":"Nike"'))
    );
  });
});

describe('saveCreative', () => {
  it('gửi đúng params khi create mới (không có id)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'CR-20260606-9999', rowIndex: 3 }),
    });

    const row = { product: 'Running', concept: 'Pain Point', hook: 'Hook A' };
    const result = await saveCreative('Nike', row);
    expect(result.id).toBe('CR-20260606-9999');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('action=saveCreative')
    );
  });

  it('gửi đúng params khi update (có id)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'CR-20260606-1234', rowIndex: 2 }),
    });

    const row = { id: 'CR-20260606-1234', product: 'Running', hook: 'Hook A Updated' };
    const result = await saveCreative('Nike', row);
    expect(result.id).toBe('CR-20260606-1234');
  });
});

describe('deleteCreative', () => {
  it('gọi đúng action và trả về { deleted: id }', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ deleted: 'CR-20260606-1234' }),
    });

    const result = await deleteCreative('Nike', 'CR-20260606-1234');
    expect(result.deleted).toBe('CR-20260606-1234');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('action=deleteCreative')
    );
  });
});

describe('getDropdowns', () => {
  it('trả về dropdown options object', async () => {
    const mockDropdowns = {
      format: ['Video 9:16', 'Static 1:1'],
      status: ['Testing', 'Winning'],
      briefStatus: ['Not Briefed', 'Briefed'],
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDropdowns,
    });

    const result = await getDropdowns();
    expect(result).toEqual(mockDropdowns);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('action=getDropdowns')
    );
  });
});
