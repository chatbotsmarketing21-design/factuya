import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { getTemplateById } from '../mock/invoiceData';
import { invoiceAPI, profileAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card } from '../components/ui/card';
import { ArrowLeft, Plus, Trash2, Download, Send, Save } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';
import InvoicePreview from '../components/InvoicePreview';

const InvoiceCreator = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const templateId = parseInt(searchParams.get('template')) || 1;
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState(getTemplateById(templateId));
  const [invoice, setInvoice] = useState({
    number: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
    from: {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    },
    to: {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    },
    items: [
      {
        description: '',
        quantity: 1,
        rate: 0,
        amount: 0
      }
    ],
    subtotal: 0,
    taxRate: 10,
    tax: 0,
    total: 0,
    notes: 'Thank you for your business!',
    terms: 'Payment due within 30 days',
    template: templateId
  });

  useEffect(() => {
    loadCompanyInfo();
    generateInvoiceNumber();
  }, []);

  useEffect(() => {
    setInvoice(prev => ({ ...prev, template: templateId }));
    setTemplate(getTemplateById(templateId));
  }, [templateId]);

  const loadCompanyInfo = async () => {
    try {
      const response = await profileAPI.getCompany();
      const companyInfo = response.data;
      setInvoice(prev => ({
        ...prev,
        from: {
          name: companyInfo.name || '',
          email: companyInfo.email || '',
          phone: companyInfo.phone || '',
          address: companyInfo.address || '',
          city: companyInfo.city || '',
          state: companyInfo.state || '',
          zip: companyInfo.zip || '',
          country: companyInfo.country || ''
        }
      }));
    } catch (error) {
      console.error('Failed to load company info:', error);
    }
  };

  const generateInvoiceNumber = async () => {
    try {
      const response = await invoiceAPI.getAll();
      const invoiceCount = response.data.length;
      const newNumber = String(invoiceCount + 1).padStart(3, '0');
      setInvoice(prev => ({ ...prev, number: newNumber }));
    } catch (error) {
      setInvoice(prev => ({ ...prev, number: '001' }));
    }
  };

  const updateInvoice = (field, value) => {
    setInvoice(prev => ({ ...prev, [field]: value }));
  };

  const updateFrom = (field, value) => {
    setInvoice(prev => ({
      ...prev,
      from: { ...prev.from, [field]: value }
    }));
  };

  const updateTo = (field, value) => {
    setInvoice(prev => ({
      ...prev,
      to: { ...prev.to, [field]: value }
    }));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...invoice.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'rate') {
      const quantity = parseFloat(newItems[index].quantity) || 0;
      const rate = parseFloat(newItems[index].rate) || 0;
      newItems[index].amount = quantity * rate;
    }
    
    setInvoice(prev => ({ ...prev, items: newItems }));
    recalculateTotal(newItems, invoice.taxRate);
  };

  const addItem = () => {
    const newItem = {
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    setInvoice(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const removeItem = (index) => {
    const newItems = invoice.items.filter((_, i) => i !== index);
    setInvoice(prev => ({ ...prev, items: newItems }));
    recalculateTotal(newItems, invoice.taxRate);
  };

  const recalculateTotal = (items, taxRate) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = (subtotal * taxRate) / 100;
    const total = subtotal + tax;
    
    setInvoice(prev => ({
      ...prev,
      subtotal: subtotal,
      tax: tax,
      total: total
    }));
  };

  const updateTaxRate = (rate) => {
    const newRate = parseFloat(rate) || 0;
    updateInvoice('taxRate', newRate);
    recalculateTotal(invoice.items, newRate);
  };

  const handleSave = async () => {
    if (!invoice.to.name || invoice.items.length === 0 || !invoice.items[0].description) {
      toast({
        title: "Validation Error",
        description: "Please fill in client name and at least one item.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      await invoiceAPI.create(invoice);
      toast({
        title: "Invoice Saved",
        description: "Your invoice has been saved successfully.",
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to save invoice",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    toast({
      title: "Download Started",
      description: "Your invoice PDF is being generated.",
    });
  };

  const handleSend = () => {
    toast({
      title: "Invoice Sent",
      description: "Your invoice has been sent via email.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center">
                <span className="text-xl font-bold text-gray-900">invoice </span>
                <span className="text-xl font-bold text-yellow-400 bg-yellow-400 text-gray-900 px-2 ml-1">home</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/templates">
                <Button variant="outline" size="sm">
                  Change Template
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Invoice'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor Panel */}
          <div className="space-y-6">
            {/* Invoice Details */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Invoice Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="number">Invoice Number</Label>
                  <Input
                    id="number"
                    value={invoice.number}
                    onChange={(e) => updateInvoice('number', e.target.value)}
                    placeholder="001"
                  />
                </div>
                <div>
                  <Label htmlFor="date">Invoice Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={invoice.date}
                    onChange={(e) => updateInvoice('date', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={invoice.dueDate}
                    onChange={(e) => updateInvoice('dueDate', e.target.value)}
                  />
                </div>
              </div>
            </Card>

            {/* From Section */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">From (Your Company)</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fromName">Company Name</Label>
                  <Input
                    id="fromName"
                    value={invoice.from.name}
                    onChange={(e) => updateFrom('name', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fromEmail">Email</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      value={invoice.from.email}
                      onChange={(e) => updateFrom('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromPhone">Phone</Label>
                    <Input
                      id="fromPhone"
                      value={invoice.from.phone}
                      onChange={(e) => updateFrom('phone', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="fromAddress">Address</Label>
                  <Input
                    id="fromAddress"
                    value={invoice.from.address}
                    onChange={(e) => updateFrom('address', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="fromCity">City</Label>
                    <Input
                      id="fromCity"
                      value={invoice.from.city}
                      onChange={(e) => updateFrom('city', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromState">State</Label>
                    <Input
                      id="fromState"
                      value={invoice.from.state}
                      onChange={(e) => updateFrom('state', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromZip">ZIP</Label>
                    <Input
                      id="fromZip"
                      value={invoice.from.zip}
                      onChange={(e) => updateFrom('zip', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* To Section */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Bill To (Client)</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="toName">Client Name *</Label>
                  <Input
                    id="toName"
                    value={invoice.to.name}
                    onChange={(e) => updateTo('name', e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="toEmail">Email</Label>
                    <Input
                      id="toEmail"
                      type="email"
                      value={invoice.to.email}
                      onChange={(e) => updateTo('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="toPhone">Phone</Label>
                    <Input
                      id="toPhone"
                      value={invoice.to.phone}
                      onChange={(e) => updateTo('phone', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="toAddress">Address</Label>
                  <Input
                    id="toAddress"
                    value={invoice.to.address}
                    onChange={(e) => updateTo('address', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="toCity">City</Label>
                    <Input
                      id="toCity"
                      value={invoice.to.city}
                      onChange={(e) => updateTo('city', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="toState">State</Label>
                    <Input
                      id="toState"
                      value={invoice.to.state}
                      onChange={(e) => updateTo('state', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="toZip">ZIP</Label>
                    <Input
                      id="toZip"
                      value={invoice.to.zip}
                      onChange={(e) => updateTo('zip', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Items Section */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Items / Services</h2>
                <Button onClick={addItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-4">
                {invoice.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-sm font-medium text-gray-500">Item {index + 1}</span>
                      {invoice.items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label>Description *</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Service or product description"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            min="0"
                          />
                        </div>
                        <div>
                          <Label>Rate ($)</Label>
                          <Input
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateItem(index, 'rate', e.target.value)}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <Label>Amount ($)</Label>
                          <Input
                            value={item.amount.toFixed(2)}
                            disabled
                            className="bg-gray-50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-6 space-y-3 border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-semibold text-lg">${invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700">Tax:</span>
                    <Input
                      type="number"
                      value={invoice.taxRate}
                      onChange={(e) => updateTaxRate(e.target.value)}
                      className="w-20 h-8 text-sm"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="text-gray-700">%</span>
                  </div>
                  <span className="font-semibold text-lg">${invoice.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xl font-bold border-t pt-3">
                  <span>Total:</span>
                  <span className="text-blue-600">${invoice.total.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {/* Notes and Terms */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Additional Information</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={invoice.notes}
                    onChange={(e) => updateInvoice('notes', e.target.value)}
                    placeholder="Thank you for your business!"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="terms">Terms & Conditions</Label>
                  <Textarea
                    id="terms"
                    value={invoice.terms}
                    onChange={(e) => updateInvoice('terms', e.target.value)}
                    placeholder="Payment terms and conditions"
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="lg:sticky lg:top-24 h-fit">
            <InvoicePreview invoice={invoice} template={template} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCreator;
