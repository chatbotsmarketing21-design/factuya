import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Gift, X } from 'lucide-react';
import { couponAPI } from '../services/api';

/**
 * Sticky launch coupon banner shown at the top of the public Home page.
 *
 * - Pinned with `sticky top-0 z-50`
 * - Lime gradient with countdown to coupon expiry
 * - Expiry date comes from GET /api/coupons/launch (auto-renewed monthly by the
 *   backend scheduler), so the banner reappears automatically on each cycle.
 * - Clicking the banner goes to /signup?coupon=LANZAMIENTO50 (pre-fills the code)
 * - Dismissible (✕). Hidden for 7 days via localStorage so we don't pester users.
 */
const COUPON_CODE = 'LANZAMIENTO50';
const DISMISS_KEY = 'factuya:dismiss-launch-banner';
const DISMISS_DAYS = 7;

function formatCountdown(expiresAt) {
  if (!expiresAt) return null;
  const now = new Date();
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return null;
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  // Always include seconds so the countdown visibly ticks every second.
  if (days > 0) return `${days}d ${hours}h ${minutes}m ${String(seconds).padStart(2, '0')}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

const LaunchCouponBanner = () => {
  const { t } = useTranslation();
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

  const [couponInfo, setCouponInfo] = useState(null); // {active, discount_percent, expires_at}
  const [countdown, setCountdown] = useState(null);

  // Load real coupon status/expiry from backend
  useEffect(() => {
    couponAPI.launchStatus()
      .then((res) => {
        if (res.data?.active && res.data?.expires_at) {
          setCouponInfo({ ...res.data, expiresDate: new Date(res.data.expires_at) });
        }
      })
      .catch(() => {});
  }, []);

  // Refresh countdown every second so it visibly ticks in real time.
  useEffect(() => {
    if (dismissed || !couponInfo) return;
    setCountdown(formatCountdown(couponInfo.expiresDate));
    const id = setInterval(() => {
      setCountdown(formatCountdown(couponInfo.expiresDate));
    }, 1000);
    return () => clearInterval(id);
  }, [dismissed, couponInfo]);

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
      className="sticky top-0 z-50 w-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-gray-900 shadow-md border-b-2 border-amber-600"
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
              <span className="font-bold">{t('launchBanner.label')}</span>{' '}
              <span className="hidden md:inline">{t('launchBanner.fullText', { pct: couponInfo?.discount_percent || 50 })}</span>
              <span className="md:hidden">{t('launchBanner.shortText', { pct: couponInfo?.discount_percent || 50 })}</span>{' '}
              <span className="font-mono font-bold bg-gray-900 text-yellow-300 px-1.5 py-0.5 rounded">
                {COUPON_CODE}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span
              className="text-xs sm:text-sm font-bold bg-gray-900 text-yellow-300 px-2 py-1 rounded whitespace-nowrap tabular-nums flex items-center gap-1.5"
              data-testid="launch-coupon-countdown"
            >
              <span
                className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.9)]"
                aria-hidden="true"
              />
              {countdown}
            </span>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label={t('launchBanner.close')}
              className="p-1 rounded hover:bg-gray-900/10 transition-colors"
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
