import React from 'react';
import { useTranslation } from 'react-i18next';

const InvoiceTemplateWave = ({ invoice, template }) => {
  const { t } = useTranslation();

  // Safe access to nested properties
  const from = invoice?.from || invoice?.fromAddress || {};
  const to = invoice?.to || invoice?.toAddress || {};
  const items = invoice?.items || [];
  const isPaid = invoice?.status === 'paid';

  // Función para formatear números con punto de miles y coma decimal
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

  const waveColor = template?.color || '#4AABE3';

  return (
    <div className="bg-white shadow-lg relative overflow-hidden" style={{ minHeight: '800px' }}>
      {/* Sello de PAGADO */}
      {isPaid && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 10 }}
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

      {/* Wave Top */}
      <div className="absolute top-0 left-0 right-0 h-32 overflow-hidden">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full" style={{ transform: 'rotate(180deg)' }}>
          <path 
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" 
            fill={waveColor}
            opacity="0.3"
          />
          <path 
            d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" 
            fill={waveColor}
            opacity="0.5"
          />
          <path 
            d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,googletag72.57-53.33,248.8-50V0Z" 
            fill={waveColor}
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 p-8 pt-16">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-serif italic text-gray-900">
              {from.name || 'Tu Empresa'}
            </h1>
            {from.nit && <p className="text-gray-600 text-sm mt-1">NIT: {from.nit}</p>}
            {(from.email || from.phone) && (
              <p className="text-gray-600 text-sm">
                {from.email}{from.email && from.phone ? ' | ' : ''}{from.phone}
              </p>
            )}
            {from.address && <p className="text-gray-600 text-sm">{from.address}</p>}
            {from.city && <p className="text-gray-600 text-sm">{from.city}</p>}
            {from.state && <p className="text-gray-600 text-sm">{from.state}</p>}
            {from.zip && <p className="text-gray-600 text-sm">{from.zip}</p>}
            {from.country && <p className="text-gray-600 text-sm">{from.country}</p>}
          </div>
          <div className="text-right">
            {invoice?.logo ? (
              <img 
                src={invoice.logo} 
                alt="Logo" 
                className="h-20 w-20 object-contain ml-auto"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center text-gray-500 text-xs ml-auto">
                LOGO
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
          <div>
            <h3 className="font-semibold" style={{ color: waveColor }}>Facturar a</h3>
            <p className="font-bold text-gray-800 mt-1">{to.name || ''}</p>
            {to.nit && <p className="text-gray-600">NIT/CC: {to.nit}</p>}
            <p className="text-gray-600">{to.address || ''}</p>
            <p className="text-gray-600">{to.city}{to.city && to.state ? ', ' : ''}{to.state}</p>
          </div>
          <div className="text-right">
            <div className="mb-2">
              <span className="font-semibold" style={{ color: waveColor }}>{getDocumentTitle(invoice?.documentType)} #</span>
              <span className="ml-2 text-gray-800">{invoice?.number || invoice?.invoiceNumber || 'S/N'}</span>
            </div>
            <div className="mb-2">
              <span className="font-semibold" style={{ color: waveColor }}>Fecha</span>
              <span className="ml-2 text-gray-800">{invoice?.date || ''}</span>
            </div>
            <div>
              <span className="font-semibold" style={{ color: waveColor }}>Vencimiento</span>
              <span className="ml-2 text-gray-800">{invoice?.dueDate || ''}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: waveColor }}>
                <th className="text-left py-3 px-4 text-white font-semibold">Cant.</th>
                <th className="text-left py-3 px-4 text-white font-semibold">Descripción</th>
                <th className="text-right py-3 px-4 text-white font-semibold">Precio unitario</th>
                <th className="text-right py-3 px-4 text-white font-semibold">Importe</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="py-3 px-4 text-gray-700">{item?.quantity || 0}</td>
                  <td className="py-3 px-4 text-gray-900">{item?.description || ''}</td>
                  <td className="py-3 px-4 text-right text-gray-700">${formatCurrency(item?.rate)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-gray-900">${formatCurrency(item?.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold text-gray-900">${formatCurrency(invoice?.subtotal)}</span>
            </div>
            {invoice?.hasTax && invoice?.taxRate > 0 && (
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">{invoice?.taxName || 'IVA'} {invoice?.taxRate}%</span>
                <span className="font-semibold text-gray-900">${formatCurrency(invoice?.tax)}</span>
              </div>
            )}
            <div className="flex justify-between py-3">
              <span className="font-bold text-lg" style={{ color: waveColor }}>Total</span>
              <span className="font-bold text-lg">${formatCurrency(invoice?.total)}</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        {invoice?.terms && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2" style={{ color: waveColor }}>Condiciones y forma de pago</h4>
            <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.terms}</p>
          </div>
        )}

        {/* Notes */}
        {invoice?.notes && (
          <div>
            <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Wave Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-40 overflow-hidden">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
          <path 
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" 
            fill={waveColor}
            opacity="0.3"
          />
          <path 
            d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" 
            fill={waveColor}
            opacity="0.5"
          />
          <path 
            d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" 
            fill={waveColor}
          />
        </svg>
      </div>
    </div>
  );
};

export default InvoiceTemplateWave;
