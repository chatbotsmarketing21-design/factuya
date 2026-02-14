import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import api from '../services/api';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use useRef to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          console.error('No session_id found in URL');
          navigate('/signin', { replace: true });
          return;
        }

        // Send session_id to backend
        const response = await api.post('/auth/google/session', {
          session_id: sessionId
        });

        if (response.data.success) {
          // Store token and user data
          const { user, token } = response.data;
          
          // Use the existing login function from AuthContext
          login(token, user);
          
          // Navigate to dashboard
          navigate('/dashboard', { replace: true, state: { user } });
        } else {
          throw new Error('Authentication failed');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/signin', { 
          replace: true, 
          state: { error: 'Error al iniciar sesión con Google. Por favor intenta de nuevo.' }
        });
      }
    };

    processAuth();
  }, [location, navigate, login]);

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

export default AuthCallback;
