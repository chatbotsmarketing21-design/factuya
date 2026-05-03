import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CreditCard, LogOut, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { subscriptionAPI } from '../services/subscriptionApi';
import { useAuth } from '../context/AuthContext';

/**
 * Full-screen, non-dismissible modal that blocks the entire app when the user's
 * Premium subscription has expired. Only escape paths are: pay to renew, or log out.
 *
 * Visibility rules:
 *   - Only shown for authenticated users.
 *   - Only shown when /api/subscription/status returns status === 'expired'.
 *   - Trial users hitting the 10-invoice cap are NOT shown this modal (they have
 *     their own existing flow).
 */
const SubscriptionGate = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [expired, setExpired] = useState(false);
  const [periodEnd, setPeriodEnd] = useState(null);
  const [checking, setChecking] = useState(false);
  const [geo, setGeo] = useState(null);
  const [wompiPrice, setWompiPrice] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const [autoRenewOptIn, setAutoRenewOptIn] = useState(false);

  // Re-check status whenever the user logs in / route changes
  useEffect(() => {
    if (!user) {
      setExpired(false);
      return;
    }
    let cancelled = false;
    const check = async () => {
      try {
        setChecking(true);
        const res = await subscriptionAPI.getStatus();
        if (cancelled) return;
        if (res.data?.status === 'expired') {
          setExpired(true);
          setPeriodEnd(res.data.currentPeriodEnd);
        } else {
          setExpired(false);
        }
      } catch (e) {
        // If the status endpoint fails, do NOT block — fail open to avoid lockouts.
        if (!cancelled) setExpired(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    check();
    // Re-check every 60s in case the user pays in another tab
    const interval = setInterval(check, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  // Load gateway info on mount (so the renew button knows where to send)
  useEffect(() => {
    if (!user) return;
    subscriptionAPI.detectCountry().then(r => setGeo(r.data)).catch(() => setGeo({ gateway: 'stripe' }));
    subscriptionAPI.getWompiConfig().then(r => setWompiPrice(r.data)).catch(() => {});
  }, [user]);

  // Lock body scroll while gate is visible
  useEffect(() => {
    if (expired) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [expired]);

  if (!expired) return null;

  const handleRenew = async () => {
    try {
      setRedirecting(true);
      const useWompi = geo?.gateway === 'wompi';
      const res = useWompi
        ? await subscriptionAPI.createWompiCheckout(autoRenewOptIn)
        : await subscriptionAPI.createCheckoutSession();
      const url = res.data?.checkoutUrl || res.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        setRedirecting(false);
      }
    } catch (e) {
      console.error('Error creating renewal checkout:', e);
      setRedirecting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formattedEnd = periodEnd
    ? new Date(periodEnd).toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      data-testid="subscription-gate-overlay"
    >
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-8 sm:p-10 text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-5">
          <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>

        {/* Title */}
        <h2
          className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
          data-testid="subscription-gate-title"
        >
          Tu suscripción ha vencido
        </h2>

        {/* Subtitle */}
        {formattedEnd && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Venció el <span className="font-semibold">{formattedEnd}</span>
          </p>
        )}

        {/* Body */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            Para continuar usando FactuYa! y acceder a tus facturas, renueva tu plan
            Premium. El cobro mensual es de:
          </p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
              $3.99 <span className="text-sm font-medium text-gray-500">USD</span>
            </span>
            {geo?.gateway === 'wompi' && wompiPrice?.amountCOP && (
              <span className="text-sm font-semibold text-lime-600 dark:text-lime-400">
                ≈ ${wompiPrice.amountCOP.toLocaleString('es-CO')} COP
              </span>
            )}
          </div>
        </div>

        {/* Renew button */}
        <Button
          onClick={handleRenew}
          disabled={redirecting || checking}
          className="w-full h-12 bg-lime-500 hover:bg-lime-600 text-white font-bold text-base"
          data-testid="subscription-gate-renew-button"
        >
          {redirecting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              Renovar Premium
            </>
          )}
        </Button>

        {/* Auto-renew opt-in (Wompi / Colombia only) */}
        {geo?.gateway === 'wompi' && (
          <label
            className="mt-3 flex items-start gap-2 text-left cursor-pointer select-none"
            data-testid="gate-auto-renew-optin-label"
          >
            <input
              type="checkbox"
              checked={autoRenewOptIn}
              onChange={(e) => setAutoRenewOptIn(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-lime-600 focus:ring-lime-500 flex-shrink-0"
              data-testid="gate-auto-renew-optin-checkbox"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
              Autorizo a FactuYa! a realizar cobros automáticos mensuales en mi tarjeta.
              Puedo cancelar en cualquier momento.
            </span>
          </label>
        )}

        {/* Logout link */}
        <button
          onClick={handleLogout}
          className="mt-4 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          data-testid="subscription-gate-logout"
        >
          <LogOut className="w-3 h-3" />
          Cerrar sesión
        </button>

        {/* Help footer */}
        <p className="mt-6 text-[11px] text-gray-400">
          ¿Problemas con el pago? Escríbenos a soportefactuya@gmail.com
        </p>
      </div>
    </div>
  );
};

export default SubscriptionGate;
