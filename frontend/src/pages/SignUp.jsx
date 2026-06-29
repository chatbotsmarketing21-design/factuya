import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { ArrowLeft, Eye, EyeOff, Gift, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';
import { couponAPI } from '../services/api';
import { savePendingCoupon, getPendingCoupon } from '../utils/couponStorage';

const SignUp = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register } = useAuth();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Win-back coupon state
  const [coupon, setCoupon] = useState(null);          // validated coupon
  const [couponError, setCouponError] = useState('');  // error message if invalid
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  /**
   * On mount, check for a coupon in the URL (?coupon=VUELVE50-XXXXXX)
   * or fall back to one previously saved in localStorage.
   */
  useEffect(() => {
    const urlCode = (searchParams.get('coupon') || '').trim().toUpperCase();
    if (urlCode) {
      validateAndStoreCoupon(urlCode);
      return;
    }
    // Fall back to previously stored coupon (e.g. user navigated away and back)
    const stored = getPendingCoupon();
    if (stored) {
      setCoupon(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateAndStoreCoupon = async (code) => {
    setValidatingCoupon(true);
    setCouponError('');
    try {
      const res = await couponAPI.validate(code);
      const data = res.data;
      setCoupon(data);
      savePendingCoupon(data);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Cupón no válido';
      setCouponError(msg);
      setCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleGoogleLogin = () => {
    // Redirect directly to Google OAuth (same flow as SignIn)
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const clientId = '441119292026-ngpbt64126c5pnlv08rgugqhtg0fedlj.apps.googleusercontent.com';

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account'
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password.length < 6) {
      toast({
        title: t('toasts.errorTitle'),
        description: t('toasts.passwordTooShort'),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      companyName: formData.name
    });
    
    if (result.success) {
      toast({
        title: t('toasts.signupSuccess'),
        description: t('toasts.signupSuccessDesc'),
      });
      // If user signed up with a valid winback coupon, send them to the
      // subscription panel so they can apply the discount immediately.
      if (coupon?.code) {
        navigate('/subscription?coupon=' + encodeURIComponent(coupon.code));
      } else {
        navigate('/dashboard');
      }
    } else {
      toast({
        title: t('toasts.errorTitle'),
        description: result.error || "No se pudo crear la cuenta",
        variant: "destructive"
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-card border-b border-gray-200 dark:border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/">
              <div className="flex items-center cursor-pointer">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">Factu</span>
                <span className="text-2xl font-bold text-white bg-lime-500 px-2 ml-1">Ya!</span>
              </div>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="sm" data-testid="signup-back-link">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.backToHome')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Sign Up Form */}
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md p-8 dark:bg-card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('auth.createAccount')}</h1>
            <p className="text-gray-600 dark:text-gray-300">{t('auth.signupSubtitle')}</p>
          </div>

          {/* Win-back coupon banner */}
          {validatingCoupon && (
            <div
              className="mb-6 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-800/40 dark:border-gray-700 p-4"
              data-testid="signup-coupon-validating"
            >
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Validando tu cupón...
              </span>
            </div>
          )}

          {coupon && !validatingCoupon && (
            <div
              className="mb-6 rounded-xl border-2 border-dashed border-lime-400 bg-gradient-to-br from-lime-50 to-emerald-50 dark:from-lime-950/30 dark:to-emerald-950/30 p-4"
              data-testid="signup-coupon-banner"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-lime-500 text-white flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-lime-600" />
                    <span className="text-sm font-bold text-lime-800 dark:text-lime-200">
                      ¡Cupón aplicado!
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>{coupon.discount_percent}% OFF</strong> en tu primera renovación Premium.
                  </p>
                  <div className="font-mono text-xs bg-white dark:bg-gray-900 border border-lime-200 dark:border-lime-800 rounded px-2 py-1 inline-block text-gray-700 dark:text-gray-300">
                    {coupon.code}
                  </div>
                </div>
              </div>
            </div>
          )}

          {couponError && !coupon && (
            <div
              className="mb-6 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200"
              data-testid="signup-coupon-error"
            >
              <strong>Cupón:</strong> {couponError}
            </div>
          )}

          {/* Google Sign Up Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full mb-6 flex items-center justify-center gap-3 py-5 dark:bg-secondary dark:border-border dark:text-white dark:hover:bg-muted"
            onClick={handleGoogleLogin}
            data-testid="signup-google-button"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t('auth.continueWithGoogle')}
          </Button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-card text-gray-500 dark:text-gray-400">{t('auth.orContinueWithEmail')}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">{t('auth.nameRequired')}</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder={t('auth.namePlaceholder')}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">{t('auth.emailRequired')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t('auth.emailPlaceholder')}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">{t('auth.passwordRequired')}</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={t('auth.passwordMin6')}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-lime-500 hover:bg-lime-600 text-white"
              disabled={loading}
            >
              {loading ? t('auth.creatingAccount') : t('auth.createAccountFree')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t('auth.hasAccount')}{' '}
              <Link to="/signin" className="text-lime-600 hover:text-lime-700 dark:text-lime-400 dark:hover:text-lime-300 font-semibold">
                {t('auth.signinShort')}
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('auth.termsAgreement')}{' '}
              <Link
                to="/terms"
                data-testid="signup-terms-link"
                className="text-primary hover:underline font-medium"
              >
                {t('auth.termsOfService')}
              </Link>
              {' '}{t('auth.and')}{' '}
              <Link
                to="/privacy"
                data-testid="signup-privacy-link"
                className="text-primary hover:underline font-medium"
              >
                {t('auth.privacyPolicy')}
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;
