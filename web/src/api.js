const GAS_URL = import.meta.env.VITE_GAS_URL;

let _token = sessionStorage.getItem('auth_token') || '';

export function setAuthToken(t) {
  _token = t;
  if (t) sessionStorage.setItem('auth_token', t);
  else sessionStorage.removeItem('auth_token');
}

export function getAuthToken() { return _token; }

async function gasCall(action, data = null) {
  let url = `${GAS_URL}?action=${encodeURIComponent(action)}&token=${encodeURIComponent(_token)}`;
  if (data) url += `&data=${encodeURIComponent(JSON.stringify(data))}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json && json.error) throw new Error(json.error);
  return json;
}

export const getBrands     = ()              => gasCall('getBrands');
export const getDropdowns  = ()              => gasCall('getDropdowns');
export const getCreatives  = (brand)         => gasCall('getCreatives', { brand });
export const saveCreative  = (brand, row)    => gasCall('saveCreative', { brand, row });
export const deleteCreative = (brand, id)   => gasCall('deleteCreative', { brand, id });
export const addBrand      = (brand)         => gasCall('addBrand', { brand });
