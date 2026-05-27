import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { ArrowLeft, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

/**
 * Authenticated "Delete my account" confirmation page.
 * Accessible from the Configuración dropdown in the Dashboard header, right
 * above the "Cerrar sesión" item. Requires re-entering the password and
 * typing "ELIMINAR" to confirm.
 */
const DeleteAccountConfirm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText.trim().toUpperCase() !== 'ELIMINAR') {
      toast({
        title: 'Confirmación requerida',
        description: 'Debes escribir ELIMINAR para confirmar.',
        variant: 'destructive',
      });
      return;
    }
    if (!password) {
      toast({
        title: 'Contraseña requerida',
        description: 'Ingresa tu contraseña para confirmar la eliminación.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setDeleting(true);
      await authAPI.deleteAccount({
        password,
        confirmation: confirmText.trim().toUpperCase(),
      });
      toast({
        title: 'Cuenta eliminada',
        description: 'Tu cuenta y todos tus datos han sido eliminados permanentemente.',
      });
      setTimeout(() => {
        logout();
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Error deleting account:', error);
      const msg =
        error?.response?.data?.detail ||
        'No se pudo eliminar la cuenta. Intenta de nuevo.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      setDeleting(false);
    }
  };

  const canSubmit =
    !deleting &&
    password.length > 0 &&
    confirmText.trim().toUpperCase() === 'ELIMINAR';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-testid="delete-account-confirm-page">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              data-testid="delete-confirm-back-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Eliminar mi cuenta
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Danger banner */}
        <Card className="p-6 border-2 border-red-200 bg-red-50/40 dark:bg-red-950/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-900 dark:text-red-200">
                Zona de Peligro
              </h2>
              <p className="text-sm text-red-700 dark:text-red-300">
                Esta acción es <strong>permanente</strong> y no se puede deshacer.
              </p>
            </div>
          </div>
        </Card>

        {/* What gets deleted */}
        <Card className="p-6 space-y-3">
          <h3 className="font-bold text-gray-900 dark:text-white">
            Al confirmar, se eliminarán:
          </h3>
          <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside space-y-1.5 ml-1">
            <li>Tu cuenta de usuario y datos de empresa (logo, firma, NIT/RUT)</li>
            <li>Todos los documentos creados (facturas, cotizaciones, recibos, etc.)</li>
            <li>Lista de clientes, productos y plantillas</li>
            <li>Historial de pagos y configuraciones</li>
            <li>Suscripciones activas en Wompi y PayPal (se cancelarán automáticamente)</li>
          </ul>
        </Card>

        {/* Confirmation form */}
        <Card className="p-6 space-y-5">
          <div>
            <Label htmlFor="delete-password" className="text-sm font-medium">
              Confirma tu contraseña
            </Label>
            <Input
              id="delete-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña actual"
              className="mt-1.5"
              disabled={deleting}
              data-testid="delete-confirm-password-input"
            />
          </div>

          <div>
            <Label htmlFor="delete-confirm" className="text-sm font-medium">
              Escribe{' '}
              <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-red-700 dark:text-red-300 font-mono">
                ELIMINAR
              </code>{' '}
              para confirmar
            </Label>
            <Input
              id="delete-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ELIMINAR"
              className="mt-1.5"
              disabled={deleting}
              data-testid="delete-confirm-text-input"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              disabled={deleting}
              data-testid="delete-confirm-cancel-btn"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={!canSubmit}
              data-testid="delete-confirm-submit-btn"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Sí, eliminar mi cuenta para siempre
                </>
              )}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default DeleteAccountConfirm;
