import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Mail } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { useTranslation } from 'react-i18next';

const CONTACT_EMAIL = 'soportefactuya@gmail.com';

const FAQS_ES = [
  {
    q: '¿FactuYa! es gratis?',
    a: 'Sí. El plan Gratis te permite crear 10 facturas de prueba sin costo. Cuando necesites facturas ilimitadas y todas las funciones, puedes pasarte al plan Premium por solo $3.99 USD al mes. Sin permanencia.',
  },
  {
    q: '¿Qué tipos de documentos puedo crear?',
    a: 'Puedes crear 12 tipos de documentos: Factura, Factura de Impuestos, Factura Proforma, Cotización, Cuenta de Cobro, Recibo, Recibo de Venta, Recibo de Efectivo, Oferta, Nota de Abono, Pedido y Nota de Entrega.',
  },
  {
    q: '¿Puedo usar FactuYa! sin internet?',
    a: 'Sí. FactuYa! funciona en modo offline gracias a su tecnología PWA. Puedes crear y guardar facturas sin conexión, y se sincronizarán automáticamente con la nube cuando vuelvas a tener internet.',
  },
  {
    q: '¿En qué dispositivos funciona?',
    a: 'FactuYa! funciona desde cualquier navegador web (computador o móvil) y también puedes instalarla como app nativa en Android e iOS desde el botón "Instalar app" de la página de inicio.',
  },
  {
    q: '¿Puedo personalizar mis facturas con mi logo?',
    a: 'Sí. Sube tu logo en el perfil y aparecerá automáticamente en todas tus facturas. En el plan Premium puedes guardar hasta 10 logos diferentes (útil si manejas varias empresas o marcas).',
  },
  {
    q: '¿Maneja varias monedas?',
    a: 'Sí. FactuYa! soporta múltiples monedas con conversión automática en tiempo real. Puedes facturar en pesos colombianos (COP), dólares (USD), euros (EUR), pesos mexicanos (MXN) y muchas más.',
  },
  {
    q: '¿Cómo descargo o comparto una factura?',
    a: 'Desde cada factura tienes los botones "Descargar PDF" y "Compartir". Puedes enviarla directamente por WhatsApp, correo electrónico, o guardarla en tu dispositivo como PDF.',
  },
  {
    q: '¿Cómo pago la suscripción Premium?',
    a: 'Aceptamos varios métodos de pago: tarjeta de crédito/débito vía Wompi (para Colombia), tarjeta internacional vía Stripe (resto del mundo) y PayPal. Tu banco hace la conversión automática a tu moneda local.',
  },
  {
    q: '¿Puedo cancelar la suscripción cuando quiera?',
    a: 'Sí. No hay permanencia ni penalizaciones. Puedes cancelar tu suscripción Premium en cualquier momento desde tu perfil y seguirás teniendo acceso hasta el final del periodo pagado.',
  },
  {
    q: '¿Cómo contacto al soporte?',
    a: `Escríbenos a ${CONTACT_EMAIL} y te respondemos lo antes posible. Los usuarios Premium tienen soporte prioritario.`,
  },
];

const FAQS_EN = [
  {
    q: 'Is FactuYa! free?',
    a: 'Yes. The Free plan lets you create 10 trial invoices at no cost. When you need unlimited invoices and all features, upgrade to Premium for just $3.99 USD per month. No commitment.',
  },
  {
    q: 'What types of documents can I create?',
    a: 'You can create 12 document types: Invoice, Tax Invoice, Pro Forma Invoice, Quote, Collection Note, Receipt, Sales Receipt, Cash Receipt, Offer, Credit Note, Order, and Delivery Note.',
  },
  {
    q: 'Can I use FactuYa! offline?',
    a: 'Yes. FactuYa! works offline thanks to its PWA technology. You can create and save invoices without internet, and they will automatically sync to the cloud once you reconnect.',
  },
  {
    q: 'What devices does it work on?',
    a: 'FactuYa! runs on any web browser (desktop or mobile) and can also be installed as a native app on Android and iOS via the "Install app" button on the home page.',
  },
  {
    q: 'Can I customize my invoices with my logo?',
    a: 'Yes. Upload your logo in your profile and it will appear on all your invoices. Premium users can store up to 10 different logos (useful for multiple businesses or brands).',
  },
  {
    q: 'Does it handle multiple currencies?',
    a: 'Yes. FactuYa! supports multiple currencies with real-time automatic conversion: USD, EUR, COP, MXN, and many more.',
  },
  {
    q: 'How do I download or share an invoice?',
    a: 'Every invoice has "Download PDF" and "Share" buttons. You can send it directly via WhatsApp, email, or save it on your device as a PDF.',
  },
  {
    q: 'How do I pay for Premium?',
    a: 'We accept several payment methods: credit/debit card via Wompi (Colombia), international cards via Stripe (rest of the world), and PayPal. Your bank automatically converts to your local currency.',
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Yes. There is no commitment or penalty. You can cancel your Premium subscription anytime from your profile and keep access until the end of the paid period.',
  },
  {
    q: 'How do I contact support?',
    a: `Email us at ${CONTACT_EMAIL} and we will reply as soon as possible. Premium users get priority support.`,
  },
];

const FAQ = () => {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';
  const faqs = isSpanish ? FAQS_ES : FAQS_EN;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <header className="bg-white dark:bg-card border-b border-gray-200 dark:border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" data-testid="faq-logo-link">
              <div className="flex items-center cursor-pointer">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">Factu</span>
                <span className="text-2xl font-bold text-white bg-lime-500 px-2 ml-1">Ya!</span>
              </div>
            </Link>
            <Link to="/" data-testid="faq-back-link">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {isSpanish ? 'Volver al Inicio' : 'Back to Home'}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-lime-100 dark:bg-lime-900/30 mb-4">
            <HelpCircle className="w-8 h-8 text-lime-600 dark:text-lime-400" />
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3"
            data-testid="faq-title"
          >
            {isSpanish ? 'Preguntas Frecuentes' : 'Frequently Asked Questions'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isSpanish
              ? 'Resolvemos las dudas más comunes sobre FactuYa!'
              : 'We answer the most common questions about FactuYa!'}
          </p>
        </div>

        <div className="bg-white dark:bg-card rounded-lg shadow-sm p-4 sm:p-8" data-testid="faq-content">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((item, idx) => (
              <AccordionItem
                key={idx}
                value={`item-${idx}`}
                data-testid={`faq-item-${idx}`}
              >
                <AccordionTrigger className="text-left text-base sm:text-lg font-semibold text-gray-900 dark:text-white hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="mt-10 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            {isSpanish
              ? '¿No encuentras la respuesta que buscas?'
              : "Can't find the answer you're looking for?"}
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-2 text-lime-600 dark:text-lime-400 font-semibold hover:underline"
            data-testid="faq-contact-link"
          >
            <Mail className="w-4 h-4" />
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
