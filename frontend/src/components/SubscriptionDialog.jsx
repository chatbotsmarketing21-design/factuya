import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { subscriptionAPI } from '../services/subscriptionApi';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Loader2, CreditCard, Check } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

// Stripe publishable key (reemplazar con tu clave real)
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy_key');
const STRIPE_PRICE_ID = process.env.REACT_APP_STRIPE_PRICE_ID || 'price_dummy_id';

const SubscriptionDialog = ({ open, onOpenChange, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadSubscriptionStatus();
    }
  }, [open]);

  const loadSubscriptionStatus = async () => {
    try {
      const response = await subscriptionAPI.getStatus();
      setSubscriptionStatus(response.data);
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  };

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      
      const response = await subscriptionAPI.createCheckoutSession({
        priceId: STRIPE_PRICE_ID,
        successUrl: `${window.location.origin}/dashboard?payment=success`,
        cancelUrl: `${window.location.origin}/dashboard?payment=canceled`
      });

      // Redirigir a Stripe Checkout
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({
        sessionId: response.data.sessionId
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: "No se pudo iniciar el proceso de pago. Por favor intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-bold text-center">
            ¡Mejora a Premium!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center pt-4">
            {subscriptionStatus && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-gray-700 font-medium">
                    Has usado <span className="text-yellow-600 font-bold">{subscriptionStatus.invoicesUsed}</span> de tus <span className="font-bold">{subscriptionStatus.maxInvoices}</span> facturas gratuitas
                  </p>
                </div>

                <div className="bg-lime-50 border-2 border-lime-500 rounded-lg p-6">
                  <div className="text-center mb-4">
                    <p className="text-3xl font-bold text-gray-900">$5<span className="text-lg font-normal text-gray-600">/mes</span></p>
                    <p className="text-sm text-gray-600 mt-1">Plan Premium</p>
                  </div>

                  <div className="space-y-3 text-left">
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-lime-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700"><strong>Facturas ilimitadas</strong></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-lime-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">Todos los tipos de documentos</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-lime-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">Descarga PDF ilimitada</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-lime-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">Soporte prioritario</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-lime-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">Cancela cuando quieras</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Pago seguro procesado por Stripe. Puedes cancelar en cualquier momento.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-lime-500 hover:bg-lime-600 text-white text-lg py-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Suscribirse Ahora - $5/mes
              </>
            )}
          </Button>
          <AlertDialogCancel className="w-full" disabled={loading}>
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SubscriptionDialog;