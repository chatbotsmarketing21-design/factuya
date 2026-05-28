import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Mail, ShieldAlert, Clock, FileX, AlertTriangle, LogIn } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';

/**
 * Public account-deletion information page.
 *
 * Required by Google Play Store policy (since 2023) for any app with user accounts.
 * Must be reachable WITHOUT logging in, and provide clear instructions on how to
 * delete the account and what data will be removed/retained.
 *
 * Public URL: https://factuya.site/delete-account
 */
const DeleteAccount = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const SUPPORT_EMAIL = 'soportefactuya@gmail.com';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" data-testid="delete-account-page" style={{ colorScheme: 'light' }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            data-testid="delete-account-back-home"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Volver al inicio</span>
          </Link>
          <div className="text-xl font-bold text-gray-900">
            Factu<span className="bg-[#7CB342] text-white px-2 py-0.5 rounded">Ya!</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Title */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Eliminación de cuenta
          </h1>
          <p className="text-gray-600">
            Account Deletion Request — FactuYa!
          </p>
        </div>

        {/* Warning banner */}
        <Card className="p-4 bg-amber-50 border-amber-200 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <strong>Acción permanente.</strong> Al eliminar tu cuenta, todos tus datos
            serán borrados de nuestros servidores y <strong>no podrán recuperarse</strong>.
          </div>
        </Card>

        {/* Option A: Self-service from app */}
        <Card className="p-6 space-y-4 bg-white border-gray-200" data-testid="delete-method-app">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#7CB342] text-white flex items-center justify-center font-bold">
              A
            </div>
            <h2 className="text-xl font-bold text-gray-900">Eliminar desde la app (recomendado)</h2>
          </div>

          <ol className="space-y-3 text-gray-700 ml-2 list-decimal list-inside">
            <li>Abre la app <strong>FactuYa!</strong> o entra a{' '}
              <a href="https://factuya.site" className="text-[#7CB342] underline">
                factuya.site
              </a>.
            </li>
            <li>Inicia sesión con tu correo y contraseña.</li>
            <li>Toca el ícono de <strong>Configuración ⚙️</strong> (esquina superior derecha del Dashboard).</li>
            <li>Desplázate hasta abajo y toca <strong>"Eliminar mi cuenta"</strong> (justo encima de "Cerrar sesión").</li>
            <li>Ingresa tu contraseña y escribe <code className="bg-gray-100 text-gray-900 px-2 py-0.5 rounded">ELIMINAR</code> para confirmar.</li>
          </ol>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {isAuthenticated ? (
              <Button
                onClick={() => navigate('/delete-account-confirm')}
                className="bg-red-600 hover:bg-red-700 text-white"
                data-testid="delete-account-go-profile"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Ir a eliminar mi cuenta
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/signin?next=/profile')}
                className="bg-[#7CB342] hover:bg-[#6FA239] text-white"
                data-testid="delete-account-go-login"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Iniciar sesión para eliminar
              </Button>
            )}
          </div>
        </Card>

        {/* Option B: Email request */}
        <Card className="p-6 space-y-4 bg-white border-gray-200" data-testid="delete-method-email">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center font-bold">
              B
            </div>
            <h2 className="text-xl font-bold text-gray-900">Solicitar por correo electrónico</h2>
          </div>

          <p className="text-gray-700">
            Si no puedes acceder a tu cuenta o prefieres hacerlo por email,
            envíanos una solicitud a:
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-600 flex-shrink-0" />
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20cuenta%20FactuYa!&body=Hola%2C%0A%0ASolicito%20la%20eliminaci%C3%B3n%20permanente%20de%20mi%20cuenta%20en%20FactuYa!%0A%0AEmail%20de%20la%20cuenta%3A%20%5Bescribe%20aqu%C3%AD%5D%0A%0AGracias.`}
              className="font-mono text-[#7CB342] break-all hover:underline"
              data-testid="delete-account-email-link"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>

          <p className="text-sm text-gray-600">
            <strong>Asunto sugerido:</strong> "Solicitud de eliminación de cuenta FactuYa!"<br />
            <strong>Incluye:</strong> el correo electrónico asociado a tu cuenta.
          </p>

          <div className="flex items-center gap-2 text-sm text-gray-600 pt-1">
            <Clock className="w-4 h-4" />
            <span>Procesaremos tu solicitud en un plazo máximo de <strong>30 días</strong>.</span>
          </div>
        </Card>

        {/* What gets deleted */}
        <Card className="p-6 space-y-3 bg-white border-gray-200" data-testid="delete-data-summary">
          <div className="flex items-center gap-3">
            <FileX className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">Qué se elimina</h2>
          </div>

          <p className="text-gray-700">
            Al confirmar la eliminación, borraremos <strong>permanentemente</strong>:
          </p>

          <ul className="space-y-1.5 text-gray-700 ml-2 list-disc list-inside">
            <li>Tu cuenta de usuario (nombre, correo, contraseña cifrada).</li>
            <li>Datos de tu empresa (logo, firma, NIT/RUT, dirección).</li>
            <li>Todos los documentos creados (facturas, cotizaciones, recibos, etc.).</li>
            <li>Lista de clientes y productos guardados.</li>
            <li>Historial de pagos y suscripciones.</li>
            <li>Plantillas y configuraciones personalizadas.</li>
            <li>Suscripciones activas de PayPal/Wompi (se cancelan automáticamente).</li>
          </ul>
        </Card>

        {/* What we keep (legal) */}
        <Card className="p-6 space-y-3 bg-white border-gray-200" data-testid="delete-data-retained">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Qué conservamos (por obligación legal)</h2>
          </div>

          <p className="text-gray-700">
            Por exigencias contables, fiscales y antifraude, podemos retener cierta
            información de forma anonimizada durante el período exigido por la ley:
          </p>

          <ul className="space-y-1.5 text-gray-700 ml-2 list-disc list-inside">
            <li>Registros de transacciones de pago (hasta 5 años, requerido por Ley 1581 de Colombia y autoridades fiscales similares).</li>
            <li>Logs de seguridad anonimizados (hasta 12 meses).</li>
            <li>Facturas que hayas emitido a terceros pueden retenerse a su lado, fuera de nuestro control.</li>
          </ul>

          <p className="text-sm text-gray-600 pt-2">
            Estos datos no incluyen información que permita identificarte personalmente.
            Para más detalles, consulta nuestra{' '}
            <Link to="/privacy" className="text-[#7CB342] underline">
              Política de Privacidad
            </Link>.
          </p>
        </Card>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 pt-4 pb-8">
          <p>
            ¿Dudas? Escríbenos a{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#7CB342] underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p className="mt-2">FactuYa! © 2026 — Última actualización: Mayo 2026</p>
        </footer>
      </main>
    </div>
  );
};

export default DeleteAccount;
