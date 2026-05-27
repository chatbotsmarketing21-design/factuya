import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useTranslation } from 'react-i18next';

const LAST_UPDATED_ES = 'Mayo de 2026';
const LAST_UPDATED_EN = 'May 2026';
const CONTACT_EMAIL = 'soportefactuya@gmail.com';

const Privacy = () => {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language?.startsWith('es');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <header className="bg-white dark:bg-card border-b border-gray-200 dark:border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" data-testid="privacy-logo-link">
              <div className="flex items-center cursor-pointer">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">Factu</span>
                <span className="text-2xl font-bold text-white bg-lime-500 px-2 ml-1">Ya!</span>
              </div>
            </Link>
            <Link to="/" data-testid="privacy-back-link">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.backToHome')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-card rounded-lg shadow-sm p-8" data-testid="privacy-content">
          {isSpanish ? (
            <SpanishPolicy />
          ) : (
            <EnglishPolicy />
          )}
        </div>
      </div>
    </div>
  );
};

const SpanishPolicy = () => (
  <>
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Política de Privacidad</h1>
    <p className="text-gray-600 dark:text-gray-400 mb-8">Última actualización: {LAST_UPDATED_ES}</p>

    <Section title="1. Responsable del Tratamiento de Datos">
      <p>
        FactuYa! (en adelante, "la Aplicación") es operada por el equipo de FactuYa!
        con sede en Colombia. Esta política describe cómo recopilamos, usamos, almacenamos
        y protegemos tu información personal, en cumplimiento de la <strong>Ley 1581 de 2012
        (Habeas Data) de Colombia</strong>, el <strong>Reglamento General de Protección de
        Datos (GDPR)</strong> de la Unión Europea cuando aplique, y las políticas de Google
        Play.
      </p>
      <p className="mt-2">
        Contacto del responsable:{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-lime-600 hover:underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </Section>

    <Section title="2. Información que Recopilamos">
      <p>Recopilamos solo la información estrictamente necesaria para prestar el servicio:</p>
      <List items={[
        <><strong>Información de cuenta:</strong> nombre, correo electrónico y contraseña encriptada cuando te registras.</>,
        <><strong>Información de empresa:</strong> nombre comercial, NIT/RUT, dirección, teléfono y logo que usas en tus facturas.</>,
        <><strong>Datos de facturación:</strong> información de tus clientes (nombre, identificación, contacto) y detalles de los documentos que generas.</>,
        <><strong>Información de pago:</strong> procesada por <strong>Wompi</strong> (Colombia) y <strong>Stripe</strong> (resto del mundo). FactuYa! nunca almacena números de tarjeta ni CVV. Solo conservamos los últimos 4 dígitos para tu referencia.</>,
        <><strong>Datos técnicos:</strong> dirección IP, tipo de navegador, sistema operativo y fecha/hora de acceso. Usados únicamente para seguridad y prevención de fraude.</>,
        <><strong>Idioma y país:</strong> detectados automáticamente por IP para mostrarte la moneda y el idioma correctos.</>,
      ]} />
    </Section>

    <Section title="3. Permisos Solicitados en la Aplicación Móvil">
      <p>
        La aplicación de Android puede solicitar los siguientes permisos. Todos son opcionales
        y los pides explícitamente cuando son necesarios:
      </p>
      <List items={[
        <><strong>Internet:</strong> indispensable para sincronizar tus facturas con la nube.</>,
        <><strong>Almacenamiento (limitado):</strong> guardar borradores de facturas en tu dispositivo cuando estás sin conexión.</>,
        <><strong>Cámara (opcional):</strong> tomar fotos de tu logo o de productos para incluir en facturas.</>,
        <><strong>Notificaciones:</strong> recordatorios de renovación de suscripción y avisos de cobro.</>,
      ]} />
      <p className="mt-2">
        FactuYa! <strong>no accede</strong> a contactos, ubicación GPS, micrófono, calendario,
        SMS, llamadas, ni a publicidad/IDFA. No utilizamos identificadores de publicidad de Android.
      </p>
    </Section>

    <Section title="4. Cómo Usamos tu Información">
      <List items={[
        'Crear y gestionar tu cuenta de usuario.',
        'Generar, guardar y enviar tus facturas, cotizaciones y otros documentos.',
        'Procesar pagos de suscripción a través de nuestros proveedores autorizados.',
        'Enviarte recordatorios de renovación, comprobantes de pago y avisos importantes del servicio.',
        'Cumplir con obligaciones contables, fiscales y legales aplicables.',
        'Mejorar la calidad del servicio y prevenir uso fraudulento.',
      ]} />
      <p className="mt-2">
        <strong>No usamos tus datos para publicidad ni los vendemos a terceros bajo ninguna circunstancia.</strong>
      </p>
    </Section>

    <Section title="5. Terceros con los que Compartimos Datos">
      <p>Compartimos datos exclusivamente con los siguientes proveedores, todos con políticas de privacidad robustas:</p>
      <List items={[
        <><strong>Wompi (Bancolombia):</strong> procesamiento de pagos en Colombia. <a href="https://wompi.co/es/legal" target="_blank" rel="noreferrer" className="text-lime-600 hover:underline">Ver política</a>.</>,
        <><strong>Stripe Inc.:</strong> procesamiento de pagos internacionales. <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer" className="text-lime-600 hover:underline">Ver política</a>.</>,
        <><strong>Resend Inc.:</strong> envío de correos transaccionales. <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noreferrer" className="text-lime-600 hover:underline">Ver política</a>.</>,
        <><strong>Google (Auth + Play):</strong> inicio de sesión opcional con Google y distribución de la app. <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-lime-600 hover:underline">Ver política</a>.</>,
        <><strong>Proveedor de hosting (Hostinger / VPS):</strong> almacenamiento seguro de los datos de la aplicación.</>,
      ]} />
      <p className="mt-2">
        También podemos divulgar información si una autoridad judicial colombiana lo
        requiere mediante orden legal válida.
      </p>
    </Section>

    <Section title="6. Transferencias Internacionales de Datos">
      <p>
        Algunos proveedores (Stripe, Resend, Google) procesan información fuera de Colombia,
        principalmente en Estados Unidos y la Unión Europea. Estos países cuentan con
        estándares de protección equivalentes o superiores, y los contratos con ellos
        incluyen cláusulas tipo de protección de datos aprobadas internacionalmente.
      </p>
    </Section>

    <Section title="7. Retención de Datos">
      <p>Conservamos tu información mientras tu cuenta esté activa. Plazos específicos:</p>
      <List items={[
        <><strong>Cuenta y facturas:</strong> mientras la cuenta esté activa + 5 años por obligaciones contables colombianas.</>,
        <><strong>Logs técnicos / IPs:</strong> máximo 90 días.</>,
        <><strong>Datos de pago (últimos 4 dígitos):</strong> mientras la suscripción esté activa + 12 meses.</>,
        <><strong>Cuenta eliminada por el usuario:</strong> tus datos personales se borran en máximo 30 días, salvo aquellos que la ley nos obligue a conservar.</>,
      ]} />
    </Section>

    <Section title="8. Seguridad de la Información">
      <List items={[
        'Comunicación cifrada extremo a extremo mediante HTTPS/TLS 1.3.',
        'Contraseñas almacenadas con hashing bcrypt + salt único.',
        'Acceso al servidor restringido por SSH con clave pública.',
        'Copias de seguridad periódicas en almacenamiento aislado.',
        'Validación de firma criptográfica HMAC en webhooks de pago.',
        'Sin almacenamiento de números de tarjeta (cumplimos PCI DSS por delegación a Wompi/Stripe).',
      ]} />
    </Section>

    <Section title="9. Tus Derechos como Titular de los Datos">
      <p>Conforme a la Ley 1581 de Colombia y al GDPR, tienes derecho a:</p>
      <List items={[
        'Conocer, actualizar y rectificar tu información personal.',
        'Solicitar copia de los datos que tenemos sobre ti.',
        'Solicitar la eliminación total de tu cuenta y datos personales.',
        'Revocar el consentimiento en cualquier momento.',
        'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) de Colombia.',
      ]} />
      <p className="mt-2">
        Para ejercer cualquiera de estos derechos, escríbenos a{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-lime-600 hover:underline">{CONTACT_EMAIL}</a>{' '}
        y responderemos en máximo 15 días hábiles.
      </p>
    </Section>

    <Section title="10. Eliminación de Cuenta y Datos">
      <p>
        Puedes eliminar tu cuenta y todos tus datos personales asociados en cualquier momento:
      </p>
      <List items={[
        <>Desde la app: <em>Perfil → Zona de Peligro → Eliminar mi cuenta</em>.</>,
        <>Página pública con instrucciones detalladas: <a href="/delete-account" className="text-lime-600 hover:underline">factuya.site/delete-account</a></>,
        <>Por correo: envía un mensaje a <a href={`mailto:${CONTACT_EMAIL}?subject=Eliminar%20mi%20cuenta`} className="text-lime-600 hover:underline">{CONTACT_EMAIL}</a> desde el correo registrado en FactuYa! solicitando la eliminación.</>,
      ]} />
      <p className="mt-2">
        Procesaremos la solicitud dentro de los siguientes 30 días naturales. Algunos datos
        pueden conservarse por obligación legal (facturación, contabilidad).
      </p>
    </Section>

    <Section title="11. Privacidad de Menores de Edad">
      <p>
        FactuYa! está dirigido exclusivamente a personas mayores de 18 años o a adolescentes
        autorizados por sus padres o tutores. No recopilamos intencionalmente datos
        personales de niños menores de 13 años. Si crees que un menor nos ha enviado información,
        contáctanos para eliminarla inmediatamente.
      </p>
    </Section>

    <Section title="12. Cookies y Almacenamiento Local">
      <p>
        Utilizamos exclusivamente cookies y <code>localStorage</code> esenciales para:
      </p>
      <List items={[
        'Mantener tu sesión iniciada de forma segura.',
        'Recordar tu idioma preferido y el tema claro/oscuro.',
        'Guardar borradores de facturas para evitar pérdida de datos.',
      ]} />
      <p className="mt-2">
        <strong>No utilizamos cookies publicitarias, de rastreo de comportamiento, ni de
        terceros con fines de marketing.</strong>
      </p>
    </Section>

    <Section title="13. Cambios a esta Política">
      <p>
        Si actualizamos esta política, te avisaremos por correo electrónico al menos 15 días
        antes de que el cambio entre en vigencia, y publicaremos la nueva versión con su
        fecha de actualización en la parte superior de esta página.
      </p>
    </Section>

    <Section title="14. Contacto y PQR">
      <p>
        Para cualquier pregunta, queja, reclamo o solicitud relacionada con tus datos personales,
        escríbenos a:
      </p>
      <p className="mt-2">
        📧{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-lime-600 hover:underline font-semibold">
          {CONTACT_EMAIL}
        </a>
      </p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Tiempo de respuesta: máximo 15 días hábiles.
      </p>
    </Section>
  </>
);

const EnglishPolicy = () => (
  <>
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
    <p className="text-gray-600 dark:text-gray-400 mb-8">Last updated: {LAST_UPDATED_EN}</p>

    <Section title="1. Data Controller">
      <p>
        FactuYa! (the "App") is operated by the FactuYa! team based in Colombia. This
        policy describes how we collect, use, store, and protect your personal information,
        in compliance with Colombia's Law 1581 (Habeas Data), the EU GDPR where applicable,
        and Google Play policies.
      </p>
      <p className="mt-2">
        Controller contact:{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-lime-600 hover:underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </Section>

    <Section title="2. Information We Collect">
      <List items={[
        <><strong>Account information:</strong> name, email, encrypted password.</>,
        <><strong>Company information:</strong> business name, tax ID, address, phone, and logo used on invoices.</>,
        <><strong>Billing data:</strong> client info (name, ID, contact) and invoice details you generate.</>,
        <><strong>Payment information:</strong> processed by Wompi (Colombia) and Stripe (rest of the world). We never store full card numbers or CVV. Only the last 4 digits are retained for reference.</>,
        <><strong>Technical data:</strong> IP address, browser type, OS, access timestamps — used only for security and fraud prevention.</>,
        <><strong>Language and country:</strong> auto-detected via IP to display correct currency and language.</>,
      ]} />
    </Section>

    <Section title="3. Mobile App Permissions Requested">
      <List items={[
        <><strong>Internet:</strong> required to sync invoices with the cloud.</>,
        <><strong>Limited storage:</strong> to save invoice drafts offline.</>,
        <><strong>Camera (optional):</strong> to capture logos or product photos.</>,
        <><strong>Notifications:</strong> renewal reminders and payment alerts.</>,
      ]} />
      <p className="mt-2">
        FactuYa! does <strong>not</strong> access contacts, GPS, microphone, calendar,
        SMS, calls, or advertising IDs.
      </p>
    </Section>

    <Section title="4. How We Use Your Information">
      <List items={[
        'Create and manage your user account.',
        'Generate, store, and send your invoices, quotes, and other documents.',
        'Process subscription payments via authorized providers.',
        'Send renewal reminders, payment receipts, and important service alerts.',
        'Comply with applicable accounting, tax, and legal obligations.',
        'Improve service quality and prevent fraudulent use.',
      ]} />
      <p className="mt-2">
        <strong>We do not use your data for advertising or sell it to third parties under any circumstances.</strong>
      </p>
    </Section>

    <Section title="5. Third Parties We Share Data With">
      <List items={[
        <><strong>Wompi (Bancolombia):</strong> payment processing in Colombia. <a href="https://wompi.co/es/legal" target="_blank" rel="noreferrer" className="text-lime-600 hover:underline">Policy</a>.</>,
        <><strong>Stripe Inc.:</strong> international payment processing. <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer" className="text-lime-600 hover:underline">Policy</a>.</>,
        <><strong>Resend Inc.:</strong> transactional email delivery. <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noreferrer" className="text-lime-600 hover:underline">Policy</a>.</>,
        <><strong>Google (Auth + Play):</strong> optional Google sign-in and app distribution. <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-lime-600 hover:underline">Policy</a>.</>,
        <><strong>Hosting provider (Hostinger / VPS):</strong> secure data storage.</>,
      ]} />
    </Section>

    <Section title="6. International Data Transfers">
      <p>
        Some providers (Stripe, Resend, Google) process data outside Colombia, primarily in
        the United States and the European Union, under equivalent or stronger protection
        standards and international standard contractual clauses.
      </p>
    </Section>

    <Section title="7. Data Retention">
      <List items={[
        <><strong>Account and invoices:</strong> while the account is active + 5 years (Colombian accounting law).</>,
        <><strong>Technical logs / IPs:</strong> max 90 days.</>,
        <><strong>Last 4 card digits:</strong> while subscription is active + 12 months.</>,
        <><strong>User-deleted account:</strong> personal data wiped within 30 days, except items required by law.</>,
      ]} />
    </Section>

    <Section title="8. Information Security">
      <List items={[
        'End-to-end HTTPS/TLS 1.3 encryption.',
        'Passwords hashed with bcrypt + unique salt.',
        'Server SSH access restricted by public key.',
        'Regular backups in isolated storage.',
        'HMAC cryptographic signature validation on payment webhooks.',
        'No card data stored (PCI DSS compliance delegated to Wompi/Stripe).',
      ]} />
    </Section>

    <Section title="9. Your Rights">
      <List items={[
        'Access, update, and rectify your personal information.',
        'Request a copy of the data we hold.',
        'Request complete deletion of your account and personal data.',
        'Revoke consent at any time.',
        'File complaints with the Colombian SIC.',
      ]} />
      <p className="mt-2">
        Email us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-lime-600 hover:underline">{CONTACT_EMAIL}</a>{' '}
        — we respond within 15 business days.
      </p>
    </Section>

    <Section title="10. Account & Data Deletion">
      <List items={[
        <>In-app: <em>Profile → Delete account</em> (coming soon).</>,
        <>By email: write to <a href={`mailto:${CONTACT_EMAIL}?subject=Delete%20my%20account`} className="text-lime-600 hover:underline">{CONTACT_EMAIL}</a> from your registered email asking for deletion.</>,
      ]} />
      <p className="mt-2">
        Requests are processed within 30 calendar days. Some data may be retained due to
        legal requirements.
      </p>
    </Section>

    <Section title="11. Children's Privacy">
      <p>
        FactuYa! is intended only for users aged 18+ or teenagers with parental consent. We
        do not knowingly collect data from children under 13. Contact us immediately if you
        believe a minor has shared information.
      </p>
    </Section>

    <Section title="12. Cookies & Local Storage">
      <List items={[
        'Keep your session active securely.',
        'Remember your language and light/dark theme preference.',
        'Store invoice drafts to prevent data loss.',
      ]} />
      <p className="mt-2">
        <strong>No advertising cookies, behavior tracking, or third-party marketing cookies.</strong>
      </p>
    </Section>

    <Section title="13. Changes to this Policy">
      <p>
        We will notify you by email at least 15 days before any change takes effect, and
        publish the updated version with its date at the top of this page.
      </p>
    </Section>

    <Section title="14. Contact">
      <p>
        For any data-related question, complaint, or request, contact:
      </p>
      <p className="mt-2">
        📧{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-lime-600 hover:underline font-semibold">
          {CONTACT_EMAIL}
        </a>
      </p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Response time: max 15 business days.
      </p>
    </Section>
  </>
);

const Section = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
    <div className="text-gray-700 dark:text-gray-300 space-y-2">{children}</div>
  </section>
);

const List = ({ items }) => (
  <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
    {items.map((it, i) => <li key={i}>{it}</li>)}
  </ul>
);

export default Privacy;
