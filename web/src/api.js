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

export const getBrands      = ()                              => gasCall('getBrands');
export const getDropdowns   = ()                              => gasCall('getDropdowns');
export const getCreatives   = (brand)                        => gasCall('getCreatives', { brand });
export const saveCreative   = (brand, row)                   => gasCall('saveCreative', { brand, row });
export const deleteCreative = (brand, id)                    => gasCall('deleteCreative', { brand, id });
export const addBrand       = (brand)                        => gasCall('addBrand', { brand });
export const syncMeta       = ()                             => gasCall('sync');
export const getActions     = (brand)                        => gasCall('getActions', { brand });
export const addAction      = (brand, creativeId, action, notes) => gasCall('addAction', { brand, creativeId, action, notes });
export const markActionDone = (actionId)                     => gasCall('markActionDone', { actionId });
export const getCodes       = ()                             => gasCall('getCodes');
export const saveCode       = (code, type, description)      => gasCall('saveCode', { code, type, description });

export const uploadBrandLogo = (brandName, file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        // Strip data URL prefix: "data:image/png;base64,<data>"
        const dataUrl = reader.result;
        const [meta, fileBase64] = dataUrl.split(',');
        const mimeType = meta.match(/:(.*?);/)[1];
        const result = await gasCall('uploadBrandLogo', { brandName, fileBase64, mimeType });
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Không đọc được file'));
    reader.readAsDataURL(file);
  });
};
