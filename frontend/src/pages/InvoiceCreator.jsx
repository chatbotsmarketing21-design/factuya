import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { getTemplateById } from '../mock/invoiceData';
import { invoiceAPI, profileAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card } from '../components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { ArrowLeft, Plus, Trash2, Download, Send, Save, FileText, FileCheck, Calculator, Receipt, DollarSign } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';
import InvoicePreview from '../components/InvoicePreview';
import SubscriptionDialog from '../components/SubscriptionDialog';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const InvoiceCreator = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const templateId = parseInt(searchParams.get('template')) || 1;
  const invoiceId = searchParams.get('id'); // ID de factura para editar
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [template, setTemplate] = useState(getTemplateById(templateId));
  const invoicePreviewRef = useRef(null);
  const [invoice, setInvoice] = useState({
    number: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
    documentType: 'invoice', // invoice, proforma, quotation, bill, receipt
    logo: '', // Para guardar el logo en base64
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
    taxRate: 0,
    taxName: '',
    tax: 0,
    total: 0,
    hasTax: false,
    notes: 'Thank you for your business!',
    terms: 'Payment due within 30 days',
    template: templateId
  });

  useEffect(() => {
    if (invoiceId) {
      // Modo edición - cargar factura existente
      loadInvoice(invoiceId);
    } else {
      // Modo creación - cargar info de empresa y generar número
      loadCompanyInfo();
      generateInvoiceNumber();
    }
  }, [invoiceId]);

  const loadInvoice = async (id) => {
    try {
      setLoading(true);
      const response = await invoiceAPI.getById(id);
      const invoiceData = response.data;
      
      setInvoice({
        ...invoiceData,
        from: invoiceData.fromAddress || invoiceData.from,
        to: invoiceData.toAddress || invoiceData.to
      });
      
      setIsEditMode(true);
      
      toast({
        title: "Factura Cargada",
        description: "Ahora puedes editar la factura",
      });
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la factura",
        variant: "destructive"
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

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

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Por favor selecciona un archivo de imagen válido",
          variant: "destructive"
        });
        return;
      }

      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "El logo no debe superar los 2MB",
          variant: "destructive"
        });
        return;
      }

      // Convertir a base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoice(prev => ({ ...prev, logo: reader.result }));
        toast({
          title: "¡Logo cargado!",
          description: "El logo se ha agregado a tu factura",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setInvoice(prev => ({ ...prev, logo: '' }));
    toast({
      title: "Logo eliminado",
      description: "El logo ha sido removido de la factura",
    });
  };

  const getDocumentInfo = (type) => {
    const documentTypes = {
      invoice: {
        name: 'FACTURA',
        icon: <FileText className="w-4 h-4" />,
        color: '#2563eb'
      },
      proforma: {
        name: 'FACTURA PROFORMA',
        icon: <FileCheck className="w-4 h-4" />,
        color: '#7c3aed'
      },
      quotation: {
        name: 'COTIZACIÓN',
        icon: <Calculator className="w-4 h-4" />,
        color: '#059669'
      },
      bill: {
        name: 'CUENTA DE COBRO',
        icon: <DollarSign className="w-4 h-4" />,
        color: '#ea580c'
      },
      receipt: {
        name: 'RECIBO',
        icon: <Receipt className="w-4 h-4" />,
        color: '#0891b2'
      }
    };
    return documentTypes[type] || documentTypes.invoice;
  };

  const changeDocumentType = (type) => {
    setInvoice(prev => ({ ...prev, documentType: type }));
    const docInfo = getDocumentInfo(type);
    toast({
      title: "Tipo de Documento Cambiado",
      description: `Ahora estás creando: ${docInfo.name}`,
    });
  };

  const handleSave = async () => {
    if (!invoice.to.name || invoice.items.length === 0 || !invoice.items[0].description) {
      toast({
        title: "Error de Validación",
        description: "Por favor completa el nombre del cliente y al menos un item.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      if (isEditMode && invoiceId) {
        // Actualizar factura existente
        await invoiceAPI.update(invoiceId, invoice);
        toast({
          title: "¡Factura Actualizada!",
          description: "Los cambios han sido guardados exitosamente.",
        });
      } else {
        // Crear nueva factura
        await invoiceAPI.create(invoice);
        toast({
          title: "¡Factura Guardada!",
          description: "Tu factura ha sido creada exitosamente.",
        });
      }
      
      navigate('/dashboard');
    } catch (error) {
      // Si el error es 403 (límite alcanzado), mostrar diálogo de suscripción
      if (error.response?.status === 403) {
        setShowSubscriptionDialog(true);
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.detail || "No se pudo guardar la factura",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      if (!invoicePreviewRef.current) {
        toast({
          title: "Error",
          description: "No se pudo generar el PDF",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Generando PDF...",
        description: "Por favor espera un momento",
      });

      // Capturar el preview como imagen
      const canvas = await html2canvas(invoicePreviewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Factura_${invoice.number}_${invoice.to.name}.pdf`);

      toast({
        title: "¡Descarga Completa!",
        description: "Tu factura PDF ha sido descargada",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF. Intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  const handleSend = () => {
    if (!invoice.to.email) {
      toast({
        title: "Email Requerido",
        description: "Por favor ingresa el email del cliente para enviar la factura",
        variant: "destructive"
      });
      return;
    }

    // Simular envío de email
    toast({
      title: "¡Factura Enviada!",
      description: `La factura ha sido enviada a ${invoice.to.email}`,
    });
    
    // En una implementación real, aquí llamarías a una API para enviar el email
    // Por ejemplo: await invoiceAPI.sendEmail(invoice.id, invoice.to.email);
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
                  Volver al Dashboard
                </Button>
              </Link>
              <div className="flex items-center">
                <span className="text-xl font-bold text-gray-900">Factu</span>
                <span className="text-xl font-bold text-white bg-lime-500 px-2 ml-1">Ya!</span>
              </div>
              
              {/* Selector de Tipo de Documento */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    style={{ borderColor: getDocumentInfo(invoice.documentType).color, color: getDocumentInfo(invoice.documentType).color }}
                  >
                    {getDocumentInfo(invoice.documentType).icon}
                    {getDocumentInfo(invoice.documentType).name}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Tipo de Documento</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => changeDocumentType('invoice')}>
                    <FileText className="w-4 h-4 mr-2 text-blue-600" />
                    FACTURA
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeDocumentType('proforma')}>
                    <FileCheck className="w-4 h-4 mr-2 text-purple-600" />
                    FACTURA PROFORMA
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeDocumentType('quotation')}>
                    <Calculator className="w-4 h-4 mr-2 text-green-600" />
                    COTIZACIÓN
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeDocumentType('bill')}>
                    <DollarSign className="w-4 h-4 mr-2 text-orange-600" />
                    CUENTA DE COBRO
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeDocumentType('receipt')}>
                    <Receipt className="w-4 h-4 mr-2 text-cyan-600" />
                    RECIBO
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/templates">
                <Button variant="outline" size="sm">
                  Cambiar Plantilla
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleSend}>
                <Send className="w-4 h-4 mr-2" />
                Enviar Email
              </Button>
              <Button size="sm" className="bg-lime-500 hover:bg-lime-600 text-white" onClick={handleSave} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Guardando...' : isEditMode ? 'Actualizar Factura' : 'Guardar Factura'}
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Detalles de la Factura</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="number">Número de Factura</Label>
                  <Input
                    id="number"
                    value={invoice.number}
                    onChange={(e) => updateInvoice('number', e.target.value)}
                    placeholder="001"
                  />
                </div>
                <div>
                  <Label htmlFor="date">Fecha de Factura</Label>
                  <Input
                    id="date"
                    type="date"
                    value={invoice.date}
                    onChange={(e) => updateInvoice('date', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">De (Tu Empresa)</h2>
              <div className="space-y-4">
                {/* Logo Upload Section */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <Label className="text-base font-semibold mb-3 block">Logo de la Empresa</Label>
                  {invoice.logo ? (
                    <div className="flex items-center gap-4">
                      <img 
                        src={invoice.logo} 
                        alt="Logo" 
                        className="h-20 w-20 object-contain border border-gray-200 rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-2">Logo cargado exitosamente</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={removeLogo}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar Logo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">
                        Sube el logo de tu empresa (JPG, PNG - máx 2MB)
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-lg file:border-0
                          file:text-sm file:font-semibold
                          file:bg-lime-50 file:text-lime-700
                          hover:file:bg-lime-100
                          cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="fromName">Nombre de la Empresa</Label>
                  <Input
                    id="fromName"
                    value={invoice.from.name}
                    onChange={(e) => updateFrom('name', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fromEmail">Correo Electrónico</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      value={invoice.from.email}
                      onChange={(e) => updateFrom('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromPhone">Teléfono</Label>
                    <Input
                      id="fromPhone"
                      value={invoice.from.phone}
                      onChange={(e) => updateFrom('phone', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="fromAddress">Dirección</Label>
                  <Input
                    id="fromAddress"
                    value={invoice.from.address}
                    onChange={(e) => updateFrom('address', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="fromCity">Ciudad</Label>
                    <Input
                      id="fromCity"
                      value={invoice.from.city}
                      onChange={(e) => updateFrom('city', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromState">Estado/Provincia</Label>
                    <Input
                      id="fromState"
                      value={invoice.from.state}
                      onChange={(e) => updateFrom('state', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromZip">Código Postal</Label>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Para (Cliente)</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="toName">Nombre del Cliente *</Label>
                  <Input
                    id="toName"
                    value={invoice.to.name}
                    onChange={(e) => updateTo('name', e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="toEmail">Correo Electrónico</Label>
                    <Input
                      id="toEmail"
                      type="email"
                      value={invoice.to.email}
                      onChange={(e) => updateTo('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="toPhone">Teléfono</Label>
                    <Input
                      id="toPhone"
                      value={invoice.to.phone}
                      onChange={(e) => updateTo('phone', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="toAddress">Dirección</Label>
                  <Input
                    id="toAddress"
                    value={invoice.to.address}
                    onChange={(e) => updateTo('address', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="toCity">Ciudad</Label>
                    <Input
                      id="toCity"
                      value={invoice.to.city}
                      onChange={(e) => updateTo('city', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="toState">Estado/Provincia</Label>
                    <Input
                      id="toState"
                      value={invoice.to.state}
                      onChange={(e) => updateTo('state', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="toZip">Código Postal</Label>
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
                <h2 className="text-2xl font-bold text-gray-900">Items / Servicios</h2>
                <Button onClick={addItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Item
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
                        <Label>Descripción *</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Service or product description"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label>Cantidad</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            min="0"
                          />
                        </div>
                        <div>
                          <Label>Precio ($)</Label>
                          <Input
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateItem(index, 'rate', e.target.value)}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <Label>Monto ($)</Label>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Información Adicional</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={invoice.notes}
                    onChange={(e) => updateInvoice('notes', e.target.value)}
                    placeholder="Thank you for your business!"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="terms">Términos y Condiciones</Label>
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
            <div ref={invoicePreviewRef}>
              <InvoicePreview invoice={invoice} template={template} />
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Dialog */}
      <SubscriptionDialog 
        open={showSubscriptionDialog} 
        onOpenChange={setShowSubscriptionDialog}
        onSuccess={() => {
          setShowSubscriptionDialog(false);
        }}
      />
    </div>
  );
};

export default InvoiceCreator;
