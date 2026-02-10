import React from 'react';
import { Card } from './ui/card';

const InvoicePreview = ({ invoice, template }) => {
  return (
    <Card className="p-8 bg-white shadow-lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b pb-6" style={{ borderColor: template.color }}>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold" style={{ color: template.color }}>INVOICE</h1>
              <p className="text-gray-600 mt-2">#{invoice.number}</p>
            </div>
            <div className="text-right">
              {invoice.logo ? (
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
            <h3 className="text-sm font-semibold text-gray-500 mb-2">FROM</h3>
            <div className="text-sm">
              <p className="font-bold text-gray-900">{invoice.from.name}</p>
              <p className="text-gray-600">{invoice.from.email}</p>
              <p className="text-gray-600">{invoice.from.phone}</p>
              <p className="text-gray-600">{invoice.from.address}</p>
              <p className="text-gray-600">
                {invoice.from.city}, {invoice.from.state} {invoice.from.zip}
              </p>
              <p className="text-gray-600">{invoice.from.country}</p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">BILL TO</h3>
            <div className="text-sm">
              <p className="font-bold text-gray-900">{invoice.to.name}</p>
              <p className="text-gray-600">{invoice.to.email}</p>
              <p className="text-gray-600">{invoice.to.phone}</p>
              <p className="text-gray-600">{invoice.to.address}</p>
              <p className="text-gray-600">
                {invoice.to.city}, {invoice.to.state} {invoice.to.zip}
              </p>
              <p className="text-gray-600">{invoice.to.country}</p>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="text-gray-500">Invoice Date</p>
            <p className="font-semibold text-gray-900">{invoice.date}</p>
          </div>
          <div>
            <p className="text-gray-500">Due Date</p>
            <p className="font-semibold text-gray-900">{invoice.dueDate}</p>
          </div>
        </div>

        {/* Items Table */}
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2" style={{ borderColor: template.color }}>
                <th className="text-left py-2 font-semibold text-gray-700">Description</th>
                <th className="text-center py-2 font-semibold text-gray-700">Qty</th>
                <th className="text-right py-2 font-semibold text-gray-700">Rate</th>
                <th className="text-right py-2 font-semibold text-gray-700">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-3 text-gray-900">{item.description}</td>
                  <td className="py-3 text-center text-gray-700">{item.quantity}</td>
                  <td className="py-3 text-right text-gray-700">${(parseFloat(item.rate) || 0).toFixed(2)}</td>
                  <td className="py-3 text-right font-semibold text-gray-900">${(parseFloat(item.amount) || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold text-gray-900">${(parseFloat(invoice.subtotal) || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax ({invoice.taxRate}%):</span>
              <span className="font-semibold text-gray-900">${(parseFloat(invoice.tax) || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t-2" style={{ borderColor: template.color }}>
              <span>Total:</span>
              <span style={{ color: template.color }}>${(parseFloat(invoice.total) || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
            <p className="text-sm text-gray-600">{invoice.notes}</p>
          </div>
        )}

        {/* Terms */}
        {invoice.terms && (
          <div className="pt-2">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Terms & Conditions</h4>
            <p className="text-sm text-gray-600">{invoice.terms}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default InvoicePreview;