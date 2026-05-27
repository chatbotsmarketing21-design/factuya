import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { subscriptionAPI } from '../services/subscriptionApi';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { 
  ArrowLeft, 
  Crown, 
  CreditCard, 
  Calendar, 
  FileText, 
  Check, 
  Loader2,
  AlertTriangle,
  Sparkles,
  Send,
  CheckCircle,
  XCircle,
  Trophy
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const SubscriptionPanel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [wompiPrice, setWompiPrice] = useState(null);
  const [geo, setGeo] = useState(null);
  const [autoRenewOptIn, setAutoRenewOptInState] = useState(() => {
    // Restore the user's preference across navigation (persisted in localStorage)
    try {
      return localStorage.getItem('factuya:autoRenewOptIn') === 'true';
    } catch (e) {
      return false;
    }
  });
  const setAutoRenewOptIn = (value) => {
    setAutoRenewOptInState(value);
    try {
      localStorage.setItem('factuya:autoRenewOptIn', value ? 'true' : 'false');
    } catch (e) {
      // ignore storage errors (private mode etc.)
    }
  };
  const [autoRenewInfo, setAutoRenewInfo] = useState(null);
  const [cancelingAutoRenew, setCancelingAutoRenew] = useState(false);
  const [paypalConfig, setPaypalConfig] = useState(null);

  useEffect(() => {
    // Allow QA to force a specific gateway via ?force_gateway=paypal in the URL
    const forceGateway = searchParams.get('force_gateway');
    // Detect user's country to pick the right payment gateway
    subscriptionAPI.detectCountry(forceGateway)
      .then(res => setGeo(res.data))
      .catch(() => setGeo({ country_code: 'XX', gateway: 'paypal' }));
    // Fetch live Wompi price (USD->COP) so the user sees the actual COP amount
    subscriptionAPI.getWompiConfig()
      .then(res => setWompiPrice(res.data))
      .catch(() => setWompiPrice(null));
    // Load current auto-renewal status
    subscriptionAPI.getAutoRenewalInfo()
      .then(res => setAutoRenewInfo(res.data))
      .catch(() => setAutoRenewInfo(null));
    // Load PayPal config (international gateway)
    subscriptionAPI.getPaypalConfig()
      .then(res => setPaypalConfig(res.data))
      .catch(() => setPaypalConfig({ configured: false }));
  }, []);

  useEffect(() => {
    // Pre-fill email if user is logged in
    if (user?.email) {
      setContactForm(prev => ({ ...prev, email: user.email, name: user.name || '' }));
    }
  }, [user]);

  const handleContactSubmit = async () => {
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      });
      return;
    }

    setSendingMessage(true);
    
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/contact/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contactForm)
      });
      
      if (response.ok) {
        toast({
          title: "Mensaje enviado",
          description: "Hemos recibido tu mensaje. Te responderemos pronto.",
        });
        setShowContactDialog(false);
        setContactForm({ ...contactForm, message: '' });
      } else {
        throw new Error('Error al enviar');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setSendingMessage(false);
    }
  };

  useEffect(() => {
    loadSubscriptionStatus();
    
    // Check if returning from Wompi payment
    const payment = searchParams.get('payment');
    const reference = searchParams.get('reference');
    
    if (payment === 'wompi' && reference) {
      verifyWompiPayment(reference);
    }

    // Check if returning from PayPal subscription approval
    const paypal = searchParams.get('paypal');
    const paypalSubId = searchParams.get('subscription_id');
    if (paypal === 'success') {
      verifyPaypalSubscription(paypalSubId);
    } else if (paypal === 'canceled') {
      toast({
        title: 'Suscripción cancelada',
        description: 'No se completó el pago con PayPal.',
        variant: 'destructive',
      });
      window.history.replaceState({}, '', '/subscription');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const verifyPaypalSubscription = async (subscriptionId) => {
    setVerifyingPayment(true);
    try {
      const response = subscriptionId
        ? await subscriptionAPI.verifyPaypalSubscription(subscriptionId)
        : await subscriptionAPI.verifyLatestPaypalSubscription();
      setPaymentResult({
        approved: response.data.approved,
        message: response.data.message,
      });
      if (response.data.approved) {
        toast({
          title: t('toasts.paymentSuccess'),
          description: t('toasts.premiumActivated'),
        });
        loadSubscriptionStatus();
      } else {
        toast({
          title: 'Pago no completado',
          description: response.data.message || 'La suscripción no está activa.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error verifying PayPal:', error);
      toast({
        title: 'Error',
        description: 'No se pudo verificar el pago de PayPal. Contacta a soporte.',
        variant: 'destructive',
      });
    } finally {
      setVerifyingPayment(false);
      window.history.replaceState({}, '', '/subscription');
    }
  };

  const verifyWompiPayment = async (reference) => {
    setVerifyingPayment(true);
    try {
      const response = await subscriptionAPI.verifyWompiPayment(reference);
      setPaymentResult(response.data);
      
      if (response.data.approved) {
        toast({
          title: t('toasts.paymentSuccess'),
          description: t('toasts.premiumActivated'),
        });
        // Reload subscription status
        loadSubscriptionStatus();
      } else {
        toast({
          title: "Pago no completado",
          description: response.data.message || "El pago no fue aprobado. Intenta de nuevo.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast({
        title: "Error",
        description: "No se pudo verificar el pago. Contacta a soporte.",
        variant: "destructive"
      });
    } finally {
      setVerifyingPayment(false);
      // Clean URL params
      window.history.replaceState({}, '', '/subscription');
    }
  };

  const loadSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const response = await subscriptionAPI.getStatus();
      setSubscription(response.data);
    } catch (error) {
      console.error('Error loading subscription:', error);
      toast({
        title: t('messages.error'),
        description: t('subscription.errorLoading'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      // Route to the right gateway based on the user's detected country.
      //   Colombia -> Wompi (PSE, Nequi, local cards)
      //   Everywhere else -> PayPal Subscriptions (auto-renewal)
      //   Stripe is kept in the code but hidden until LLC USA is registered.
      const useWompi = geo?.gateway === 'wompi';
      if (useWompi) {
        const response = await subscriptionAPI.createWompiCheckout(autoRenewOptIn);
        if (response.data.checkoutUrl) {
          window.location.href = response.data.checkoutUrl;
        }
        return;
      }

      // International -> PayPal
      if (!paypalConfig?.configured) {
        toast({
          title: 'PayPal no disponible',
          description: 'Estamos terminando de configurar PayPal. Por favor intenta de nuevo en unas horas.',
          variant: 'destructive',
        });
        return;
      }
      const response = await subscriptionAPI.createPaypalSubscription();
      if (response.data.approvalUrl) {
        window.location.href = response.data.approvalUrl;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: t('messages.error'),
        description: t('subscription.errorCheckout'),
        variant: "destructive"
      });
    }
  };

  const handleCancelAutoRenewal = async () => {
    try {
      setCancelingAutoRenew(true);
      await subscriptionAPI.cancelAutoRenewal();
      toast({
        title: t('toasts.autoRenewalCancelled'),
        description: t('toasts.autoRenewalCancelledDesc'),
      });
      const res = await subscriptionAPI.getAutoRenewalInfo();
      setAutoRenewInfo(res.data);
    } catch (error) {
      console.error('Error canceling auto-renewal:', error);
      toast({
        title: t('messages.error'),
        description: t('toasts.autoRenewalCancelError'),
        variant: "destructive",
      });
    } finally {
      setCancelingAutoRenew(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCanceling(true);
      await subscriptionAPI.cancelSubscription();
      toast({
        title: t('subscription.canceled'),
        description: t('subscription.canceledDesc'),
      });
      setShowCancelDialog(false);
      loadSubscriptionStatus();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        title: t('messages.error'),
        description: error.response?.data?.detail || t('subscription.errorCanceling'),
        variant: "destructive"
      });
    } finally {
      setCanceling(false);
    }
  };

  if (loading || verifyingPayment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
        {verifyingPayment && (
          <p className="mt-4 text-gray-600 dark:text-gray-400">Verificando tu pago...</p>
        )}
      </div>
    );
  }

  const isPremium = subscription?.hasActiveSubscription;
  const isTrialing = subscription?.status === 'trialing';
  const invoicesUsed = subscription?.invoicesUsed || 0;
  const maxInvoices = subscription?.maxInvoices || 10;
  const progressPercent = isTrialing ? (invoicesUsed / maxInvoices) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      {/* Header */}
      <header className="bg-white dark:bg-card border-b border-gray-200 dark:border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('subscription.back')}
              </Button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('subscription.title')}</h1>
            </div>
            <Link to="/">
              <div className="flex items-center cursor-pointer">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">Factu</span>
                <span className="text-2xl font-bold text-white bg-lime-500 px-2 ml-1">Ya!</span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Payment Result Banner */}
        {paymentResult && (
          <Card className={`p-4 mb-6 ${paymentResult.approved ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : 'bg-red-50 dark:bg-red-900/20 border-red-500'}`}>
            <div className="flex items-center gap-3">
              {paymentResult.approved ? (
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              )}
              <div>
                <h3 className={`font-semibold ${paymentResult.approved ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                  {paymentResult.approved ? '¡Pago exitoso!' : 'Pago no completado'}
                </h3>
                <p className={`text-sm ${paymentResult.approved ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {paymentResult.approved 
                    ? 'Tu suscripción Premium está activa. ¡Disfruta de facturas ilimitadas!' 
                    : (paymentResult.message || 'El pago no fue aprobado. Intenta de nuevo.')}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Current Plan Card */}
        <Card className="p-6 mb-6 dark:bg-card">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${isPremium ? 'bg-lime-100 dark:bg-lime-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                {isPremium ? (
                  <Crown className="w-8 h-8 text-lime-600 dark:text-lime-400" />
                ) : (
                  <FileText className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {isPremium ? t('subscription.premiumPlan') : t('subscription.freePlan')}
                  </h2>
                  <Badge className={isPremium ? 'bg-lime-500' : 'bg-gray-500'}>
                    {isPremium ? t('subscription.active') : t('subscription.trial')}
                  </Badge>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {isPremium 
                    ? t('subscription.premiumDesc')
                    : t('subscription.freeRemaining', { count: maxInvoices - invoicesUsed })
                  }
                </p>
              </div>
            </div>
            {isPremium && (
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">$3.99</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">/{t('subscription.month')}</p>
              </div>
            )}
          </div>

          {/* Progress bar for trial users */}
          {isTrialing && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">{t('subscription.invoicesUsed')}</span>
                <span className="font-semibold dark:text-white">{invoicesUsed} / {maxInvoices}</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
              {invoicesUsed >= maxInvoices && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {t('subscription.limitReached')}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Upgrade Card (for trial users) */}
        {!isPremium && (
          <Card className="p-6 mb-6 border-2 border-lime-500 bg-gradient-to-r from-lime-50 to-green-50 dark:from-lime-900/20 dark:to-green-900/20 dark:bg-card">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-lime-600 dark:text-lime-400" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('subscription.upgradeToPremium')}</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-lime-600 dark:text-lime-400" />
                  <span className="text-gray-700 dark:text-gray-300">{t('subscription.feature1')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-lime-600 dark:text-lime-400" />
                  <span className="text-gray-700 dark:text-gray-300">{t('subscription.feature2')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-lime-600 dark:text-lime-400" />
                  <span className="text-gray-700 dark:text-gray-300">{t('subscription.feature3')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-lime-600 dark:text-lime-400" />
                  <span className="text-gray-700 dark:text-gray-300">{t('subscription.feature4')}</span>
                </div>
              </div>
              
              <div className="relative flex flex-col justify-center items-center bg-white dark:bg-gray-800 rounded-lg p-6 pt-8">
                {/* Insignia "Mejor precio del mercado" */}
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-white text-[11px] font-bold uppercase tracking-wide shadow-lg whitespace-nowrap"
                  data-testid="best-price-badge"
                >
                  <Trophy className="w-3 h-3" />
                  Mejor precio del mercado
                </div>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">$3.99 <span className="text-lg font-medium text-gray-500">USD</span></p>
                <p className="text-gray-500 dark:text-gray-400">/{t('subscription.month')}</p>
                {/* Show COP equivalent only for Colombian users (Wompi gateway) */}
                {geo?.gateway === 'wompi' && wompiPrice?.amountCOP && (
                  <div className="mt-2 mb-2 text-center" data-testid="wompi-cop-price">
                    <p className="text-sm font-semibold text-lime-600 dark:text-lime-400">
                      ≈ ${wompiPrice.amountCOP.toLocaleString('es-CO')} COP
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      TRM: ${Number(wompiPrice.exchangeRate).toLocaleString('es-CO', { maximumFractionDigits: 2 })} · {wompiPrice.rateSource}
                    </p>
                  </div>
                )}
                {/* International users (PayPal) - mention auto-renewal */}
                {geo && geo.gateway !== 'wompi' && (
                  <div className="mt-2 mb-2 text-center" data-testid="paypal-info">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {geo.country_name && geo.country_name !== 'Unknown'
                        ? `Detectamos que estás en ${geo.country_name}. Pago seguro y renovación automática con PayPal.`
                        : 'Pago seguro y renovación automática con PayPal.'}
                    </p>
                  </div>
                )}
                <Button 
                  onClick={handleUpgrade}
                  className="w-full bg-lime-500 hover:bg-lime-600 text-white"
                  data-testid="upgrade-button"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {t('subscription.subscribeNow')}
                </Button>

                {/* Auto-renew opt-in (Wompi / Colombia only)
                    DISABLED 2026-05-03: Wompi Web Checkout (URL redirect) does
                    NOT return a reusable payment_source_id, so tokenization
                    cannot happen with this flow. The checkbox is hidden to
                    avoid misleading users. Re-enable once we migrate to the
                    Wompi Widget JS or the direct /tokens/cards API (Option B
                    in the roadmap). */}
                {false && geo?.gateway === 'wompi' && (
                  <label
                    className="mt-3 flex items-start gap-2 text-left cursor-pointer select-none"
                    data-testid="auto-renew-optin-label"
                  >
                    <input
                      type="checkbox"
                      checked={autoRenewOptIn}
                      onChange={(e) => setAutoRenewOptIn(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-lime-600 focus:ring-lime-500"
                      data-testid="auto-renew-optin-checkbox"
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
                      Autorizo a FactuYa! a realizar cobros automáticos mensuales en la tarjeta
                      que use hoy. Puedo cancelar en cualquier momento.
                    </span>
                  </label>
                )}

                {/* Renewal reminder info (replaces auto-renew checkbox) */}
                {geo?.gateway === 'wompi' && (
                  <div
                    className="mt-3 text-xs text-gray-600 dark:text-gray-400 leading-snug text-center"
                    data-testid="renewal-reminder-note"
                  >
                    Te enviaremos un recordatorio por email 3 días antes de cada vencimiento
                    para que renueves con un clic.
                  </div>
                )}
                {/* Métodos de pago según el gateway */}
                <div className="flex items-center justify-center gap-3 mt-3" data-testid="payment-methods">
                  {geo?.gateway === 'wompi' ? (
                    <>
                      <img src="https://cdn-icons-png.flaticon.com/24/349/349221.png" alt="Visa" className="h-5 opacity-70" />
                      <img src="https://cdn-icons-png.flaticon.com/24/349/349228.png" alt="Mastercard" className="h-5 opacity-70" />
                      <span className="text-xs font-bold text-blue-600 opacity-70">PSE</span>
                      <span className="text-xs font-bold text-pink-500 opacity-70">Nequi</span>
                      <img
                        src="https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-100px.png"
                        alt="PayPal"
                        className="h-5 opacity-90"
                        data-testid="paypal-logo-colombia"
                      />
                    </>
                  ) : (
                    <>
                      <img
                        src="https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-100px.png"
                        alt="PayPal"
                        className="h-6 opacity-90"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Visa · Mastercard · AmEx · PayPal Balance
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Subscription Details (for premium users) */}
        {isPremium && (
          <Card className="p-6 mb-6 dark:bg-card">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('subscription.details')}</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{t('subscription.status')}</span>
                </div>
                <Badge className="bg-green-500">{t('subscription.active')}</Badge>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{t('subscription.plan')}</span>
                </div>
                <span className="font-semibold dark:text-white">{t('subscription.premiumMonthly')} - $3.99/{t('subscription.month')}</span>
              </div>

              {/* Fecha de vencimiento */}
              {subscription?.currentPeriodEnd && (
                <div className="flex items-center justify-between py-3 border-b dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-lime-500" />
                    <span className="text-gray-600 dark:text-gray-400">{t('subscription.renewalDate')}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold dark:text-white">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString('es-CO', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                    {subscription?.daysRemaining !== null && subscription?.daysRemaining !== undefined && (
                      <p className="text-sm text-lime-600 dark:text-lime-400">
                        ({subscription.daysRemaining} {subscription.daysRemaining === 1 ? t('subscription.dayRemaining') : t('subscription.daysRemaining')})
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between py-3 border-b dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{t('subscription.invoicesCreated')}</span>
                </div>
                <span className="font-semibold dark:text-white">{invoicesUsed} ({t('subscription.unlimited')})</span>
              </div>
            </div>

            {/* Auto-renewal section (only visible if user enrolled) */}
            {autoRenewInfo?.autoRenewEnabled && (
              <div
                className="mt-6 pt-6 border-t dark:border-gray-700"
                data-testid="auto-renewal-section"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="font-semibold text-gray-900 dark:text-white">Cobro automático activo</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {autoRenewInfo.cardLast4
                        ? <>Tarjeta terminada en <strong>****{autoRenewInfo.cardLast4}</strong></>
                        : 'Tarjeta guardada para renovaciones automáticas'}
                    </p>
                    {autoRenewInfo.failedAttempts > 0 && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        ⚠️ Último cobro falló ({autoRenewInfo.failedAttempts}/3 intentos)
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelAutoRenewal}
                    disabled={cancelingAutoRenew}
                    data-testid="cancel-auto-renewal-button"
                  >
                    {cancelingAutoRenew ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancelar cobro automático'}
                  </Button>
                </div>
              </div>
            )}

            {/* Cancel Subscription */}
            <div className="mt-6 pt-6 border-t dark:border-gray-700">
              <Button 
                variant="outline" 
                className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => setShowCancelDialog(true)}
              >
                {t('subscription.cancelSubscription')}
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t('subscription.cancelNote')}
              </p>
            </div>
          </Card>
        )}

        {/* Help Section */}
        <Card className="p-6 dark:bg-card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('subscription.needHelp')}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('subscription.helpDesc')}
          </p>
          <Button 
            variant="outline"
            onClick={() => setShowContactDialog(true)}
          >
            {t('subscription.contactSupport')}
          </Button>
        </Card>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('subscription.cancelTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('subscription.cancelWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={canceling}>
              {t('subscription.keepSubscription')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={canceling}
              className="bg-red-600 hover:bg-red-700"
            >
              {canceling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('subscription.canceling')}
                </>
              ) : (
                t('subscription.yesCancel')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Contact Support Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Contactar Soporte</DialogTitle>
            <DialogDescription>
              Envíanos tu mensaje y te responderemos lo antes posible.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                placeholder="Tu nombre"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Mensaje</Label>
              <Textarea
                id="message"
                placeholder="¿En qué podemos ayudarte?"
                rows={4}
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContactDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleContactSubmit} 
              disabled={sendingMessage}
              className="bg-lime-500 hover:bg-lime-600"
            >
              {sendingMessage ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar Mensaje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionPanel;
