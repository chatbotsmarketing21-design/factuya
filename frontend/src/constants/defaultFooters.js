// Pies de página predeterminados por tipo de documento e idioma.
// Solo se muestran si el usuario NO ha guardado un texto propio para ese
// (documentType, idioma). En cuanto el usuario escribe algo, el autoguardado
// del creador almacena la versión personalizada (por docType) y ese texto
// tiene prioridad sobre estos defaults.
//
// La Cuenta de Cobro (bill) NO está incluida porque su plantilla maneja
// el pie de página de forma especial (usa datos del perfil bancario).
// Idiomas soportados: es, en, pt, fr.

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
    pt: {
      notes: 'Obrigado pela sua compra. Esperamos continuar trabalhando juntos!',
      terms: 'Pagamento em 30 dias. Após o vencimento incidirão juros de mora.',
    },
    fr: {
      notes: 'Merci pour votre achat. Au plaisir de continuer à travailler ensemble !',
      terms: 'Paiement à 30 jours. Des intérêts de retard s\'appliquent après l\'échéance.',
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
    pt: {
      notes: 'Documento equivalente a fatura de venda com impostos discriminados.',
      terms: 'Pagamento em 30 dias. Guarde este documento para fins fiscais e contábeis.',
    },
    fr: {
      notes: 'Document équivalent à une facture de vente avec taxes détaillées.',
      terms: 'Paiement à 30 jours. Conservez ce document à des fins fiscales et comptables.',
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
    pt: {
      notes: 'Este documento é informativo e não constitui uma venda definitiva.',
      terms: 'Válido por 15 dias. Sujeito a disponibilidade e mudança de preços.',
    },
    fr: {
      notes: 'Ce document est informatif et ne constitue pas une vente définitive.',
      terms: 'Valable 15 jours. Sous réserve de disponibilité et de modifications de prix.',
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
    pt: {
      notes: 'Orçamento elaborado conforme as especificações solicitadas.',
      terms: 'Válido por 15 dias. Preços sujeitos a estoque. Frete não incluído salvo indicação.',
    },
    fr: {
      notes: 'Devis établi selon les spécifications demandées.',
      terms: 'Valable 15 jours. Prix sous réserve de disponibilité. Livraison non incluse sauf mention.',
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
    pt: {
      notes: 'Recebido a contento do cliente.',
      terms: 'Este recibo é o comprovante oficial do pagamento efetuado.',
    },
    fr: {
      notes: 'Reçu à l\'entière satisfaction du client.',
      terms: 'Ce reçu constitue la preuve officielle du paiement effectué.',
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
    pt: {
      notes: 'Obrigado pela sua compra. Produto entregue em perfeitas condições.',
      terms: 'Não aceitamos devoluções após 8 dias ou sem a nota fiscal original.',
    },
    fr: {
      notes: 'Merci pour votre achat. Produit livré en parfait état.',
      terms: 'Aucun retour accepté après 8 jours ou sans la facture originale.',
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
    pt: {
      notes: 'Pagamento recebido em dinheiro.',
      terms: 'Este documento é comprovante de pagamento. Guarde-o para seus registros.',
    },
    fr: {
      notes: 'Paiement reçu en espèces.',
      terms: 'Ce document est une preuve de paiement. Conservez-le pour vos archives.',
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
    pt: {
      notes: 'Oferta especial preparada exclusivamente para você.',
      terms: 'Oferta válida por 7 dias. Sujeita aos termos e condições do estabelecimento.',
    },
    fr: {
      notes: 'Offre spéciale préparée exclusivement pour vous.',
      terms: 'Offre valable 7 jours. Soumise aux conditions générales de l\'entreprise.',
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
    pt: {
      notes: 'Nota de crédito aplicada ao cliente.',
      terms: 'Este valor será descontado da próxima fatura ou reembolsado conforme acordo.',
    },
    fr: {
      notes: 'Avoir appliqué au client.',
      terms: 'Ce montant sera déduit de la prochaine facture ou remboursé selon accord.',
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
    pt: {
      notes: 'Pedido recebido. Processaremos sua solicitação o mais rápido possível.',
      terms: 'O pedido é confirmado após o recebimento do pagamento ou sinal acordado.',
    },
    fr: {
      notes: 'Commande reçue. Nous traiterons votre demande dans les meilleurs délais.',
      terms: 'La commande est confirmée après réception du paiement ou de l\'acompte convenu.',
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
    pt: {
      notes: 'Mercadoria entregue nas condições acordadas.',
      terms: 'Verifique os produtos no momento da entrega. Assinatura de quem recebe.',
    },
    fr: {
      notes: 'Marchandises livrées dans les conditions convenues.',
      terms: 'Vérifiez les produits au moment de la livraison. Signature du destinataire requise.',
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
