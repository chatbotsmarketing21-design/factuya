import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { subscriptionAPI } from '../services/subscriptionApi';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
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
  ArrowLeft, 
  Crown, 
  CreditCard, 
  Calendar, 
  FileText, 
  Check, 
  Loader2,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const SubscriptionPanel = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

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
      const response = await subscriptionAPI.createCheckoutSession();
      if (response.data.url) {
        window.location.href = response.data.url;
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
      </div>
    );
  }

  const isPremium = subscription?.hasActiveSubscription;
  const isTrialing = subscription?.status === 'trialing';
  const invoicesUsed = subscription?.invoicesUsed || 0;
  const maxInvoices = subscription?.maxInvoices || 10;
  const progressPercent = isTrialing ? (invoicesUsed / maxInvoices) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('subscription.back')}
              </Button>
              <h1 className="text-xl font-bold text-gray-900">{t('subscription.title')}</h1>
            </div>
            <Link to="/">
              <div className="flex items-center cursor-pointer">
                <span className="text-2xl font-bold text-gray-900">Factu</span>
                <span className="text-2xl font-bold text-white bg-lime-500 px-2 ml-1">Ya!</span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Plan Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${isPremium ? 'bg-lime-100' : 'bg-gray-100'}`}>
                {isPremium ? (
                  <Crown className="w-8 h-8 text-lime-600" />
                ) : (
                  <FileText className="w-8 h-8 text-gray-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {isPremium ? t('subscription.premiumPlan') : t('subscription.freePlan')}
                  </h2>
                  <Badge className={isPremium ? 'bg-lime-500' : 'bg-gray-500'}>
                    {isPremium ? t('subscription.active') : t('subscription.trial')}
                  </Badge>
                </div>
                <p className="text-gray-600 mt-1">
                  {isPremium 
                    ? t('subscription.premiumDesc')
                    : t('subscription.freeRemaining', { count: maxInvoices - invoicesUsed })
                  }
                </p>
              </div>
            </div>
            {isPremium && (
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">$5</p>
                <p className="text-sm text-gray-500">/{t('subscription.month')}</p>
              </div>
            )}
          </div>

          {/* Progress bar for trial users */}
          {isTrialing && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('subscription.invoicesUsed')}</span>
                <span className="font-semibold">{invoicesUsed} / {maxInvoices}</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
              {invoicesUsed >= maxInvoices && (
                <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {t('subscription.limitReached')}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Upgrade Card (for trial users) */}
        {!isPremium && (
          <Card className="p-6 mb-6 border-2 border-lime-500 bg-gradient-to-r from-lime-50 to-green-50">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-lime-600" />
              <h3 className="text-lg font-bold text-gray-900">{t('subscription.upgradeToPremium')}</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-lime-600" />
                  <span className="text-gray-700">{t('subscription.feature1')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-lime-600" />
                  <span className="text-gray-700">{t('subscription.feature2')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-lime-600" />
                  <span className="text-gray-700">{t('subscription.feature3')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-lime-600" />
                  <span className="text-gray-700">{t('subscription.feature4')}</span>
                </div>
              </div>
              
              <div className="flex flex-col justify-center items-center bg-white rounded-lg p-6">
                <p className="text-4xl font-bold text-gray-900">$5</p>
                <p className="text-gray-500 mb-4">/{t('subscription.month')}</p>
                <Button 
                  onClick={handleUpgrade}
                  className="w-full bg-lime-500 hover:bg-lime-600 text-white"
                  data-testid="upgrade-button"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {t('subscription.subscribeNow')}
                </Button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {t('subscription.cancelAnytime')}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Subscription Details (for premium users) */}
        {isPremium && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('subscription.details')}</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">{t('subscription.status')}</span>
                </div>
                <Badge className="bg-green-500">{t('subscription.active')}</Badge>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">{t('subscription.plan')}</span>
                </div>
                <span className="font-semibold">{t('subscription.premiumMonthly')} - $5/{t('subscription.month')}</span>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">{t('subscription.invoicesCreated')}</span>
                </div>
                <span className="font-semibold">{invoicesUsed} ({t('subscription.unlimited')})</span>
              </div>
            </div>

            {/* Cancel Subscription */}
            <div className="mt-6 pt-6 border-t">
              <Button 
                variant="outline" 
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => setShowCancelDialog(true)}
              >
                {t('subscription.cancelSubscription')}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                {t('subscription.cancelNote')}
              </p>
            </div>
          </Card>
        )}

        {/* Help Section */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t('subscription.needHelp')}</h3>
          <p className="text-gray-600 mb-4">
            {t('subscription.helpDesc')}
          </p>
          <Button variant="outline">
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
    </div>
  );
};

export default SubscriptionPanel;
