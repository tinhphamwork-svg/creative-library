// web/src/hooks/useCreatives.js
import { useState, useCallback, useRef } from 'react';
import { getCreatives, saveCreative as apiSave, deleteCreative as apiDelete } from '../api';

export function useCreatives() {
  // { Nike: Creative[], Adidas: Creative[] }
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef(cache);

  // Keep ref in sync with state
  const updateCache = useCallback((updater) => {
    setCache(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      cacheRef.current = next;
      return next;
    });
  }, []);

  const load = useCallback(async (brand) => {
    if (!brand) return;
    if (cacheRef.current[brand]) return; // check via ref — no dependency needed
    setLoading(true);
    setError(null);
    try {
      const data = await getCreatives(brand);
      updateCache(prev => ({ ...prev, [brand]: data }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [updateCache]); // stable dependency — no infinite loop

  const save = useCallback(async (brand, row) => {
    const isNew = !row.id;
    // Optimistic: thêm/update ngay với temp id nếu mới (collision-safe)
    const tempId = isNew ? `__temp__${Date.now()}_${Math.random().toString(36).slice(2)}` : row.id;
    const optimisticRow = { ...row, id: tempId };

    updateCache(prev => {
      const existing = prev[brand] || [];
      if (isNew) return { ...prev, [brand]: [...existing, optimisticRow] };
      return { ...prev, [brand]: existing.map(c => c.id === row.id ? optimisticRow : c) };
    });

    try {
      const result = await apiSave(brand, row);
      // Replace temp với real id + merge server response fields
      updateCache(prev => {
        const existing = prev[brand] || [];
        if (isNew) {
          return { ...prev, [brand]: existing.map(c => c.id === tempId ? { ...optimisticRow, ...result } : c) };
        }
        return prev;
      });
      return result;
    } catch (err) {
      // Revert
      updateCache(prev => {
        const existing = prev[brand] || [];
        if (isNew) return { ...prev, [brand]: existing.filter(c => c.id !== tempId) };
        return { ...prev, [brand]: existing.map(c => c.id === row.id ? row : c) };
      });
      throw err;
    }
  }, [updateCache]);

  const remove = useCallback(async (brand, id) => {
    const snapshot = cacheRef.current[brand] || []; // use ref instead of cache state
    // Optimistic remove
    updateCache(prev => ({ ...prev, [brand]: (prev[brand] || []).filter(c => c.id !== id) }));
    try {
      await apiDelete(brand, id);
    } catch (err) {
      // Revert
      updateCache(prev => ({ ...prev, [brand]: snapshot }));
      throw err;
    }
  }, [updateCache]); // stable

  const getFiltered = useCallback((brand, product, concept) => {
    if (!brand) return [];
    let list = cache[brand] || [];
    if (product) list = list.filter(c => c.product === product);
    if (concept) list = list.filter(c => c.concept === concept);
    return list;
  }, [cache]);

  const getTree = useCallback((brand) => {
    if (!brand) return {};
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
