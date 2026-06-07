// web/src/hooks/useCreatives.js
import { useState, useCallback } from 'react';
import { getCreatives, saveCreative as apiSave, deleteCreative as apiDelete } from '../api';

export function useCreatives() {
  // { Nike: Creative[], Adidas: Creative[] }
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (brand) => {
    if (!brand) return;
    if (cache[brand]) return; // đã có cache
    setLoading(true);
    setError(null);
    try {
      const data = await getCreatives(brand);
      setCache(prev => ({ ...prev, [brand]: data }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [cache]);

  const save = useCallback(async (brand, row) => {
    const isNew = !row.id;
    // Optimistic: thêm/update ngay với temp id nếu mới
    const tempId = isNew ? `__temp__${Date.now()}` : row.id;
    const optimisticRow = { ...row, id: tempId };

    setCache(prev => {
      const existing = prev[brand] || [];
      if (isNew) return { ...prev, [brand]: [...existing, optimisticRow] };
      return { ...prev, [brand]: existing.map(c => c.id === row.id ? optimisticRow : c) };
    });

    try {
      const result = await apiSave(brand, row);
      // Replace temp với real id
      setCache(prev => {
        const existing = prev[brand] || [];
        if (isNew) {
          return { ...prev, [brand]: existing.map(c => c.id === tempId ? { ...optimisticRow, id: result.id } : c) };
        }
        return prev;
      });
      return result;
    } catch (err) {
      // Revert
      setCache(prev => {
        const existing = prev[brand] || [];
        if (isNew) return { ...prev, [brand]: existing.filter(c => c.id !== tempId) };
        return { ...prev, [brand]: existing.map(c => c.id === row.id ? row : c) };
      });
      throw err;
    }
  }, []);

  const remove = useCallback(async (brand, id) => {
    const snapshot = cache[brand] || [];
    // Optimistic remove
    setCache(prev => ({ ...prev, [brand]: (prev[brand] || []).filter(c => c.id !== id) }));
    try {
      await apiDelete(brand, id);
    } catch (err) {
      // Revert
      setCache(prev => ({ ...prev, [brand]: snapshot }));
      throw err;
    }
  }, [cache]);

  const getFiltered = useCallback((brand, product, concept) => {
    let list = cache[brand] || [];
    if (product) list = list.filter(c => c.product === product);
    if (concept) list = list.filter(c => c.concept === concept);
    return list;
  }, [cache]);

  const getTree = useCallback((brand) => {
    const list = cache[brand] || [];
    const tree = {};
    list.forEach(c => {
      const p = c.product || '(No Product)';
      const con = c.concept || '(No Concept)';
      if (!tree[p]) tree[p] = new Set();
      tree[p].add(con);
    });
    // Convert Sets to sorted arrays
    return Object.fromEntries(
      Object.entries(tree).map(([p, cons]) => [p, [...cons].sort()])
    );
  }, [cache]);

  return { cache, loading, error, load, save, remove, getFiltered, getTree };
}
