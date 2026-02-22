import React from 'react';

const InvoiceTemplateCuentaCobro = ({ invoice, companyInfo, template }) => {
  // Función para convertir número a letras en español
  const numeroALetras = (num) => {
    const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
    
    if (num === 0) return 'CERO';
    if (num === 100) return 'CIEN';
    
    let resultado = '';
    
    if (num >= 1000000) {
      const millones = Math.floor(num / 1000000);
      if (millones === 1) {
        resultado += 'UN MILLÓN ';
      } else {
        resultado += convertirCentenas(millones) + ' MILLONES ';
      }
      num %= 1000000;
    }
    
    if (num >= 1000) {
      const miles = Math.floor(num / 1000);
      if (miles === 1) {
        resultado += 'MIL ';
      } else {
        resultado += convertirCentenas(miles) + ' MIL ';
      }
      num %= 1000;
    }
    
    resultado += convertirCentenas(num);
    
    function convertirCentenas(n) {
      let res = '';
      if (n >= 100) {
        if (n === 100) return 'CIEN';
        res += centenas[Math.floor(n / 100)] + ' ';
        n %= 100;
      }
      if (n >= 10 && n < 20) {
        res += especiales[n - 10];
        return res.trim();
      }
      if (n >= 20) {
        res += decenas[Math.floor(n / 10)];
        if (n % 10 !== 0) {
          res += ' Y ' + unidades[n % 10];
        }
      } else if (n > 0) {
        res += unidades[n];
      }
      return res.trim();
    }
    
    return resultado.trim() + ' PESOS COLOMBIANOS';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('es-CO', options);
  };

  return (
    <div className="bg-white w-full max-w-[800px] mx-auto shadow-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header with green bar */}
      <div className="bg-lime-500 text-white px-6 py-3 flex justify-between items-center">
        <div>
          <span className="text-sm opacity-80">DOCUMENTO EQUIVALENTE</span>
          <h1 className="text-2xl font-bold tracking-wide">CUENTA DE COBRO</h1>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold">N° {invoice.number || '---'}</span>
        </div>
      </div>

      <div className="p-6">
        {/* Date and City */}
        <div className="text-right text-gray-600 mb-6">
          <p>{companyInfo?.city || 'Ciudad'}, {formatDate(invoice.date)}</p>
        </div>

        {/* Two columns: Company Info and Client Info */}
        <div className="flex justify-between mb-6">
          {/* Company Info (Left) */}
          <div className="w-1/2">
            {companyInfo?.logo && (
              <img src={companyInfo.logo} alt="Logo" className="h-16 mb-3 object-contain" />
            )}
            <h2 className="font-bold text-lg text-gray-800">{companyInfo?.name || 'NOMBRE EMPRESA'}</h2>
            <p className="text-sm text-gray-600">NIT: {companyInfo?.nit || '---'}</p>
            <p className="text-sm text-gray-600">Tel: {companyInfo?.phone || '---'}</p>
            <p className="text-sm text-gray-600">{companyInfo?.address || '---'}</p>
            <p className="text-sm text-gray-600">{companyInfo?.city || '---'}</p>
          </div>

          {/* Client Info (Right) */}
          <div className="w-1/2 text-right">
            <div className="bg-lime-50 border-l-4 border-lime-500 p-4 inline-block text-left">
              <p className="text-sm text-lime-700 font-semibold mb-1">PAGO TOTAL</p>
              <p className="text-xs text-gray-500 mb-1">DEBE A:</p>
              <p className="font-bold text-gray-800">{invoice.to?.name || '_______________'}</p>
              <p className="text-sm text-gray-600">C.C./NIT: {invoice.to?.nit || '_______________'}</p>
            </div>
          </div>
        </div>

        {/* Amount in words */}
        <div className="bg-gray-50 p-4 rounded mb-6">
          <p className="text-sm text-gray-500 mb-1">LA SUMA DE:</p>
          <p className="font-bold text-gray-800 text-lg">
            {numeroALetras(Math.round(invoice.total || 0))} (${formatCurrency(invoice.total || 0)})
          </p>
        </div>

        {/* Concept Table */}
        <div className="mb-6">
          <div className="bg-lime-500 text-white px-4 py-2 font-semibold">
            POR CONCEPTO DE:
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700 w-16">CANT.</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700">DESCRIPCIÓN</th>
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-700 w-28">IMPORTE</th>
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-700 w-28">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items && invoice.items.length > 0 && invoice.items.map((item, index) => {
                // Only render rows that have data
                if (!item.description && !item.quantity && !item.rate) return null;
                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm">{item.quantity}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{item.description}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-sm">${formatCurrency(item.rate)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-sm">${formatCurrency(item.amount)}</td>
                  </tr>
                );
              })}
              {/* Empty rows to fill minimum 3 rows */}
              {Array.from({ length: Math.max(0, 3 - (invoice.items?.filter(i => i.description || i.quantity || i.rate).length || 0)) }).map((_, index) => (
                <tr key={`empty-${index}`} className="bg-white">
                  <td className="border border-gray-300 px-3 py-2 text-sm">&nbsp;</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">&nbsp;</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">&nbsp;</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mt-2">
            <div className="w-64">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-sm text-gray-600">SUBTOTAL:</span>
                <span className="text-sm font-medium">${formatCurrency(invoice.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-sm text-gray-600">IVA ({invoice.taxRate || 0}%):</span>
                <span className="text-sm font-medium">${formatCurrency(invoice.tax || 0)}</span>
              </div>
              <div className="flex justify-between py-2 bg-lime-500 text-white px-2 mt-1">
                <span className="font-bold">TOTAL:</span>
                <span className="font-bold">${formatCurrency(invoice.total || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        {invoice.notes && (
          <div className="mb-6 border-l-4 border-lime-500 pl-4 py-2 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700 mb-1">NOTA:</p>
            <p className="text-sm text-gray-600">{invoice.notes}</p>
          </div>
        )}

        {/* Bank Details */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-2">DATOS PARA PAGO:</p>
          <div className="flex gap-8 text-sm text-gray-600">
            <div>
              <p><span className="font-medium">Titular:</span> {companyInfo?.name || '---'}</p>
              <p><span className="font-medium">NIT:</span> {companyInfo?.nit || '---'}</p>
            </div>
            <div>
              <p><span className="font-medium">Banco:</span> {companyInfo?.bank || 'BANCOLOMBIA'}</p>
              <p><span className="font-medium">Cuenta:</span> {companyInfo?.bankAccount || '---'}</p>
            </div>
          </div>
        </div>

        {/* Signature Line */}
        <div className="mt-12 flex justify-between">
          <div className="w-64 text-center">
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm text-gray-600">{companyInfo?.name || 'NOMBRE EMPRESA'}</p>
              <p className="text-xs text-gray-500">NIT: {companyInfo?.nit || '---'}</p>
            </div>
          </div>
          <div className="w-64 text-center">
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm text-gray-600">{invoice.to?.name || 'CLIENTE'}</p>
              <p className="text-xs text-gray-500">C.C./NIT: {invoice.to?.nit || '---'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplateCuentaCobro;
