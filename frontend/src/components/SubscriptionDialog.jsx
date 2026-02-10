import React, { useState, useEffect } from 'react';
import { subscriptionAPI } from '../services/subscriptionApi';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Loader2, CreditCard, Check, AlertCircle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const SubscriptionDialog = ({ open, onOpenChange, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadSubscriptionStatus();
    }
  }, [open]);

  const loadSubscriptionStatus = async () => {
    try {
      setError(null);
      const response = await subscriptionAPI.getStatus();
      setSubscriptionStatus(response.data);
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError('No se pudo cargar la información de suscripción');
    }
  };

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await subscriptionAPI.createCheckoutSession();
      
      // Redirigir directamente a la URL de Stripe Checkout
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No se recibió la URL de pago');
      }
    } catch (err) {
      console.error('Error creating checkout:', err);
      setError(err.response?.data?.detail || 'No se pudo iniciar el proceso de pago. Por favor intenta de nuevo.');
      toast({
        title: "Error",
        description: err.response?.data?.detail || "No se pudo iniciar el proceso de pago",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md" data-testid="subscription-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-bold text-center">
            ¡Mejora a Premium!
          </AlertDialogTitle>
        </AlertDialogHeader>
        
        <div className="text-center pt-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {subscriptionStatus && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <span className="text-gray-700 font-medium">
                    Has usado <span className="text-yellow-600 font-bold">{subscriptionStatus.invoicesUsed}</span> de tus <span className="font-bold">{subscriptionStatus.maxInvoices}</span> facturas gratuitas
                  </span>
                </div>

                <div className="bg-lime-50 border-2 border-lime-500 rounded-lg p-6">
                  <div className="text-center mb-4">
                    <span className="text-3xl font-bold text-gray-900">$5<span className="text-lg font-normal text-gray-600">/mes</span></span>
                    <span className="text-sm text-gray-600 mt-1 block">Plan Premium</span>
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

                <span className="text-xs text-gray-500 text-center block">
                  Pago seguro procesado por Stripe. Puedes cancelar en cualquier momento.
                </span>
              </div>
            )}

            {!subscriptionStatus && !error && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
              </div>
            )}
        </div>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={handleSubscribe}
            disabled={loading || !subscriptionStatus}
            className="w-full bg-lime-500 hover:bg-lime-600 text-white text-lg py-6"
            data-testid="subscribe-button"
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
          <AlertDialogCancel className="w-full" disabled={loading} data-testid="cancel-subscription-dialog">
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SubscriptionDialog;
