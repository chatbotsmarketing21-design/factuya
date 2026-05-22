/**
 * Offline cache layer for FactuYa! built on IndexedDB.
 *
 * Stores read-only data so the user can still browse their invoices, profile
 * and dashboard stats when the device is offline. Writes (create/update/delete)
 * are NOT mirrored locally — they require an active connection.
 *
 * Capacity: latest 100 invoices per user. Other stores keep a single record.
 */
import { openDB } from 'idb';

const DB_NAME = 'factuya-offline';
const DB_VERSION = 1;
const INVOICE_LIMIT = 100;

const STORES = {
  INVOICES: 'invoices',
  INVOICE_LISTS: 'invoice_lists', // cached pages of `GET /api/invoices`
  STATS: 'stats',
  PROFILE: 'profile',
};

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORES.INVOICES)) {
      const store = db.createObjectStore(STORES.INVOICES, { keyPath: 'id' });
      store.createIndex('updatedAt', 'updatedAt');
    }
    if (!db.objectStoreNames.contains(STORES.INVOICE_LISTS)) {
      db.createObjectStore(STORES.INVOICE_LISTS, { keyPath: 'cacheKey' });
    }
    if (!db.objectStoreNames.contains(STORES.STATS)) {
      db.createObjectStore(STORES.STATS, { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains(STORES.PROFILE)) {
      db.createObjectStore(STORES.PROFILE, { keyPath: 'id' });
    }
  },
});

// --- Helpers --------------------------------------------------------------

const invoiceKey = (invoice) => invoice.id || invoice._id;

const stampInvoice = (invoice) => ({
  ...invoice,
  id: invoiceKey(invoice),
  _cachedAt: Date.now(),
  updatedAt: invoice.updatedAt || invoice.createdAt || new Date().toISOString(),
});

// --- Invoices -------------------------------------------------------------

export async function cacheInvoice(invoice) {
  if (!invoice || !invoiceKey(invoice)) return;
  const db = await dbPromise;
  await db.put(STORES.INVOICES, stampInvoice(invoice));
  await trimInvoices(db);
}

export async function cacheInvoiceList(cacheKey, invoices) {
  if (!Array.isArray(invoices)) return;
  const db = await dbPromise;
  const tx = db.transaction([STORES.INVOICES, STORES.INVOICE_LISTS], 'readwrite');
  await tx.objectStore(STORES.INVOICE_LISTS).put({
    cacheKey,
    ids: invoices.map(invoiceKey).filter(Boolean),
    _cachedAt: Date.now(),
  });
  const invoiceStore = tx.objectStore(STORES.INVOICES);
  for (const invoice of invoices) {
    if (invoiceKey(invoice)) {
      await invoiceStore.put(stampInvoice(invoice));
    }
  }
  await tx.done;
  await trimInvoices(db);
}

export async function readCachedInvoiceList(cacheKey) {
  const db = await dbPromise;
  const meta = await db.get(STORES.INVOICE_LISTS, cacheKey);
  if (!meta || !meta.ids?.length) return null;
  const tx = db.transaction(STORES.INVOICES, 'readonly');
  const invoices = [];
  for (const id of meta.ids) {
    const invoice = await tx.store.get(id);
    if (invoice) invoices.push(invoice);
  }
  await tx.done;
  return invoices;
}

export async function readCachedInvoice(id) {
  if (!id) return null;
  const db = await dbPromise;
  return (await db.get(STORES.INVOICES, id)) || null;
}

async function trimInvoices(db) {
  const tx = db.transaction(STORES.INVOICES, 'readwrite');
  const index = tx.store.index('updatedAt');
  const count = await tx.store.count();
  if (count <= INVOICE_LIMIT) {
    await tx.done;
    return;
  }
  let cursor = await index.openCursor(); // ascending = oldest first
  const toDelete = count - INVOICE_LIMIT;
  let deleted = 0;
  while (cursor && deleted < toDelete) {
    await cursor.delete();
    deleted += 1;
    cursor = await cursor.continue();
  }
  await tx.done;
}

// --- Stats / Profile ------------------------------------------------------

export async function cacheStats(stats) {
  if (!stats) return;
  const db = await dbPromise;
  await db.put(STORES.STATS, { id: 'dashboard', data: stats, _cachedAt: Date.now() });
}

export async function readCachedStats() {
  const db = await dbPromise;
  const entry = await db.get(STORES.STATS, 'dashboard');
  return entry?.data || null;
}

export async function cacheCompany(company) {
  if (!company) return;
  const db = await dbPromise;
  await db.put(STORES.PROFILE, { id: 'company', data: company, _cachedAt: Date.now() });
}

export async function readCachedCompany() {
  const db = await dbPromise;
  const entry = await db.get(STORES.PROFILE, 'company');
  return entry?.data || null;
}

// --- Utility --------------------------------------------------------------

export const isOnline = () => navigator.onLine !== false;

/** True if the axios error means "no network reachable" (vs. real HTTP error). */
export function isNetworkError(error) {
  if (!error) return false;
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') return true;
  if (error.message === 'Network Error') return true;
  return !error.response && !isOnline();
}
