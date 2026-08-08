import axios from 'axios';
import {
  cacheCompany,
  cacheInvoice,
  cacheInvoiceList,
  cacheStats,
  isNetworkError,
  isOnline,
  patchCachedCompany,
  readCachedCompany,
  readCachedInvoice,
  readCachedInvoiceList,
  readCachedStats,
} from './offlineDb';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle auth errors (but ONLY when actually online — offline reads must not
// trigger an automatic logout, otherwise the user loses access to cached data).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Offline-aware helpers
// ---------------------------------------------------------------------------

const OFFLINE_WRITE_ERROR = new Error(
  'Sin conexión a internet. Esta acción requiere estar en línea.'
);
OFFLINE_WRITE_ERROR.code = 'OFFLINE';

/** Run a network read, falling back to the cache on connectivity failure. */
async function readWithFallback(networkFn, fallbackFn, onSuccess) {
  try {
    const response = await networkFn();
    if (onSuccess) {
      try { await onSuccess(response.data); } catch (_) { /* cache best-effort */ }
    }
    return response;
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    const cached = await fallbackFn();
    if (cached === null || cached === undefined) throw error;
    return { data: cached, status: 200, statusText: 'OK (offline cache)', cached: true };
  }
}

/** Reject network writes when the device is offline. */
function requireOnlineWrite(networkFn) {
  if (!isOnline()) return Promise.reject(OFFLINE_WRITE_ERROR);
  return networkFn().catch((error) => {
    if (isNetworkError(error)) return Promise.reject(OFFLINE_WRITE_ERROR);
    return Promise.reject(error);
  });
}

// Auth APIs
export const productAPI = {
  list: (search = '') => api.get('/products', { params: search ? { search } : {} }),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
};

export const authAPI = {
  register: (data) => requireOnlineWrite(() => api.post('/auth/register', data)),
  login: (data) => requireOnlineWrite(() => api.post('/auth/login', data)),
  getMe: () => api.get('/auth/me'),
  heartbeat: (source) => api.post('/auth/heartbeat', { source }),
  deleteAccount: (data) => requireOnlineWrite(() => api.delete('/auth/account', { data })),
};

// Coupon APIs
export const couponAPI = {
  validate: (code) => api.post('/coupons/validate', { code }),
  redeem: (code) => requireOnlineWrite(() => api.post('/coupons/redeem', { code })),
  launchStatus: () => api.get('/coupons/launch'),
};

// Notification APIs (in-app bell)
export const notificationAPI = {
  list: (limit = 50) => api.get(`/notifications/?limit=${limit}`),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`),
};

// Invoice APIs
export const invoiceAPI = {
  getAll: (params) =>
    readWithFallback(
      () => api.get('/invoices', { params }),
      () => readCachedInvoiceList(`list:${JSON.stringify(params || {})}`),
      (data) => cacheInvoiceList(`list:${JSON.stringify(params || {})}`, data)
    ),
  getById: (id) =>
    readWithFallback(
      () => api.get(`/invoices/${id}`),
      () => readCachedInvoice(id),
      (data) => cacheInvoice(data)
    ),
  create: (data) => requireOnlineWrite(() => api.post('/invoices', data)),
  update: (id, data) => requireOnlineWrite(() => api.put(`/invoices/${id}`, data)),
  delete: (id) => requireOnlineWrite(() => api.delete(`/invoices/${id}`)),
  getStats: () =>
    readWithFallback(
      () => api.get('/invoices/stats'),
      () => readCachedStats(),
      (data) => cacheStats(data)
    ),
  getNextNumber: (documentType) =>
    requireOnlineWrite(() => api.get(`/invoices/next-number/${documentType}`)),
  uploadPdf: (data) => requireOnlineWrite(() => api.post('/invoices/upload-pdf', data)),
  // Payment/Abono APIs
  addPayment: (invoiceId, data) =>
    requireOnlineWrite(() => api.post(`/invoices/${invoiceId}/payments`, data)),
  getPayments: (invoiceId) => api.get(`/invoices/${invoiceId}/payments`),
  deletePayment: (invoiceId, paymentId) =>
    requireOnlineWrite(() => api.delete(`/invoices/${invoiceId}/payments/${paymentId}`)),
};

// Profile APIs
export const profileAPI = {
  getCompany: () =>
    readWithFallback(
      () => api.get('/profile/company'),
      () => readCachedCompany(),
      (data) => cacheCompany(data)
    ),
  updateCompany: (data) => requireOnlineWrite(() => api.put('/profile/company', data)),
  updateLogo: (logo) =>
    requireOnlineWrite(async () => {
      const res = await api.put('/profile/logo', { logo });
      try { await patchCachedCompany({ logo }); } catch (_) { /* cache best-effort */ }
      return res;
    }),
  deleteLogo: () =>
    requireOnlineWrite(async () => {
      const res = await api.delete('/profile/logo');
      try { await patchCachedCompany({ logo: null }); } catch (_) { /* cache best-effort */ }
      return res;
    }),
  // Galería de logos (hasta 10)
  getLogos: () => api.get('/profile/logos'),
  addLogo: (logo) => requireOnlineWrite(() => api.post('/profile/logos', { logo })),
  deleteLogoFromGallery: (index) =>
    requireOnlineWrite(() => api.delete(`/profile/logos/${index}`)),
  updateSignature: (signature, signatureRotation) =>
    requireOnlineWrite(async () => {
      const res = await api.put('/profile/signature', { signature, signatureRotation });
      // Sync IndexedDB cache so InvoiceCreator picks up the new signature immediately.
      try { await patchCachedCompany({ signature, signatureRotation }); } catch (_) { /* cache best-effort */ }
      return res;
    }),
  deleteSignature: () =>
    requireOnlineWrite(async () => {
      const res = await api.delete('/profile/signature');
      try { await patchCachedCompany({ signature: null, signatureRotation: 0 }); } catch (_) { /* cache best-effort */ }
      return res;
    }),
  updateInvoiceDefaults: (data) =>
    requireOnlineWrite(() => api.put('/profile/invoice-defaults', data)),
};

export default api;
