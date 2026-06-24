import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gift, X } from 'lucide-react';

/**
 * Sticky launch coupon banner shown at the top of the public Home page.
 *
 * - Pinned with `sticky top-0 z-50`
 * - Lime gradient with countdown to coupon expiry
 * - Clicking the banner goes to /signup?coupon=LANZAMIENTO50 (pre-fills the code)
 * - Dismissible (✕). Hidden for 7 days via localStorage so we don't pester users.
 *
 * To change coupon details, update the `COUPON_*` constants below.
 */
const COUPON_CODE = 'LANZAMIENTO50';
const COUPON_DISCOUNT_PCT = 50;
// Coupon expires 2026-07-23 21:49 UTC (set by seed_launch_coupon.py)
const COUPON_EXPIRES_AT = new Date('2026-07-23T21:49:00Z');
const DISMISS_KEY = 'factuya:dismiss-launch-banner';
const DISMISS_DAYS = 7;

function formatCountdown(expiresAt) {
  const now = new Date();
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return null;
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const LaunchCouponBanner = () => {
  const [dismissed, setDismissed] = useState(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      const dismissedAt = parseInt(raw, 10);
      if (Number.isNaN(dismissedAt)) return false;
      const daysAgo = (Date.now() - dismissedAt) / 86400000;
      return daysAgo < DISMISS_DAYS;
    } catch (_) {
      return false;
    }
  });

  const [countdown, setCountdown] = useState(() => formatCountdown(COUPON_EXPIRES_AT));

  // Refresh countdown every minute so it stays accurate without re-renders elsewhere
  useEffect(() => {
    if (dismissed) return;
    const id = setInterval(() => {
      setCountdown(formatCountdown(COUPON_EXPIRES_AT));
    }, 60000);
    return () => clearInterval(id);
  }, [dismissed]);

  const handleDismiss = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch (_) {
      /* noop */
    }
    setDismissed(true);
  };

  // Hide banner if dismissed or coupon expired
  if (dismissed || !countdown) return null;

  return (
    <div
      className="sticky top-0 z-50 w-full bg-gradient-to-r from-lime-500 via-lime-600 to-emerald-500 text-white shadow-md"
      data-testid="launch-coupon-banner"
    >
      <Link
        to={`/signup?coupon=${COUPON_CODE}`}
        className="block w-full"
        data-testid="launch-coupon-cta"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Gift className="w-5 h-5 shrink-0 hidden sm:block" aria-hidden="true" />
            <p className="text-xs sm:text-sm font-medium leading-tight truncate">
              <span className="hidden sm:inline">🎁&nbsp;</span>
              <span className="font-bold">Lanzamiento:</span>{' '}
              <span className="hidden md:inline">{COUPON_DISCOUNT_PCT}% OFF tu primer mes con</span>
              <span className="md:hidden">{COUPON_DISCOUNT_PCT}% OFF con</span>{' '}
              <span className="font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">
                {COUPON_CODE}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span
              className="text-xs sm:text-sm font-bold bg-white/20 px-2 py-1 rounded whitespace-nowrap"
              data-testid="launch-coupon-countdown"
            >
              ⏰ {countdown}
            </span>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Cerrar banner"
              className="p-1 rounded hover:bg-white/20 transition-colors"
              data-testid="launch-coupon-dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default LaunchCouponBanner;
