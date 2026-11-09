// Keep API requests same-origin by default. Vite proxies /api and /ws to Django,
// so the app also works when opened from another device on the same network.
const configuredBase = (import.meta.env.VITE_API_URL || '/api').trim();
export const API_BASE = configuredBase.replace(/\/+$/, '');

/** Resolve Django media URLs against the backend host, not the Vercel app host. */
export function mediaUrl(value){
  if (!value || typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw) return '';
  if (/^(data:|blob:|https?:\/\/|\/\/)/i.test(raw)) return raw;
  const apiOrigin = API_BASE.startsWith('http') ? new URL(API_BASE).origin : window.location.origin;
  return new URL(raw.startsWith('/') ? raw : `/${raw}`, `${apiOrigin}/`).toString();
}

export function token(){ return localStorage.getItem('waselni_access'); }
export function clearAuth(){
  localStorage.removeItem('waselni_access');
  localStorage.removeItem('waselni_refresh');
}

async function decodeResponse(res){
  const raw = await res.text();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return { detail: raw.slice(0, 500) }; }
}

function errorMessage(data, status){
  if (data?.detail) return data.detail;
  if (data?.message) return data.message;
  if (data && typeof data === 'object') {
    const messages = Object.entries(data).map(([key, value]) => {
      const text = Array.isArray(value) ? value.join(' ') : typeof value === 'string' ? value : JSON.stringify(value);
      return `${key}: ${text}`;
    });
    if (messages.length) return messages.join(' · ');
  }
  return `تعذر تنفيذ الطلب (HTTP ${status}).`;
}

async function refreshAccess(){
  const refresh = localStorage.getItem('waselni_refresh');
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh })
    });
    const data = await decodeResponse(res);
    if (!res.ok || !data.access) { clearAuth(); return false; }
    localStorage.setItem('waselni_access', data.access);
    if (data.refresh) localStorage.setItem('waselni_refresh', data.refresh);
    return true;
  } catch { return false; }
}

export async function api(path, options={}, retried=false){
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = { ...(isForm ? {} : options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  let res;
  try {
    res = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, { ...options, headers });
  } catch (err) {
    const target = API_BASE.startsWith('http') ? API_BASE : `${window.location.origin}${API_BASE}`;
    throw new Error(`تعذر الاتصال بالخادم (${target}). تأكد أن Django يعمل وأن إعدادات Vite proxy صحيحة. التفاصيل: ${err?.message || 'Network error'}`);
  }
  if (res.status === 401 && !retried && !path.includes('/auth/token')) {
    if (await refreshAccess()) return api(path, options, true);
    clearAuth();
  }
  const data = await decodeResponse(res);
  if (!res.ok) throw new Error(errorMessage(data, res.status));
  return data;
}

export async function login(username,password){
  const r = await api('/auth/token/', { method:'POST', body:JSON.stringify({username,password}) });
  if (!r.access || !r.refresh) throw new Error('استجابة تسجيل الدخول غير مكتملة من الخادم.');
  localStorage.setItem('waselni_access',r.access);
  localStorage.setItem('waselni_refresh',r.refresh);
  return r;
}

export function orderSocket(onMessage){
  const access = token();
  if (!access) return null;
  const apiOrigin = API_BASE.startsWith('http') ? new URL(API_BASE).origin : window.location.origin;
  const socketUrl = new URL('/ws/orders/', apiOrigin);
  socketUrl.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  socketUrl.searchParams.set('token', access);
  const ws = new WebSocket(socketUrl.toString());
  ws.onmessage = e => { try { onMessage(JSON.parse(e.data)); } catch {} };
  return ws;
}
