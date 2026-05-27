import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useTranslation } from 'react-i18next';

const LAST_UPDATED_ES = 'Mayo de 2026';
const LAST_UPDATED_EN = 'May 2026';
const CONTACT_EMAIL = 'soportefactuya@gmail.com';
const SUBSCRIPTION_PRICE_USD = '3.99 USD';

const Terms = () => {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language?.startsWith('es');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <header className="bg-white dark:bg-card border-b border-gray-200 dark:border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" data-testid="terms-logo-link">
              <div className="flex items-center cursor-pointer">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">Factu</span>
                <span className="text-2xl font-bold text-white bg-lime-500 px-2 ml-1">Ya!</span>
              </div>
            </Link>
            <Link to="/" data-testid="terms-back-link">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.backToHome')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-card rounded-lg shadow-sm p-8" data-testid="terms-content">
          {isSpanish ? <SpanishTerms /> : <EnglishTerms />}
        </div>
      </div>
    </div>
  );
};

const SpanishTerms = () => (
  <>
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Términos y Condiciones de Uso</h1>
    <p className="text-gray-600 dark:text-gray-400 mb-8">Última actualización: {LAST_UPDATED_ES}</p>

    <Section title="1. Aceptación de los Términos">
      <p>
        Al registrarte, acceder o utilizar FactuYa! (la "Aplicación", el "Servicio"),
        aceptas estos Términos y Condiciones en su totalidad. Si no estás de acuerdo,
        debes abstenerte de usar el Servicio.
      </p>
      <p className="mt-2">
        Estos términos constituyen un acuerdo legal vinculante entre tú (el "Usuario") y
        FactuYa! (el "Proveedor del Servicio").
      </p>
    </Section>

    <Section title="2. Descripción del Servicio">
      <p>
        FactuYa! es una plataforma de software como servicio (SaaS) diseñada para
        emprendedores, profesionales independientes y pequeñas empresas, que permite:
      </p>
      <List items={[
        'Crear, gestionar y enviar facturas, cotizaciones y cuentas de cobro.',
        'Almacenar información de clientes y productos.',
        'Generar documentos en formato PDF para descarga, impresión y envío.',
        'Acceder a plantillas profesionales personalizables.',
        'Recibir notificaciones de vencimiento de suscripción.',
      ]} />
    </Section>

    <Section title="3. Registro de Cuenta y Edad Mínima">
      <List items={[
        'Debes tener al menos 18 años para crear una cuenta, o ser menor de edad con autorización expresa de tus padres o tutores legales.',
        'La información que proporciones al registrarte debe ser veraz, completa y actualizada.',
        'Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad realizada bajo tu cuenta.',
        'Debes notificarnos de inmediato si sospechas que tu cuenta fue comprometida.',
      ]} />
    </Section>

    <Section title="4. Planes y Pagos">
      <p>
        FactuYa! ofrece un plan gratuito limitado y un plan Premium de pago:
      </p>
      <List items={[
        <><strong>Plan Gratuito:</strong> permite crear un número limitado de facturas mensuales y acceder a funcionalidades básicas.</>,
        <><strong>Plan Premium ({SUBSCRIPTION_PRICE_USD}/mes):</strong> documentos ilimitados, todas las plantillas premium, soporte prioritario y futuras funcionalidades avanzadas.</>,
      ]} />
      <p className="mt-2">
        El precio puede ajustarse periódicamente. Cualquier cambio se notificará por correo
        electrónico con al menos 15 días de anticipación.
      </p>
      <p className="mt-2">
        Los pagos son procesados por <strong>Wompi</strong> (Colombia) y <strong>Stripe</strong>
        (resto del mundo). FactuYa! nunca almacena datos de tarjetas.
      </p>
    </Section>

    <Section title="5. Renovación y Cancelación">
      <List items={[
        'La suscripción Premium se factura por períodos mensuales prepagos.',
        'Te enviaremos un recordatorio por correo electrónico 3 días antes del vencimiento para que renueves con un clic.',
        'Si no renuevas antes de la fecha de vencimiento, tu cuenta volverá automáticamente al plan gratuito; tus datos y facturas anteriores se conservan intactos.',
        'Puedes cancelar la suscripción en cualquier momento desde el panel "Suscripción". La cancelación tiene efecto al final del período ya pagado.',
      ]} />
    </Section>

    <Section title="6. Política de Reembolsos">
      <p>
        Dado el bajo costo del plan Premium ({SUBSCRIPTION_PRICE_USD}/mes) y la naturaleza
        digital del servicio, <strong>los pagos no son reembolsables</strong>, salvo:
      </p>
      <List items={[
        'Doble cobro por error técnico atribuible a FactuYa! (reembolso total).',
        'Fallo grave de servicio que impida usar la plataforma por más de 72 horas consecutivas, demostrable con evidencia técnica (reembolso proporcional).',
      ]} />
      <p className="mt-2">
        Las solicitudes de reembolso deben enviarse a{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-lime-600 hover:underline">{CONTACT_EMAIL}</a>{' '}
        dentro de los 7 días naturales siguientes al cobro.
      </p>
    </Section>

    <Section title="7. Uso Aceptable del Servicio">
      <p>Te comprometes a NO utilizar FactuYa! para:</p>
      <List items={[
        'Facturar productos o servicios ilegales (drogas, armas, lavado de activos, productos falsificados, etc.).',
        'Defraudar a clientes, autoridades fiscales o terceros.',
        'Cargar contenido difamatorio, obsceno, discriminatorio o que viole derechos de propiedad intelectual.',
        'Realizar ingeniería inversa, hackeos, o intentos de comprometer la seguridad del Servicio.',
        'Enviar spam o usar nuestros servidores de correo para envíos masivos no consentidos.',
        'Revender o sublicenciar el Servicio sin autorización escrita previa.',
      ]} />
      <p className="mt-2">
        Cualquier violación nos faculta a <strong>suspender o eliminar la cuenta sin previo
        aviso</strong> y, si corresponde, a notificar a las autoridades competentes.
      </p>
    </Section>

    <Section title="8. Propiedad de los Datos del Usuario">
      <p>
        <strong>Tú mantienes la propiedad absoluta de tus facturas, clientes, productos y
        cualquier contenido que generes.</strong> FactuYa! solo actúa como custodio para
        prestarte el servicio.
      </p>
      <p className="mt-2">
        Puedes exportar todos tus datos en cualquier momento. Si decides eliminar tu cuenta,
        eliminaremos tu información personal conforme a nuestra Política de Privacidad.
      </p>
    </Section>

    <Section title="9. Propiedad Intelectual de FactuYa!">
      <p>
        El software, código, diseño, marca "FactuYa!", logos, plantillas, textos y demás
        elementos de la plataforma son propiedad exclusiva de FactuYa! y están protegidos
        por las leyes de propiedad intelectual de Colombia e internacionales.
      </p>
      <p className="mt-2">
        Te otorgamos una licencia limitada, personal, no exclusiva y revocable para usar
        FactuYa! mientras cumplas con estos términos.
      </p>
    </Section>

    <Section title="10. Disponibilidad del Servicio">
      <p>
        Hacemos esfuerzos razonables para mantener una disponibilidad del 99% mensual, pero
        no garantizamos un servicio ininterrumpido. Pueden ocurrir interrupciones por:
      </p>
      <List items={[
        'Mantenimiento programado (con aviso previo cuando sea posible).',
        'Fallos de proveedores externos (Wompi, Stripe, hosting).',
        'Causas de fuerza mayor.',
      ]} />
    </Section>

    <Section title="11. Limitación de Responsabilidad">
      <p>
        FactuYa! se proporciona "tal cual" y no garantizamos que sea adecuado para fines
        contables específicos. <strong>Eres el único responsable de:</strong>
      </p>
      <List items={[
        'La veracidad de la información que ingresas (productos, precios, NIT, datos de clientes).',
        'El cumplimiento tributario y la declaración de impuestos.',
        'La validez fiscal de los documentos en tu jurisdicción.',
        'Hacer copias de seguridad de tu información crítica.',
      ]} />
      <p className="mt-2">
        En ningún caso FactuYa! será responsable de lucro cesante, daños indirectos,
        incidentales o consecuentes derivados del uso del Servicio. La responsabilidad total
        máxima de FactuYa! ante cualquier reclamo se limita al monto pagado por el usuario
        en los 12 meses anteriores al evento que dio origen al reclamo.
      </p>
    </Section>

    <Section title="12. Modificaciones del Servicio">
      <p>
        Nos reservamos el derecho de modificar, suspender o discontinuar cualquier parte
        del Servicio en cualquier momento. Te avisaremos con al menos 30 días de
        anticipación si los cambios afectan funcionalidades pagas.
      </p>
    </Section>

    <Section title="13. Modificaciones de estos Términos">
      <p>
        Podemos actualizar estos Términos cuando sea necesario. Las versiones modificadas
        serán publicadas en esta página con su fecha de actualización. Para cambios
        sustanciales, notificaremos por correo electrónico con 15 días de anticipación.
      </p>
    </Section>

    <Section title="14. Terminación">
      <p>
        Puedes cerrar tu cuenta en cualquier momento. Nosotros podemos suspender o eliminar
        cuentas que:
      </p>
      <List items={[
        'Violen estos Términos.',
        'Realicen actividades fraudulentas.',
        'Generen contracargos injustificados.',
        'Estén inactivas por más de 24 meses consecutivos (con aviso previo).',
      ]} />
    </Section>

    <Section title="15. Ley Aplicable y Resolución de Conflictos">
      <p>
        Estos Términos se rigen por las leyes de la <strong>República de Colombia</strong>.
        Cualquier controversia será resuelta por los jueces competentes de la ciudad de
        domicilio del Proveedor del Servicio.
      </p>
      <p className="mt-2">
        Antes de iniciar acciones legales, las partes se comprometen a intentar resolver la
        disputa amistosamente mediante comunicación directa por correo electrónico.
      </p>
    </Section>

    <Section title="16. Contacto">
      <p>
        Para cualquier consulta sobre estos Términos:
      </p>
      <p className="mt-2">
        📧{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-lime-600 hover:underline font-semibold">
          {CONTACT_EMAIL}
        </a>
      </p>
    </Section>
  </>
);

const EnglishTerms = () => (
  <>
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Terms of Service</h1>
    <p className="text-gray-600 dark:text-gray-400 mb-8">Last updated: {LAST_UPDATED_EN}</p>

    <Section title="1. Acceptance of Terms">
      <p>
        By registering, accessing, or using FactuYa! (the "App", the "Service") you fully
        accept these Terms of Service. If you disagree, you must refrain from using the Service.
      </p>
    </Section>

    <Section title="2. Service Description">
      <p>FactuYa! is a SaaS platform for entrepreneurs, freelancers, and small businesses that lets you:</p>
      <List items={[
        'Create, manage, and send invoices, quotes, and collection statements.',
        'Store client and product information.',
        'Generate PDF documents for download, print, and email.',
        'Access customizable professional templates.',
        'Receive subscription renewal notifications.',
      ]} />
    </Section>

    <Section title="3. Account Registration and Minimum Age">
      <List items={[
        'You must be at least 18, or a minor with explicit parental authorization.',
        'Information provided at registration must be truthful, complete, and current.',
        'You are responsible for your password and any activity under your account.',
        'Notify us immediately of suspected account compromise.',
      ]} />
    </Section>

    <Section title="4. Plans and Payments">
      <List items={[
        <><strong>Free plan:</strong> limited monthly invoices and basic features.</>,
        <><strong>Premium plan ({SUBSCRIPTION_PRICE_USD}/month):</strong> unlimited documents, all premium templates, priority support, and future advanced features.</>,
      ]} />
      <p className="mt-2">
        Pricing may change with at least 15 days' email notice. Payments processed by
        Wompi (Colombia) and Stripe (rest of the world). We never store card data.
      </p>
    </Section>

    <Section title="5. Renewal and Cancellation">
      <List items={[
        'Premium subscriptions are billed in prepaid monthly periods.',
        'We email a reminder 3 days before expiry for 1-click renewal.',
        'If you do not renew, your account reverts to the free plan; your data and existing invoices remain intact.',
        'You can cancel anytime from the Subscription panel; cancellation takes effect at the end of the paid period.',
      ]} />
    </Section>

    <Section title="6. Refund Policy">
      <p>
        Given the low cost ({SUBSCRIPTION_PRICE_USD}/month) and the digital nature of the
        service, <strong>payments are non-refundable</strong> except:
      </p>
      <List items={[
        'Duplicate charges caused by a technical error of FactuYa! (full refund).',
        'Major service failure preventing use for more than 72 consecutive hours, with technical evidence (pro-rata refund).',
      ]} />
      <p className="mt-2">
        Refund requests must be sent to{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-lime-600 hover:underline">{CONTACT_EMAIL}</a>{' '}
        within 7 natural days from the charge.
      </p>
    </Section>

    <Section title="7. Acceptable Use">
      <p>You agree NOT to use FactuYa! to:</p>
      <List items={[
        'Invoice illegal products or services (drugs, weapons, money laundering, counterfeit goods, etc.).',
        'Defraud customers, tax authorities, or third parties.',
        'Upload defamatory, obscene, discriminatory, or IP-infringing content.',
        'Reverse-engineer, hack, or compromise the Service security.',
        'Send spam or mass unsolicited emails through our servers.',
        'Resell or sublicense the Service without prior written authorization.',
      ]} />
      <p className="mt-2">
        Violations may result in <strong>account suspension or deletion without prior notice</strong>
        and reporting to authorities when applicable.
      </p>
    </Section>

    <Section title="8. Ownership of User Data">
      <p>
        <strong>You retain absolute ownership of your invoices, clients, products, and any
        content you generate.</strong> FactuYa! only acts as a custodian to provide the service.
      </p>
      <p className="mt-2">
        You can export all your data at any time. If you delete your account, we will erase
        your personal information per our Privacy Policy.
      </p>
    </Section>

    <Section title="9. FactuYa! Intellectual Property">
      <p>
        The software, code, design, "FactuYa!" brand, logos, templates, copy, and other
        platform elements are FactuYa!'s exclusive property, protected by Colombian and
        international intellectual property laws.
      </p>
    </Section>

    <Section title="10. Service Availability">
      <p>
        We aim for 99% monthly availability but do not guarantee uninterrupted service.
        Outages may occur due to scheduled maintenance, third-party provider failures, or
        force majeure.
      </p>
    </Section>

    <Section title="11. Limitation of Liability">
      <p>
        FactuYa! is provided "as is" and we do not warrant suitability for specific
        accounting purposes. <strong>You are solely responsible for:</strong>
      </p>
      <List items={[
        'The accuracy of data you enter (products, prices, tax IDs, client data).',
        'Tax compliance and tax filings.',
        'The fiscal validity of documents in your jurisdiction.',
        'Backing up your critical information.',
      ]} />
      <p className="mt-2">
        In no event shall FactuYa! be liable for lost profits, indirect, incidental, or
        consequential damages. Our total liability is capped at the amount you paid in the
        12 months prior to the claim.
      </p>
    </Section>

    <Section title="12. Service Modifications">
      <p>
        We may modify, suspend, or discontinue any part of the Service at any time. We will
        notify with at least 30 days' notice for changes affecting paid features.
      </p>
    </Section>

    <Section title="13. Changes to these Terms">
      <p>
        We may update these Terms when necessary. Updated versions will be posted on this
        page with their update date. For substantial changes, we will notify via email
        15 days in advance.
      </p>
    </Section>

    <Section title="14. Termination">
      <p>You may close your account anytime. We may suspend or delete accounts that:</p>
      <List items={[
        'Violate these Terms.',
        'Engage in fraudulent activity.',
        'Generate unjustified chargebacks.',
        'Stay inactive for more than 24 consecutive months (with prior notice).',
      ]} />
    </Section>

    <Section title="15. Governing Law and Dispute Resolution">
      <p>
        These Terms are governed by the laws of the <strong>Republic of Colombia</strong>.
        Any controversy will be resolved by the competent courts in the city of the Service
        Provider's domicile.
      </p>
    </Section>

    <Section title="16. Contact">
      <p>For any inquiries about these Terms:</p>
      <p className="mt-2">
        📧{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-lime-600 hover:underline font-semibold">
          {CONTACT_EMAIL}
        </a>
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

export default Terms;
