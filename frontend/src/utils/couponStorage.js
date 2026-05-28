/**
 * Persistence helpers for reactivation coupons (win-back system).
 * Stores a coupon temporarily in localStorage so it survives the signup flow,
 * then gets applied on the next successful subscription payment.
 */

const STORAGE_KEY = 'factuya:pendingCoupon';

/**
 * @typedef {Object} PendingCoupon
 * @property {string} code
 * @property {number} discount_percent
 * @property {string[]} [applies_to]
 * @property {string} [expires_at]   ISO datetime
 */

/**
 * Save a validated coupon to localStorage.
 * @param {PendingCoupon} coupon
 */
export const savePendingCoupon = (coupon) => {
  if (!coupon || !coupon.code) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coupon));
  } catch (_) {
    /* localStorage disabled / quota — ignore */
  }
};

/**
 * Read the pending coupon if any.
 * Automatically clears it if expired.
 * @returns {PendingCoupon | null}
 */
export const getPendingCoupon = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const coupon = JSON.parse(raw);

    // Expired? clean up.
    if (coupon?.expires_at) {
      const expires = new Date(coupon.expires_at);
      if (!isNaN(expires.getTime()) && expires < new Date()) {
        clearPendingCoupon();
        return null;
      }
    }
    return coupon;
  } catch (_) {
    return null;
  }
};

export const clearPendingCoupon = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {
    /* ignore */
  }
};
