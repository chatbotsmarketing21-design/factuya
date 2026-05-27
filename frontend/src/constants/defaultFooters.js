// Pies de página predeterminados por tipo de documento e idioma.
// Solo se muestran si el usuario NO ha guardado un texto propio para ese
// (documentType, idioma). En cuanto el usuario escribe algo, el autoguardado
// del creador almacena la versión personalizada (por docType) y ese texto
// tiene prioridad sobre estos defaults.
//
// La Cuenta de Cobro (bill) NO está incluida porque su plantilla maneja
// el pie de página de forma especial (usa datos del perfil bancario).

const DEFAULT_FOOTERS = {
  invoice: {
    es: {
      notes: 'Gracias por su compra. ¡Confiamos en seguir trabajando juntos!',
      terms: 'Pago a 30 días. Después de la fecha de vencimiento aplica interés moratorio.',
    },
    en: {
      notes: 'Thank you for your purchase. We look forward to working with you again!',
      terms: 'Payment due within 30 days. Past-due amounts will accrue interest.',
    },
  },
  tax_invoice: {
    es: {
      notes: 'Documento equivalente a factura de venta con impuestos discriminados.',
      terms: 'Pago a 30 días. Conserve este documento para fines tributarios y contables.',
    },
    en: {
      notes: 'Equivalent to a sales invoice with taxes itemized.',
      terms: 'Payment due within 30 days. Keep this document for tax and accounting purposes.',
    },
  },
  proforma: {
    es: {
      notes: 'Este documento es informativo y no constituye una venta definitiva.',
      terms: 'Validez de 15 días. Sujeto a disponibilidad y cambios de precio.',
    },
    en: {
      notes: 'This document is informational and does not constitute a final sale.',
      terms: 'Valid for 15 days. Subject to availability and price changes.',
    },
  },
  quotation: {
    es: {
      notes: 'Cotización elaborada según las especificaciones solicitadas.',
      terms: 'Validez 15 días. Precios sujetos a stock. No incluye envío salvo indicación.',
    },
    en: {
      notes: 'Quote prepared according to the requested specifications.',
      terms: 'Valid for 15 days. Prices subject to availability. Shipping not included unless stated.',
    },
  },
  receipt: {
    es: {
      notes: 'Recibido a satisfacción del cliente.',
      terms: 'Este recibo es la constancia oficial del pago efectuado.',
    },
    en: {
      notes: 'Received in full satisfaction of the customer.',
      terms: 'This receipt is the official record of the payment made.',
    },
  },
  sales_receipt: {
    es: {
      notes: 'Gracias por su compra. Producto entregado en perfecto estado.',
      terms: 'No se aceptan devoluciones después de 8 días sin factura.',
    },
    en: {
      notes: 'Thank you for your purchase. Product delivered in perfect condition.',
      terms: 'No returns accepted after 8 days or without the original invoice.',
    },
  },
  cash_receipt: {
    es: {
      notes: 'Pago recibido en efectivo.',
      terms: 'Este documento es comprobante de pago. Consérvelo para sus registros.',
    },
    en: {
      notes: 'Payment received in cash.',
      terms: 'This document is proof of payment. Keep it for your records.',
    },
  },
  offer: {
    es: {
      notes: 'Oferta especial preparada exclusivamente para usted.',
      terms: 'Oferta válida por 7 días. Sujeta a los términos y condiciones del establecimiento.',
    },
    en: {
      notes: 'Special offer prepared exclusively for you.',
      terms: 'Offer valid for 7 days. Subject to the terms and conditions of the business.',
    },
  },
  credit_note: {
    es: {
      notes: 'Nota crédito aplicada al cliente.',
      terms: 'Este valor se descontará de la próxima factura o se reembolsará según acuerdo.',
    },
    en: {
      notes: 'Credit note applied to the customer.',
      terms: 'This amount will be discounted from the next invoice or refunded as agreed.',
    },
  },
  order: {
    es: {
      notes: 'Pedido recibido. Procesamos su solicitud lo antes posible.',
      terms: 'El pedido se confirma una vez recibido el pago o anticipo acordado.',
    },
    en: {
      notes: 'Order received. We will process your request as soon as possible.',
      terms: 'The order is confirmed once payment or agreed deposit is received.',
    },
  },
  delivery_note: {
    es: {
      notes: 'Mercancía entregada en las condiciones acordadas.',
      terms: 'Verifique los productos al momento de la entrega. Firma de quien recibe.',
    },
    en: {
      notes: 'Goods delivered under the agreed conditions.',
      terms: 'Please check the products upon delivery. Signature of receiver required.',
    },
  },
};

/**
 * Devuelve el footer predeterminado (notes + terms) para un tipo de documento
 * en el idioma indicado. Si no existe el idioma, cae a español.
 * Si no existe el documentType (ej: 'bill'), devuelve null.
 */
export const getDefaultFooter = (documentType, language = 'es') => {
  const byType = DEFAULT_FOOTERS[documentType];
  if (!byType) return null;
  const lang = (language || 'es').toLowerCase().split('-')[0];
  return byType[lang] || byType.es || null;
};

export default DEFAULT_FOOTERS;
