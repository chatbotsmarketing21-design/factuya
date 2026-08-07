import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency as formatCurrencyFn, formatDate as formatDateFn } from '../utils/formatters';

const InvoiceTemplateEjecutiva = ({ invoice, template, templateColor }) => {
  const { t } = useTranslation();

  const from = invoice?.from || invoice?.fromAddress || {};
  const to = invoice?.to || invoice?.toAddress || {};
  const items = invoice?.items || [];
  const isPaid = invoice?.status === 'paid' && !['quotation', 'proforma'].includes(invoice?.documentType);
  const userCountry = from?.country;

  const primaryColor = templateColor || template?.color || '#B45309';
  const darkColor = '#111827';

  const formatCurrency = (value) => formatCurrencyFn(value, { country: userCountry });
  const formatDate = (value) => formatDateFn(value, { country: userCountry });

  const getDocumentTitle = (type) => {
    const titles = {
      invoice: 'Factura',
      tax_invoice: 'Factura de Impuestos',
      proforma: 'Factura Proforma',
      quotation: 'Cotización',
      bill: 'Cuenta de Cobro',
      receipt: 'Recibo',
      sales_receipt: 'Recibo de la Venta',
      cash_receipt: 'Recibo de Efectivo',
      offer: 'Oferta',
      credit_note: 'Nota de Abono',
      order: 'Pedido',
      delivery_note: 'Nota de Entrega'
    };
    return titles[type] || 'Factura';
  };

  const serif = { fontFamily: 'Georgia, "Times New Roman", serif' };

  return (
    <div className="bg-white shadow-lg relative overflow-hidden" style={{ minHeight: '800px' }}>
      {/* Sello de PAGADO */}
      {isPaid && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 20 }}>
          <div
            className="border-8 border-red-500 text-red-500 font-bold text-6xl px-8 py-4 rounded-lg opacity-40"
            style={{ transform: 'rotate(-25deg)', textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}
          >
            PAGADO
          </div>
        </div>
      )}

      {/* Header oscuro elegante */}
      <div className="px-10 py-7 flex justify-between items-center" style={{ backgroundColor: darkColor }}>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide" style={serif}>
            {from.name || 'Tu Empresa'}
          </h1>
          <div className="mt-1.5 space-y-0.5">
            {from.nit && <p className="text-gray-400 text-xs tracking-wide">NIT: {from.nit}</p>}
            {from.phone && <p className="text-gray-400 text-xs tracking-wide">Tel: {from.phone}</p>}
            {from.email && <p className="text-gray-400 text-xs tracking-wide">{from.email}</p>}
            {from.address && <p className="text-gray-400 text-xs tracking-wide">{from.address}</p>}
            {(from.city || from.state) && (
              <p className="text-gray-400 text-xs tracking-wide">
                {from.city}{from.city && from.state ? ', ' : ''}{from.state}
              </p>
            )}
          </div>
        </div>
        {invoice?.logo ? (
          <div className="bg-white rounded-lg p-2 shadow">
            <img src={invoice.logo} alt="Logo" className="h-14 w-14 object-contain" />
          </div>
        ) : (
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
            style={{ backgroundColor: primaryColor, ...serif }}
          >
            {(from.name || 'E').charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Línea de acento */}
      <div className="h-1" style={{ backgroundColor: primaryColor }}></div>

      <div className="px-10 py-8">
        {/* Título del documento + meta */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 mb-1">Documento</p>
            <h2 className="text-4xl font-bold" style={{ color: primaryColor, ...serif }}>
              {getDocumentTitle(invoice?.documentType)}
            </h2>
            <p className="text-gray-500 text-sm mt-1 tracking-widest">N° {invoice?.number || 'S/N'}</p>
          </div>
          <div className="text-right text-sm space-y-1">
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Fecha&nbsp;&nbsp;</span>
              <span className="text-gray-800 font-medium">{invoice?.date ? formatDate(invoice.date) : ''}</span>
            </div>
            {invoice?.dueDate && (
              <div>
                <span className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Vence&nbsp;&nbsp;</span>
                <span className="text-gray-800 font-medium">{formatDate(invoice.dueDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cliente */}
        <div
          className="mb-8 px-5 py-4 bg-gray-50 rounded-r-lg"
          style={{ borderLeft: `4px solid ${primaryColor}` }}
        >
          <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 mb-1.5">Facturar a</p>
          <div className="text-gray-900 font-medium whitespace-pre-line text-sm leading-relaxed">
            {to.name || ''}
          </div>
        </div>

        {/* Tabla de ítems */}
        <table className="w-full text-sm table-fixed mb-2">
          <thead>
            <tr style={{ borderBottom: `2px solid ${darkColor}` }}>
              <th className="text-center pb-2.5 text-[11px] uppercase tracking-[0.2em] text-gray-500 font-semibold" style={{ width: '8%' }}>N°</th>
              <th className="text-left pb-2.5 px-2 text-[11px] uppercase tracking-[0.2em] text-gray-500 font-semibold" style={{ width: '44%' }}>Descripción</th>
              <th className="text-center pb-2.5 text-[11px] uppercase tracking-[0.2em] text-gray-500 font-semibold" style={{ width: '10%' }}>Cant.</th>
              <th className="text-right pb-2.5 px-2 text-[11px] uppercase tracking-[0.2em] text-gray-500 font-semibold" style={{ width: '19%' }}>Precio</th>
              <th className="text-right pb-2.5 px-2 text-[11px] uppercase tracking-[0.2em] text-gray-500 font-semibold" style={{ width: '19%' }}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b border-gray-100">
                <td className="py-3.5 text-center text-gray-400" style={serif}>{String(index + 1).padStart(2, '0')}</td>
                <td className="py-3.5 px-2 text-gray-900" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item?.description || ''}</td>
                <td className="py-3.5 text-center text-gray-700">{item?.quantity || 0}</td>
                <td className="py-3.5 px-2 text-right text-gray-700">{formatCurrency(item?.rate)}</td>
                <td className="py-3.5 px-2 text-right text-gray-900 font-medium">{formatCurrency(item?.amount)}</td>
              </tr>
            ))}
            {items.length < 4 && [...Array(4 - items.length)].map((_, index) => (
              <tr key={`empty-${index}`} className="border-b border-gray-100">
                <td className="py-3.5">&nbsp;</td>
                <td className="py-3.5 px-2"></td>
                <td className="py-3.5"></td>
                <td className="py-3.5 px-2"></td>
                <td className="py-3.5 px-2"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="flex justify-end mt-6 mb-8">
          <div className="w-64">
            <div className="flex justify-between py-2 text-sm">
              <span className="text-gray-500 uppercase tracking-wider text-xs pt-0.5">Subtotal</span>
              <span className="text-gray-800">{formatCurrency(invoice?.subtotal)}</span>
            </div>
            {invoice?.hasTax && invoice?.taxRate > 0 && (
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-500 uppercase tracking-wider text-xs pt-0.5">{invoice?.taxName || 'IVA'} {invoice?.taxRate}%</span>
                <span className="text-gray-800">{formatCurrency(invoice?.tax)}</span>
              </div>
            )}
            <div
              className="flex justify-between items-center px-4 py-3 mt-2 rounded"
              style={{ backgroundColor: darkColor }}
            >
              <span className="text-white uppercase tracking-[0.2em] text-xs font-semibold">Total</span>
              <span className="font-bold text-xl" style={{ color: '#fff', ...serif }}>
                {formatCurrency(invoice?.total)}
              </span>
            </div>
            {Number(invoice?.totalPaid) > 0 && !isPaid && (
              <>
                <div className="flex justify-between py-2 mt-1 text-sm text-gray-500">
                  <span>{t('preview.amountPaid')}</span>
                  <span>{formatCurrency(invoice.totalPaid)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="font-bold text-gray-900">{t('preview.balanceDue')}</span>
                  <span className="font-bold" style={{ color: primaryColor }}>
                    {formatCurrency((Number(invoice?.total) || 0) - (Number(invoice.totalPaid) || 0))}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Condiciones y notas */}
        {(invoice?.terms || invoice?.notes) && (
          <div className="pt-4" style={{ borderTop: `1px solid ${primaryColor}` }}>
            {invoice?.terms && (
              <div className="mb-3">
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 mb-1">Condiciones y forma de pago</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.terms}</p>
              </div>
            )}
            {invoice?.notes && (
              <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
            )}
          </div>
        )}
      </div>

      {/* Pie elegante */}
      <div className="absolute bottom-0 left-0 right-0">
        <div
          className="text-center py-2 text-[11px] uppercase tracking-[0.35em] text-white"
          style={{ backgroundColor: darkColor }}
        >
          Gracias por su confianza
        </div>
        <div className="h-1" style={{ backgroundColor: primaryColor }}></div>
      </div>
    </div>
  );
};

export default InvoiceTemplateEjecutiva;
