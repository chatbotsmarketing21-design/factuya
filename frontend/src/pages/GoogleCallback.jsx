import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import api from '../services/api';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState(null);
  const processedRef = useRef(false);

  useEffect(() => {
    const processCallback = async () => {
      // Prevent double execution
      if (processedRef.current) return;
      processedRef.current = true;

      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError('Google authentication was cancelled');
        toast({
          title: "Error",
          description: "La autenticación con Google fue cancelada",
          variant: "destructive"
        });
        setTimeout(() => navigate('/signin'), 2000);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        toast({
          title: "Error",
          description: "No se recibió el código de autorización",
          variant: "destructive"
        });
        setTimeout(() => navigate('/signin'), 2000);
        return;
      }

      try {
        // Get the current origin for redirect_uri
        const redirectUri = `${window.location.origin}/auth/google/callback`;
        
        // Exchange code for token
        const response = await api.post('/auth/google/token', {
          code: code,
          redirect_uri: redirectUri
        });

        if (response.data.success) {
          const { user, token } = response.data;
          
          // Update AuthContext
          await loginWithGoogle(user, token);
          
          toast({
            title: "¡Bienvenido!",
            description: `Hola ${user.name}, has iniciado sesión con Google`,
          });
          
          navigate('/dashboard', { replace: true });
        } else {
          throw new Error('Authentication failed');
        }
      } catch (err) {
        console.error('Google auth error:', err);
        setError('Failed to complete authentication');
        toast({
          title: "Error",
          description: "No se pudo completar la autenticación con Google. Por favor intenta de nuevo.",
          variant: "destructive"
        });
        setTimeout(() => navigate('/signin'), 2000);
      }
    };

    processCallback();
  }, []); // Empty dependency array - run only once

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Error</div>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <p className="text-gray-500 mt-2">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-lime-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Iniciando sesión con Google...
        </h2>
        <p className="text-gray-600 dark:text-gray-400">Por favor espera un momento</p>
      </div>
    </div>
  );
};

export default GoogleCallback;
