import React from 'react';
import { useTranslation } from 'react-i18next';

const InvoiceTemplateDexter = ({ invoice, template }) => {
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
      invoice: 'FACTURA',
      proforma: 'FACTURA PROFORMA',
      quotation: 'COTIZACIÓN',
      bill: 'CUENTA DE COBRO',
      receipt: 'RECIBO'
    };
    return titles[type] || 'FACTURA';
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

      {/* Left Wave Pattern */}
      <div className="absolute left-0 top-0 bottom-0 w-16" style={{ zIndex: 1 }}>
        <svg viewBox="0 0 60 800" preserveAspectRatio="none" className="h-full w-full">
          <path d="M0,0 C20,100 40,150 30,250 C20,350 40,400 30,500 C20,600 40,700 30,800 L0,800 Z" fill="#7CB342" opacity="0.9"/>
          <path d="M10,0 C30,120 50,180 40,280 C30,380 50,430 40,530 C30,630 50,730 40,800 L0,800 Z" fill="#C5E1A5" opacity="0.7"/>
          <path d="M20,0 C40,80 60,140 50,240 C40,340 60,390 50,490 C40,590 60,690 50,800 L0,800 Z" fill="#FDD835" opacity="0.6"/>
          <path d="M30,0 C50,60 70,120 60,220 C50,320 70,370 60,470 C50,570 70,670 60,800 L0,800 Z" fill="#4FC3F7" opacity="0.5"/>
        </svg>
      </div>

      {/* Right Wave Pattern */}
      <div className="absolute right-0 top-0 bottom-0 w-16" style={{ zIndex: 1 }}>
        <svg viewBox="0 0 60 800" preserveAspectRatio="none" className="h-full w-full">
          <path d="M60,0 C40,100 20,150 30,250 C40,350 20,400 30,500 C40,600 20,700 30,800 L60,800 Z" fill="#7CB342" opacity="0.9"/>
          <path d="M50,0 C30,120 10,180 20,280 C30,380 10,430 20,530 C30,630 10,730 20,800 L60,800 Z" fill="#C5E1A5" opacity="0.7"/>
          <path d="M40,0 C20,80 0,140 10,240 C20,340 0,390 10,490 C20,590 0,690 10,800 L60,800 Z" fill="#FDD835" opacity="0.6"/>
          <path d="M30,0 C10,60 -10,120 0,220 C10,320 -10,370 0,470 C10,570 -10,670 0,800 L60,800 Z" fill="#4FC3F7" opacity="0.5"/>
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 px-20 py-8">
        {/* Document Title */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold tracking-wide" style={{ color: '#1565C0', fontFamily: 'Georgia, serif' }}>
            {getDocumentTitle(invoice?.documentType)}
          </h1>
          <div className="h-1 w-48 mt-2" style={{ backgroundColor: '#4FC3F7' }}></div>
        </div>

        {/* Company Info */}
        <div className="mb-6 text-sm">
          <p className="font-bold text-gray-800">{from.name || 'Tu Empresa'}</p>
          {from.nit && <p className="text-gray-600">NIT: {from.nit}</p>}
          {from.address && <p className="text-gray-600">{from.address}</p>}
          {(from.city || from.state || from.zip) && (
            <p className="text-gray-600">
              {from.zip && `${from.zip} `}{from.city}{from.city && from.state ? ', ' : ''}{from.state}
            </p>
          )}
        </div>

        {/* Three Column Section */}
        <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
          {/* Bill To */}
          <div>
            <h3 className="font-bold text-gray-700 mb-2" style={{ color: '#1565C0' }}>FACTURAR A</h3>
            <p className="text-gray-800">{to.name || ''}</p>
            {to.nit && <p className="text-gray-600">NIT: {to.nit}</p>}
            {to.address && <p className="text-gray-600">{to.address}</p>}
            {(to.city || to.state || to.zip) && (
              <p className="text-gray-600">
                {to.zip && `${to.zip} `}{to.city}{to.city && to.state ? ', ' : ''}{to.state}
              </p>
            )}
          </div>

          {/* Document Info */}
          <div className="text-right">
            <div className="mb-1">
              <span className="font-bold text-gray-700" style={{ color: '#1565C0' }}>{getDocumentTitle(invoice?.documentType)} #</span>
              <span className="ml-2 text-gray-800">{invoice?.number || invoice?.invoiceNumber || 'S/N'}</span>
            </div>
            <div className="mb-1">
              <span className="font-bold text-gray-700" style={{ color: '#1565C0' }}>FECHA DE LA {getDocumentTitle(invoice?.documentType).split(' ')[0]}</span>
              <span className="ml-2 text-gray-800">{invoice?.date || ''}</span>
            </div>
            <div>
              <span className="font-bold text-gray-700" style={{ color: '#1565C0' }}>N° DE PEDIDO</span>
              <span className="ml-2 text-gray-800">{invoice?.number || ''}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#E3F2FD' }} className="border-t-2 border-b-2" style={{ borderColor: '#4FC3F7', backgroundColor: '#E3F2FD' }}>
                <th className="text-left py-3 px-3 font-bold text-gray-700" style={{ width: '10%' }}>CANT.</th>
                <th className="text-left py-3 px-3 font-bold text-gray-700" style={{ width: '50%' }}>DESCRIPCIÓN</th>
                <th className="text-right py-3 px-3 font-bold text-gray-700" style={{ width: '20%' }}>PRECIO UNITARIO</th>
                <th className="text-right py-3 px-3 font-bold text-gray-700" style={{ width: '20%' }}>IMPORTE</th>
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
              {/* Empty rows to fill space */}
              {items.length < 5 && [...Array(5 - items.length)].map((_, index) => (
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
          <div className="w-64">
            <div className="flex justify-between py-2 border-b border-gray-300">
              <span className="text-gray-700">Subtotal</span>
              <span className="text-gray-900">{formatCurrency(invoice?.subtotal)}</span>
            </div>
            {invoice?.hasTax && invoice?.taxRate > 0 && (
              <div className="flex justify-between py-2 border-b border-gray-300">
                <span className="text-gray-700">{invoice?.taxName || 'IVA'} {invoice?.taxRate}%</span>
                <span className="text-gray-900">{formatCurrency(invoice?.tax)}</span>
              </div>
            )}
            <div className="flex justify-between py-3">
              <span className="font-bold text-gray-900">TOTAL</span>
              <span className="font-bold text-lg" style={{ color: '#1565C0' }}>{formatCurrency(invoice?.total)} $</span>
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

        {/* Terms & Conditions */}
        {invoice?.terms && (
          <div className="mt-8">
            <h4 className="font-bold text-sm mb-2" style={{ color: '#1565C0' }}>CONDICIONES Y FORMA DE PAGO</h4>
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

export default InvoiceTemplateDexter;
