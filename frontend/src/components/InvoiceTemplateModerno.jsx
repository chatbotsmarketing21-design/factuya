import React from 'react';
import { useTranslation } from 'react-i18next';

const InvoiceTemplateModerno = ({ invoice, template }) => {
  const { t } = useTranslation();

  // Safe access to nested properties
  const from = invoice?.from || invoice?.fromAddress || {};
  const to = invoice?.to || invoice?.toAddress || {};
  const items = invoice?.items || [];
  const isPaid = invoice?.status === 'paid';

  // Color dinámico desde la plantilla
  const primaryColor = template?.color || '#DC2626';

  // Función para formatear números
  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    return num.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getDocumentTitle = (type) => {
    const titles = {
      invoice: 'Factura',
      proforma: 'Factura Proforma',
      quotation: 'Cotización',
      bill: 'Cuenta de Cobro',
      receipt: 'Recibo'
    };
    return titles[type] || 'Factura';
  };

  return (
    <div className="bg-white shadow-lg relative overflow-hidden" style={{ minHeight: '800px' }}>
      {/* Sello de PAGADO */}
      {isPaid && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 20 }}
        >
          <div 
            className="border-8 border-red-500 text-red-500 font-bold text-6xl px-8 py-4 rounded-lg opacity-40"
            style={{ 
              transform: 'rotate(-25deg)',
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            PAGADO
          </div>
        </div>
      )}

      {/* Left Sidebar */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center"
        style={{ backgroundColor: primaryColor }}
      >
        <div 
          className="text-white font-bold text-lg tracking-widest whitespace-nowrap"
          style={{ 
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            letterSpacing: '0.15em'
          }}
        >
          {getDocumentTitle(invoice?.documentType)} {invoice?.number || 'S/N'}
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-12 p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>
              {from.name || 'Tu Empresa'}
            </h1>
            {from.nit && <p className="text-gray-600 text-sm">NIT: {from.nit}</p>}
            {from.address && <p className="text-gray-600 text-sm">{from.address}</p>}
            {(from.city || from.state || from.zip) && (
              <p className="text-gray-600 text-sm">
                {from.zip && `${from.zip} `}{from.city}{from.city && from.state ? ', ' : ''}{from.state}
              </p>
            )}
            {from.email && <p className="text-gray-600 text-sm">{from.email}</p>}
            {from.phone && <p className="text-gray-600 text-sm">{from.phone}</p>}
          </div>
          <div className="text-right">
            {invoice?.logo ? (
              <img 
                src={invoice.logo} 
                alt="Logo" 
                className="h-16 w-16 object-contain ml-auto"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs ml-auto">
                LOGO
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-0.5 mb-6" style={{ backgroundColor: primaryColor }}></div>

        {/* Info Section */}
        <div className="grid grid-cols-4 gap-4 mb-6 text-sm">
          {/* Facturar a */}
          <div>
            <h3 className="font-semibold mb-2" style={{ color: primaryColor }}>Facturar a</h3>
            <p className="text-gray-800 font-medium">{to.name || ''}</p>
            {to.nit && <p className="text-gray-600">{to.nit}</p>}
            {to.phone && <p className="text-gray-600">{to.phone}</p>}
            {to.address && <p className="text-gray-600">{to.address}</p>}
            {(to.city || to.state) && (
              <p className="text-gray-600">
                {to.city}{to.city && to.state ? ', ' : ''}{to.state}
              </p>
            )}
          </div>

          {/* Enviar a */}
          <div>
            <h3 className="font-semibold mb-2" style={{ color: primaryColor }}>Enviar a</h3>
            <p className="text-gray-800 font-medium">{to.name || ''}</p>
            {to.address && <p className="text-gray-600">{to.address}</p>}
            {(to.city || to.state) && (
              <p className="text-gray-600">
                {to.city}{to.city && to.state ? ', ' : ''}{to.state}
              </p>
            )}
          </div>

          {/* Document Info */}
          <div className="text-right col-span-2">
            <div className="mb-2">
              <span className="font-semibold" style={{ color: primaryColor }}>Fecha de la {getDocumentTitle(invoice?.documentType).toLowerCase()}</span>
              <p className="text-gray-800">{invoice?.date || ''}</p>
            </div>
            <div>
              <span className="font-semibold" style={{ color: primaryColor }}>N° de pedido</span>
              <p className="text-gray-800">{invoice?.number || ''}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: primaryColor }}>
                <th className="text-left py-3 px-3 text-white font-semibold" style={{ width: '10%' }}>Cant.</th>
                <th className="text-left py-3 px-3 text-white font-semibold" style={{ width: '50%' }}>Descripción</th>
                <th className="text-right py-3 px-3 text-white font-semibold" style={{ width: '20%' }}>Precio unitario</th>
                <th className="text-right py-3 px-3 text-white font-semibold" style={{ width: '20%' }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-3 px-3 text-gray-700 text-center">{item?.quantity || 0}</td>
                  <td className="py-3 px-3 text-gray-900">{item?.description || ''}</td>
                  <td className="py-3 px-3 text-right text-gray-700">{formatCurrency(item?.rate)}</td>
                  <td className="py-3 px-3 text-right text-gray-900">{formatCurrency(item?.amount)}</td>
                </tr>
              ))}
              {/* Empty rows */}
              {items.length < 4 && [...Array(4 - items.length)].map((_, index) => (
                <tr key={`empty-${index}`} className="border-b border-gray-200">
                  <td className="py-3 px-3">&nbsp;</td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-56">
            <div className="flex justify-between py-2">
              <span className="text-gray-700">Subtotal</span>
              <span className="text-gray-900">{formatCurrency(invoice?.subtotal)}</span>
            </div>
            {invoice?.hasTax && invoice?.taxRate > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-gray-700">{invoice?.taxName || 'IVA'} {invoice?.taxRate}%</span>
                <span className="text-gray-900">{formatCurrency(invoice?.tax)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t border-gray-300">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-bold text-lg" style={{ color: primaryColor }}>{formatCurrency(invoice?.total)} $</span>
            </div>
          </div>
        </div>

        {/* Signature Area */}
        <div className="flex justify-end mb-8">
          <div className="w-48 text-center">
            <div className="h-16 border-b border-gray-400"></div>
            <p className="text-sm text-gray-500 mt-1">Firma</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-0.5 mb-4" style={{ backgroundColor: primaryColor }}></div>

        {/* Terms & Conditions */}
        {invoice?.terms && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm mb-2" style={{ color: primaryColor }}>Condiciones y forma de pago</h4>
            <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.terms}</p>
          </div>
        )}

        {/* Notes */}
        {invoice?.notes && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceTemplateModerno;
