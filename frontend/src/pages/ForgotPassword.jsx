import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import api from '../services/api';

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Por favor ingresa tu correo electrónico",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      await api.post('/password-reset/request', { email });
      setSent(true);
      toast({
        title: "Correo Enviado",
        description: "Si el email existe, recibirás un enlace de recuperación",
      });
    } catch (error) {
      console.error('Error requesting reset:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar el correo. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-4xl font-bold">
              <span className="text-gray-900">Factu</span>
              <span className="bg-lime-500 text-white px-2 ml-1">Ya!</span>
            </h1>
          </Link>
        </div>

        <Card className="p-8 shadow-lg">
          {!sent ? (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-lime-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">¿Olvidaste tu contraseña?</h2>
                <p className="text-gray-600 mt-2">
                  Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    className="mt-1"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-lime-500 hover:bg-lime-600 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Enviar Enlace de Recuperación
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Correo Enviado!</h2>
              <p className="text-gray-600 mb-6">
                Si existe una cuenta con el correo <strong>{email}</strong>, recibirás un enlace para restablecer tu contraseña.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Revisa tu bandeja de entrada y también la carpeta de spam.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setSent(false)}
                className="mr-2"
              >
                Enviar de nuevo
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link 
              to="/signin" 
              className="text-sm text-lime-600 hover:text-lime-700 inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver a Iniciar Sesión
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
