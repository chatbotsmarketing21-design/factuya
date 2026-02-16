import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from './ui/card';
import InvoiceTemplateWave from './InvoiceTemplateWave';
import InvoiceTemplateDexter from './InvoiceTemplateDexter';

const InvoicePreview = ({ invoice, template }) => {
  const { t } = useTranslation();

  // Si la plantilla es de tipo "wave", usar el componente especializado
  if (template?.type === 'wave') {
    return <InvoiceTemplateWave invoice={invoice} template={template} />;
  }

  // Si la plantilla es de tipo "dexter", usar el componente Dexter
  if (template?.type === 'dexter') {
    return <InvoiceTemplateDexter invoice={invoice} template={template} />;
  }

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
    return t(`documentTypes.${type}`, type?.toUpperCase() || 'FACTURA');
  };

  // Usar el color de la plantilla seleccionada
  const templateColor = template?.color || '#2563eb';

  return (
    <Card className="p-8 bg-white shadow-lg relative overflow-hidden">
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
      
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b pb-6" style={{ borderColor: templateColor }}>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold" style={{ color: templateColor }}>
                {getDocumentTitle(invoice?.documentType || 'invoice')}
              </h1>
              <p className="text-gray-600 mt-2">#{invoice?.number || invoice?.invoiceNumber || 'S/N'}</p>
            </div>
            <div className="text-right">
              {invoice?.logo ? (
                <img 
                  src={invoice.logo} 
                  alt="Company Logo" 
                  className="h-24 w-24 object-contain"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                  LOGO
                </div>
              )}
            </div>
          </div>
        </div>

        {/* From & To */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">{t('preview.from')}</h3>
            <div className="text-sm">
              <p className="font-bold text-gray-900">{from.name || ''}</p>
              {from.nit && <p className="text-gray-600">NIT: {from.nit}</p>}
              <p className="text-gray-600">{from.email || ''}</p>
              <p className="text-gray-600">{from.phone || ''}</p>
              <p className="text-gray-600">{from.address || ''}</p>
              <p className="text-gray-600">
                {from.city || ''}{from.city && from.state ? ', ' : ''}{from.state || ''} {from.zip || ''}
              </p>
              <p className="text-gray-600">{from.country || ''}</p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">{t('preview.billTo')}</h3>
            <div className="text-sm">
              <p className="font-bold text-gray-900">{to.name || ''}</p>
              {to.nit && <p className="text-gray-600">NIT/CC: {to.nit}</p>}
              <p className="text-gray-600">{to.email || ''}</p>
              <p className="text-gray-600">{to.phone || ''}</p>
              <p className="text-gray-600">{to.address || ''}</p>
              <p className="text-gray-600">
                {to.city || ''}{to.city && to.state ? ', ' : ''}{to.state || ''} {to.zip || ''}
              </p>
              <p className="text-gray-600">{to.country || ''}</p>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="text-gray-500">{t('preview.invoiceDate')}</p>
            <p className="font-semibold text-gray-900">{invoice?.date || ''}</p>
          </div>
          <div>
            <p className="text-gray-500">{t('preview.dueDate')}</p>
            <p className="font-semibold text-gray-900">{invoice?.dueDate || ''}</p>
          </div>
        </div>

        {/* Items Table */}
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2" style={{ borderColor: templateColor }}>
                <th className="text-left py-2 font-semibold text-gray-700">{t('preview.description')}</th>
                <th className="text-center py-2 font-semibold text-gray-700">{t('preview.qty')}</th>
                <th className="text-right py-2 font-semibold text-gray-700">{t('preview.rate')}</th>
                <th className="text-right py-2 font-semibold text-gray-700">{t('preview.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-3 text-gray-900">{item?.description || ''}</td>
                  <td className="py-3 text-center text-gray-700">{item?.quantity || 0}</td>
                  <td className="py-3 text-right text-gray-700">${formatCurrency(item?.rate)}</td>
                  <td className="py-3 text-right font-semibold text-gray-900">${formatCurrency(item?.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('preview.subtotal')}:</span>
              <span className="font-semibold text-gray-900">${formatCurrency(invoice?.subtotal)}</span>
            </div>
            {invoice?.hasTax && invoice?.taxRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{invoice?.taxName || t('invoice.tax')} ({invoice?.taxRate}%):</span>
                <span className="font-semibold text-gray-900">${formatCurrency(invoice?.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t-2" style={{ borderColor: templateColor }}>
              <span>{t('preview.total')}:</span>
              <span style={{ color: templateColor }}>${formatCurrency(invoice?.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice?.notes && (
          <div className="pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('preview.notes')}</h4>
            <p className="text-sm text-gray-600">{invoice.notes}</p>
          </div>
        )}

        {/* Terms */}
        {invoice?.terms && (
          <div className="pt-2">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('preview.terms')}</h4>
            <p className="text-sm text-gray-600">{invoice.terms}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default InvoicePreview;
