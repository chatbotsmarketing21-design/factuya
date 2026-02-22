import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useTranslation } from 'react-i18next';

const Privacy = () => {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
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
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {isSpanish ? 'Volver al Inicio' : 'Back to Home'}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-card rounded-lg shadow-sm p-8">
          {isSpanish ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Política de Privacidad</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Última actualización: Febrero 2026</p>
              
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">1. Información que Recopilamos</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-3">En FactuYa! recopilamos la siguiente información:</p>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                  <li><strong>Información de cuenta:</strong> nombre, correo electrónico y contraseña cuando te registras.</li>
                  <li><strong>Información de empresa:</strong> nombre de empresa, NIT, dirección, teléfono y logo que proporcionas para tus facturas.</li>
                  <li><strong>Datos de facturación:</strong> información de tus clientes y detalles de las facturas que creas.</li>
                  <li><strong>Información de pago:</strong> procesada de forma segura a través de nuestros proveedores de pago (no almacenamos datos de tarjetas).</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">2. Cómo Usamos tu Información</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-3">Utilizamos tu información para:</p>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                  <li>Proporcionar y mantener nuestro servicio de facturación.</li>
                  <li>Generar y almacenar tus facturas, cotizaciones y otros documentos.</li>
                  <li>Procesar pagos de suscripción.</li>
                  <li>Enviarte notificaciones importantes sobre tu cuenta.</li>
                  <li>Mejorar nuestros servicios y experiencia de usuario.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">3. Protección de Datos</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Implementamos medidas de seguridad para proteger tu información personal:
                </p>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                  <li>Encriptación de datos en tránsito (HTTPS/SSL).</li>
                  <li>Contraseñas almacenadas con hash seguro.</li>
                  <li>Acceso restringido a datos personales.</li>
                  <li>Copias de seguridad regulares.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">4. Compartir Información</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  No vendemos ni compartimos tu información personal con terceros, excepto cuando es necesario para:
                </p>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2 mt-3">
                  <li>Procesar pagos (proveedores de pago como Stripe o Wompi).</li>
                  <li>Cumplir con obligaciones legales.</li>
                  <li>Proteger nuestros derechos y seguridad.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">5. Tus Derechos</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-3">Tienes derecho a:</p>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                  <li>Acceder a tu información personal.</li>
                  <li>Corregir datos inexactos.</li>
                  <li>Solicitar la eliminación de tu cuenta y datos.</li>
                  <li>Exportar tus datos.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">6. Cookies</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  Utilizamos cookies esenciales para mantener tu sesión activa y recordar tus preferencias 
                  (como idioma y modo oscuro/claro). No utilizamos cookies de seguimiento publicitario.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">7. Contacto</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  Si tienes preguntas sobre esta política de privacidad, contáctanos en:{' '}
                  <a href="mailto:chatbotsmarketing21@gmail.com" className="text-lime-600 hover:underline">
                    chatbotsmarketing21@gmail.com
                  </a>
                </p>
              </section>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Privacy Policy</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Last updated: February 2026</p>
              
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">1. Information We Collect</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-3">At FactuYa! we collect the following information:</p>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                  <li><strong>Account information:</strong> name, email address, and password when you register.</li>
                  <li><strong>Company information:</strong> company name, tax ID, address, phone, and logo you provide for your invoices.</li>
                  <li><strong>Billing data:</strong> your clients' information and invoice details you create.</li>
                  <li><strong>Payment information:</strong> securely processed through our payment providers (we don't store card data).</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">2. How We Use Your Information</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-3">We use your information to:</p>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                  <li>Provide and maintain our invoicing service.</li>
                  <li>Generate and store your invoices, quotes, and other documents.</li>
                  <li>Process subscription payments.</li>
                  <li>Send you important notifications about your account.</li>
                  <li>Improve our services and user experience.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">3. Data Protection</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  We implement security measures to protect your personal information:
                </p>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                  <li>Data encryption in transit (HTTPS/SSL).</li>
                  <li>Passwords stored with secure hashing.</li>
                  <li>Restricted access to personal data.</li>
                  <li>Regular backups.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">4. Information Sharing</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  We do not sell or share your personal information with third parties, except when necessary to:
                </p>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2 mt-3">
                  <li>Process payments (payment providers like Stripe or Wompi).</li>
                  <li>Comply with legal obligations.</li>
                  <li>Protect our rights and security.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">5. Your Rights</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-3">You have the right to:</p>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                  <li>Access your personal information.</li>
                  <li>Correct inaccurate data.</li>
                  <li>Request deletion of your account and data.</li>
                  <li>Export your data.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">6. Cookies</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  We use essential cookies to keep your session active and remember your preferences 
                  (such as language and dark/light mode). We do not use advertising tracking cookies.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">7. Contact</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  If you have questions about this privacy policy, contact us at:{' '}
                  <a href="mailto:chatbotsmarketing21@gmail.com" className="text-lime-600 hover:underline">
                    chatbotsmarketing21@gmail.com
                  </a>
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Privacy;
