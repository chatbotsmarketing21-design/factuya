import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ThumbsDown, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../hooks/use-toast';
import api from '../services/api';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=site.factuya.twa';

const Feedback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState('ask'); // 'ask' | 'negative' | 'done'
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = async (sentiment, msg = null) => {
    setSubmitting(true);
    try {
      await api.post('/notifications/feedback', { sentiment, message: msg });
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar tu respuesta. Intenta más tarde.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoveIt = async () => {
    const ok = await submitFeedback('positive');
    if (!ok) return;
    // Redirect to Play Store
    window.open(PLAY_STORE_URL, '_blank', 'noopener,noreferrer');
    setStep('done');
  };

  const handleDontLike = () => {
    setStep('negative');
  };

  const handleSubmitNegative = async () => {
    const ok = await submitFeedback('negative', message);
    if (!ok) return;
    setStep('done');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-lime-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-emerald-950/40 flex flex-col">
      {/* Header */}
      <header className="px-4 sm:px-6 lg:px-8 py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          data-testid="feedback-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8 sm:p-10 shadow-xl border-2 border-lime-100 dark:border-lime-900/40 dark:bg-card">
          {step === 'ask' && (
            <div className="text-center space-y-6" data-testid="feedback-ask">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-lime-100 to-emerald-100 dark:from-lime-900/40 dark:to-emerald-900/40 mx-auto">
                <Sparkles className="w-10 h-10 text-lime-600 dark:text-lime-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  ¿Qué te parece FactuYa!?
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-lg">
                  Tu opinión sincera nos ayuda a crecer y mejorar cada día.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleDontLike}
                  disabled={submitting}
                  className="flex flex-col items-center gap-2 py-6 h-auto border-2 hover:border-gray-400 dark:hover:border-gray-500"
                  data-testid="feedback-dont-like"
                >
                  <ThumbsDown className="w-8 h-8 text-gray-500" />
                  <span className="font-semibold">No me gusta</span>
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={handleLoveIt}
                  disabled={submitting}
                  className="flex flex-col items-center gap-2 py-6 h-auto bg-gradient-to-br from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 text-white shadow-lg"
                  data-testid="feedback-love-it"
                >
                  {submitting ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <Heart className="w-8 h-8 fill-white" />
                  )}
                  <span className="font-semibold">Me encanta</span>
                </Button>
              </div>
            </div>
          )}

          {step === 'negative' && (
            <div className="space-y-6" data-testid="feedback-negative">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Lamentamos escuchar eso 😔
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  ¿Qué podemos mejorar? Tu retroalimentación va directo a nuestro equipo.
                </p>
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Cuéntanos qué no te gustó o qué te gustaría ver mejorado..."
                rows={6}
                className="resize-none"
                maxLength={2000}
                data-testid="feedback-message"
              />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('ask')}
                  disabled={submitting}
                  className="flex-1"
                  data-testid="feedback-back-to-ask"
                >
                  Atrás
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmitNegative}
                  disabled={submitting || message.trim().length < 5}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                  data-testid="feedback-submit-negative"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar'
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center space-y-6" data-testid="feedback-done">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-lime-100 to-emerald-100 dark:from-lime-900/40 dark:to-emerald-900/40 mx-auto">
                <Heart className="w-10 h-10 text-lime-600 dark:text-lime-400 fill-current" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  ¡Gracias, de verdad! 💚
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-lg">
                  Recibimos tu opinión y la valoramos muchísimo.
                </p>
              </div>
              <Button
                type="button"
                size="lg"
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-br from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 text-white shadow-lg px-8"
                data-testid="feedback-done-continue"
              >
                Continuar
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Feedback;
