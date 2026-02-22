import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useTranslation } from 'react-i18next';

const Terms = () => {
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Términos de Servicio</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Última actualización: Febrero 2026</p>
              
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">1. Aceptación de los Términos</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  Al acceder y utilizar FactuYa! ("el Servicio"), aceptas estos Términos de Servicio. 
                  Si no estás de acuerdo con alguna parte de estos términos, no podrás utilizar el Servicio.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">2. Descripción del Servicio</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  FactuYa! es una plataforma de facturación en línea que permite a los usuarios crear, 
                  gestionar y enviar facturas, cotizaciones, recibos y otros documentos comerciales.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">3. Cuentas de Usuario</h2>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                  <li>Debes proporcionar información precisa y completa al registrarte.</li>
                  <li>Eres responsable de mantener la seguridad de tu cuenta y contraseña.</li>
                  <li>Debes notificarnos inmediatamente sobre cualquier uso no autorizado de tu cuenta.</li>
                  <li>No puedes usar el Servicio para fines ilegales o no autorizados.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">4. Planes y Pagos</h2>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                  <li><strong>Plan Gratuito:</strong> Incluye hasta 10 facturas sin costo.</li>
                  <li><strong>Plan Premium:</strong> Facturas ilimitadas por una tarifa mensual.</li>
                  <li>Los pagos se procesan de forma segura a través de proveedores de pago autorizados.</li>
                  <li>Puedes cancelar tu suscripción en cualquier momento desde tu panel de control.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">5. Uso Aceptable</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-3">No puedes:</p>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                  <li>Usar el Servicio para actividades fraudulentas o ilegales.</li>
                  <li>Intentar acceder a cuentas de otros usuarios.</li>
                  <li>Interferir con el funcionamiento del Servicio.</li>
                  <li>Copiar, modificar o distribuir el contenido del Servicio sin autorización.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">6. Propiedad Intelectual</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  El Servicio y su contenido original, características y funcionalidad son propiedad de 
                  FactuYa! y están protegidos por leyes de propiedad intelectual. Tus datos y facturas 
                  siguen siendo de tu propiedad.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">7. Limitación de Responsabilidad</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  FactuYa! se proporciona "tal cual" sin garantías de ningún tipo. No seremos responsables 
                  por daños indirectos, incidentales o consecuentes que surjan del uso del Servicio.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">8. Modificaciones</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  Nos reservamos el derecho de modificar estos términos en cualquier momento. 
                  Te notificaremos sobre cambios significativos por correo electrónico o mediante 
                  un aviso en el Servicio.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">9. Contacto</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  Si tienes preguntas sobre estos términos, contáctanos en:{' '}
                  <a href="mailto:chatbotsmarketing21@gmail.com" className="text-lime-600 hover:underline">
                    chatbotsmarketing21@gmail.com
                  </a>
                </p>
              </section>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Terms of Service</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Last updated: February 2026</p>
              
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  By accessing and using FactuYa! ("the Service"), you accept these Terms of Service. 
                  If you do not agree with any part of these terms, you may not use the Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">2. Description of Service</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  FactuYa! is an online invoicing platform that allows users to create, 
                  manage and send invoices, quotes, receipts and other business documents.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">3. User Accounts</h2>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                  <li>You must provide accurate and complete information when registering.</li>
                  <li>You are responsible for maintaining the security of your account and password.</li>
                  <li>You must notify us immediately of any unauthorized use of your account.</li>
                  <li>You may not use the Service for illegal or unauthorized purposes.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">4. Plans and Payments</h2>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                  <li><strong>Free Plan:</strong> Includes up to 10 invoices at no cost.</li>
                  <li><strong>Premium Plan:</strong> Unlimited invoices for a monthly fee.</li>
                  <li>Payments are securely processed through authorized payment providers.</li>
                  <li>You can cancel your subscription at any time from your dashboard.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">5. Acceptable Use</h2>
                <p className="text-gray-700 dark:text-gray-300 mb-3">You may not:</p>
                <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                  <li>Use the Service for fraudulent or illegal activities.</li>
                  <li>Attempt to access other users' accounts.</li>
                  <li>Interfere with the operation of the Service.</li>
                  <li>Copy, modify or distribute the content of the Service without authorization.</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">6. Intellectual Property</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  The Service and its original content, features and functionality are owned by 
                  FactuYa! and are protected by intellectual property laws. Your data and invoices 
                  remain your property.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">7. Limitation of Liability</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  FactuYa! is provided "as is" without warranties of any kind. We shall not be liable 
                  for any indirect, incidental or consequential damages arising from the use of the Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">8. Modifications</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  We reserve the right to modify these terms at any time. 
                  We will notify you of significant changes by email or through 
                  a notice on the Service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">9. Contact</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  If you have questions about these terms, contact us at:{' '}
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

export default Terms;
