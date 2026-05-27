import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';

const SignUp = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: t('toasts.errorTitle'),
        description: t('toasts.passwordsDontMatch'),
        variant: "destructive"
      });
      return;
    }

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
      companyName: formData.companyName || formData.name
    });
    
    if (result.success) {
      toast({
        title: t('toasts.signupSuccess'),
        description: t('toasts.signupSuccessDesc'),
      });
      navigate('/dashboard');
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
              <Label htmlFor="companyName">{t('auth.companyNameOptional')}</Label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                value={formData.companyName}
                onChange={handleChange}
                placeholder={t('auth.companyNamePlaceholder')}
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

            <div>
              <Label htmlFor="confirmPassword">{t('auth.confirmPasswordRequired')}</Label>
              <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
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
