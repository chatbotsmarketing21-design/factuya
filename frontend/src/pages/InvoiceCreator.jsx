import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { ArrowLeft, Plus, Trash2, Download, Send, Save, FileText, FileCheck, Calculator, Receipt, DollarSign, Percent } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';
import InvoicePreview from '../components/InvoicePreview';
import SubscriptionDialog from '../components/SubscriptionDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
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
  const [showTaxDialog, setShowTaxDialog] = useState(false);
  const [tempTaxName, setTempTaxName] = useState('IVA');
  const [tempTaxRate, setTempTaxRate] = useState(19);
  const [isCompoundTax, setIsCompoundTax] = useState(false);
  const [template, setTemplate] = useState(getTemplateById(templateId));
  const invoicePreviewRef = useRef(null);
  const [invoice, setInvoice] = useState({
    number: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'pending',
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
        quantity: 0,
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
      generateInvoiceNumber(invoice.documentType);
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
      
      // Cargar plantilla guardada (solo si no viene de URL)
      if (companyInfo.defaultTemplate && !searchParams.get('template')) {
        setTemplate(getTemplateById(companyInfo.defaultTemplate));
        setInvoice(prev => ({ ...prev, template: companyInfo.defaultTemplate }));
      }
      
      setInvoice(prev => ({
        ...prev,
        logo: companyInfo.logo || '',  // Cargar logo guardado
        notes: companyInfo.defaultNotes || prev.notes,  // Cargar notas guardadas
        terms: companyInfo.defaultTerms || prev.terms,  // Cargar términos guardados
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

  // Auto-save notes, terms and template with debounce
  const saveTimeoutRef = useRef(null);
  
  const autoSaveDefaults = useCallback(async (notes, terms, template) => {
    try {
      await profileAPI.updateInvoiceDefaults({ notes, terms, template });
    } catch (error) {
      console.error('Error auto-saving defaults:', error);
    }
  }, []);

  const handleNotesChange = (value) => {
    updateInvoice('notes', value);
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout to save after 1 second of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      autoSaveDefaults(value, invoice.terms);
    }, 1000);
  };

  const handleTermsChange = (value) => {
    updateInvoice('terms', value);
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout to save after 1 second of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      autoSaveDefaults(invoice.notes, value);
    }, 1000);
  };

  const generateInvoiceNumber = async (docType = 'invoice') => {
    try {
      const response = await invoiceAPI.getNextNumber(docType);
      setInvoice(prev => ({ ...prev, number: response.data.number }));
    } catch (error) {
      console.error('Error generating invoice number:', error);
      // Fallback al formato anterior
      const prefixes = {
        invoice: 'FAC',
        proforma: 'PRO',
        quotation: 'COT',
        receipt: 'REC',
        bill: 'COB'
      };
      const prefix = prefixes[docType] || 'FAC';
      setInvoice(prev => ({ ...prev, number: `${prefix}-001` }));
    }
  };

  const handleDocumentTypeChange = async (newType) => {
    updateInvoice('documentType', newType);
    // Generar nuevo número para el tipo de documento seleccionado
    if (!isEditMode) {
      await generateInvoiceNumber(newType);
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
      quantity: 0,
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

  const recalculateTotal = (items, taxRate, hasTax = invoice.hasTax) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = hasTax ? (subtotal * taxRate) / 100 : 0;
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

  const handleAddTax = () => {
    setShowTaxDialog(true);
  };

  const handleSaveTax = () => {
    const newRate = parseFloat(tempTaxRate) || 0;
    setInvoice(prev => ({
      ...prev,
      taxRate: newRate,
      taxName: tempTaxName,
      hasTax: true
    }));
    recalculateTotal(invoice.items, newRate, true);
    setShowTaxDialog(false);
    toast({
      title: "Impuesto Añadido",
      description: `${tempTaxName} (${newRate}%) ha sido agregado a la factura`,
    });
  };

  const handleRemoveTax = () => {
    setInvoice(prev => ({
      ...prev,
      taxRate: 0,
      taxName: '',
      hasTax: false,
      tax: 0,
      total: prev.subtotal
    }));
    toast({
      title: "Impuesto Eliminado",
      description: "El impuesto ha sido removido de la factura",
    });
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
      reader.onloadend = async () => {
        const logoBase64 = reader.result;
        setInvoice(prev => ({ ...prev, logo: logoBase64 }));
        
        // Guardar logo en el perfil para futuras facturas
        try {
          await profileAPI.updateLogo(logoBase64);
          toast({
            title: "¡Logo guardado!",
            description: "El logo se ha guardado y aparecerá en tus próximas facturas",
          });
        } catch (error) {
          console.error('Error saving logo:', error);
          toast({
            title: "¡Logo cargado!",
            description: "El logo se ha agregado a esta factura",
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = async () => {
    setInvoice(prev => ({ ...prev, logo: '' }));
    
    // Eliminar logo del perfil
    try {
      await profileAPI.deleteLogo();
      toast({
        title: "Logo eliminado",
        description: "El logo ha sido removido de tu perfil",
      });
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast({
        title: "Logo eliminado",
        description: "El logo ha sido removido de la factura",
      });
    }
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

  const changeDocumentType = async (type) => {
    await handleDocumentTypeChange(type);
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

      // Capturar el preview como imagen con alta calidad
      const canvas = await html2canvas(invoicePreviewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      
      // Calculate dimensions
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // If fits in one page
      if (imgHeight <= pageHeight) {
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        // Multiple pages - slice the canvas
        const totalPages = Math.ceil(imgHeight / pageHeight);
        const sourceWidth = canvas.width;
        const sourcePageHeight = (canvas.width * pageHeight) / pageWidth;
        
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) {
            pdf.addPage();
          }
          
          // Create a temporary canvas for this page section
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = sourceWidth;
          pageCanvas.height = sourcePageHeight;
          
          const ctx = pageCanvas.getContext('2d');
          
          // Draw the portion of the original canvas for this page
          const sourceY = page * sourcePageHeight;
          const drawHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
          
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0, sourceY,                    // Source x, y
            sourceWidth, drawHeight,       // Source width, height
            0, 0,                          // Destination x, y
            sourceWidth, drawHeight        // Destination width, height
          );
          
          const pageImgData = pageCanvas.toDataURL('image/png');
          pdf.addImage(pageImgData, 'PNG', 0, 0, pageWidth, pageHeight);
        }
      }
      
      pdf.save(`${invoice.number}_${invoice.to.name}.pdf`);

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
    <div className="min-h-screen bg-gray-100 dark:bg-background">
      {/* Header */}
      <header className="bg-white dark:bg-card border-b border-gray-200 dark:border-border sticky top-0 z-10">
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
                <span className="text-xl font-bold text-gray-900 dark:text-white">Factu</span>
                <span className="text-xl font-bold text-white bg-lime-500 px-2 ml-1">Ya!</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
                <DropdownMenuContent align="end">
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
              <Link to="/templates">
                <Button variant="outline" size="sm">
                  Cambiar Plantilla
                </Button>
              </Link>
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
            <Card className="p-6 dark:bg-card">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Detalles de la Factura</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="number" className="dark:text-gray-300">Número de Factura</Label>
                  <Input
                    id="number"
                    value={invoice.number}
                    onChange={(e) => updateInvoice('number', e.target.value)}
                    placeholder="001"
                    className="dark:bg-secondary dark:border-border dark:text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="date" className="dark:text-gray-300">Fecha de Factura</Label>
                  <Input
                    id="date"
                    type="date"
                    value={invoice.date}
                    onChange={(e) => updateInvoice('date', e.target.value)}
                    className="dark:bg-secondary dark:border-border dark:text-white"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="dueDate" className="dark:text-gray-300">Fecha de Vencimiento</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={invoice.dueDate}
                    onChange={(e) => updateInvoice('dueDate', e.target.value)}
                    className="dark:bg-secondary dark:border-border dark:text-white"
                  />
                </div>
              </div>
            </Card>

            {/* From Section */}
            <Card className="p-6 dark:bg-card">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">De (Tu Empresa)</h2>
              <div className="space-y-4">
                {/* Logo Upload Section */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <Label className="text-base font-semibold mb-3 block dark:text-white">Logo de la Empresa</Label>
                  {invoice.logo ? (
                    <div className="flex items-center gap-4">
                      <img 
                        src={invoice.logo} 
                        alt="Logo" 
                        className="h-20 w-20 object-contain border border-gray-200 dark:border-gray-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Logo cargado exitosamente</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={removeLogo}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar Logo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Sube el logo de tu empresa (JPG, PNG - máx 2MB)
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="block w-full text-sm text-gray-500 dark:text-gray-400
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-lg file:border-0
                          file:text-sm file:font-semibold
                          file:bg-lime-50 file:text-lime-700
                          dark:file:bg-lime-900/30 dark:file:text-lime-400
                          hover:file:bg-lime-100 dark:hover:file:bg-lime-900/50
                          cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="fromName" className="dark:text-gray-300">Nombre de la Empresa</Label>
                  <Input
                    id="fromName"
                    value={invoice.from.name}
                    onChange={(e) => updateFrom('name', e.target.value)}
                    className="dark:bg-secondary dark:border-border dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fromEmail" className="dark:text-gray-300">Correo Electrónico</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      value={invoice.from.email}
                      onChange={(e) => updateFrom('email', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromPhone" className="dark:text-gray-300">Teléfono</Label>
                    <Input
                      id="fromPhone"
                      value={invoice.from.phone}
                      onChange={(e) => updateFrom('phone', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="fromAddress" className="dark:text-gray-300">Dirección</Label>
                  <Input
                    id="fromAddress"
                    value={invoice.from.address}
                    onChange={(e) => updateFrom('address', e.target.value)}
                    className="dark:bg-secondary dark:border-border dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="fromCity" className="dark:text-gray-300">Ciudad</Label>
                    <Input
                      id="fromCity"
                      value={invoice.from.city}
                      onChange={(e) => updateFrom('city', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromState" className="dark:text-gray-300">Estado/Provincia</Label>
                    <Input
                      id="fromState"
                      value={invoice.from.state}
                      onChange={(e) => updateFrom('state', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromZip" className="dark:text-gray-300">Código Postal</Label>
                    <Input
                      id="fromZip"
                      value={invoice.from.zip}
                      onChange={(e) => updateFrom('zip', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* To Section */}
            <Card className="p-6 dark:bg-card">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Para (Cliente)</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="toName" className="dark:text-gray-300">Nombre del Cliente *</Label>
                  <Input
                    id="toName"
                    value={invoice.to.name}
                    onChange={(e) => updateTo('name', e.target.value)}
                    required
                    className="dark:bg-secondary dark:border-border dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="toEmail" className="dark:text-gray-300">Correo Electrónico</Label>
                    <Input
                      id="toEmail"
                      type="email"
                      value={invoice.to.email}
                      onChange={(e) => updateTo('email', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="toPhone" className="dark:text-gray-300">Teléfono</Label>
                    <Input
                      id="toPhone"
                      value={invoice.to.phone}
                      onChange={(e) => updateTo('phone', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="toAddress" className="dark:text-gray-300">Dirección</Label>
                  <Input
                    id="toAddress"
                    value={invoice.to.address}
                    onChange={(e) => updateTo('address', e.target.value)}
                    className="dark:bg-secondary dark:border-border dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="toCity" className="dark:text-gray-300">Ciudad</Label>
                    <Input
                      id="toCity"
                      value={invoice.to.city}
                      onChange={(e) => updateTo('city', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="toState" className="dark:text-gray-300">Estado/Provincia</Label>
                    <Input
                      id="toState"
                      value={invoice.to.state}
                      onChange={(e) => updateTo('state', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="toZip" className="dark:text-gray-300">Código Postal</Label>
                    <Input
                      id="toZip"
                      value={invoice.to.zip}
                      onChange={(e) => updateTo('zip', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Items Section */}
            <Card className="p-6 dark:bg-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Items / Servicios</h2>
                <Button onClick={addItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Item
                </Button>
              </div>
              <div className="space-y-4">
                {invoice.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 dark:border-border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Item {index + 1}</span>
                      {invoice.items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="dark:text-gray-300">Descripción *</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Service or product description"
                          required
                          className="dark:bg-secondary dark:border-border dark:text-white"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="dark:text-gray-300">Cantidad</Label>
                          <Input
                            type="text"
                            value={item.quantity ? Number(item.quantity).toLocaleString('es-CO') : ''}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/\./g, '').replace(/,/g, '.');
                              const numValue = parseFloat(rawValue) || 0;
                              updateItem(index, 'quantity', numValue);
                            }}
                            className="dark:bg-secondary dark:border-border dark:text-white"
                          />
                        </div>
                        <div>
                          <Label className="dark:text-gray-300">Precio ($)</Label>
                          <Input
                            type="text"
                            value={item.rate ? Number(item.rate).toLocaleString('es-CO') : ''}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/\./g, '').replace(/,/g, '.');
                              const numValue = parseFloat(rawValue) || 0;
                              updateItem(index, 'rate', numValue);
                            }}
                            className="dark:bg-secondary dark:border-border dark:text-white"
                          />
                        </div>
                        <div>
                          <Label className="dark:text-gray-300">Monto ($)</Label>
                          <Input
                            value={item.amount.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            disabled
                            className="bg-gray-50 dark:bg-muted dark:text-gray-300"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-6 space-y-3 border-t dark:border-border pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Subtotal:</span>
                  <span className="font-semibold text-lg dark:text-white">${invoice.subtotal.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                
                {/* Tax Section */}
                {invoice.hasTax ? (
                  <div className="flex justify-between items-center bg-gray-50 dark:bg-muted p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 dark:text-gray-300">{invoice.taxName || 'Impuesto'} ({invoice.taxRate}%):</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveTax}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-6 px-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <span className="font-semibold text-lg dark:text-white">${invoice.tax.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddTax}
                      className="text-lime-600 border-lime-300 hover:bg-lime-50 dark:hover:bg-lime-900/20"
                    >
                      <Percent className="w-4 h-4 mr-2" />
                      Añadir Impuesto
                    </Button>
                  </div>
                )}

                <div className="flex justify-between items-center text-xl font-bold border-t dark:border-border pt-3">
                  <span className="dark:text-white">Total:</span>
                  <span className="text-lime-700 dark:text-lime-400">${invoice.total.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </Card>

            {/* Notes and Terms */}
            <Card className="p-6 dark:bg-card">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Información Adicional</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Los cambios se guardan automáticamente</p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="notes" className="dark:text-gray-300">Notas</Label>
                  <Textarea
                    id="notes"
                    value={invoice.notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="¡Gracias por su preferencia!"
                    rows={3}
                    className="dark:bg-secondary dark:border-border dark:text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="terms" className="dark:text-gray-300">Términos y Condiciones</Label>
                  <Textarea
                    id="terms"
                    value={invoice.terms}
                    onChange={(e) => handleTermsChange(e.target.value)}
                    placeholder="Pago a 30 días"
                    rows={3}
                    className="dark:bg-secondary dark:border-border dark:text-white"
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

      {/* Tax Dialog */}
      <Dialog open={showTaxDialog} onOpenChange={setShowTaxDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Añadir Impuesto</DialogTitle>
            <DialogDescription>
              Añadir impuesto nuevo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taxName">Nombre del impuesto</Label>
                <Input
                  id="taxName"
                  value={tempTaxName}
                  onChange={(e) => setTempTaxName(e.target.value)}
                  placeholder="IVA"
                />
              </div>
              <div>
                <Label htmlFor="taxRate">Porcentaje (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  value={tempTaxRate}
                  onChange={(e) => setTempTaxRate(e.target.value)}
                  placeholder="19"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="compoundTax"
                checked={isCompoundTax}
                onCheckedChange={setIsCompoundTax}
              />
              <Label htmlFor="compoundTax" className="text-sm text-gray-600">
                ¿Impuesto compuesto?
              </Label>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button onClick={handleSaveTax} className="bg-lime-500 hover:bg-lime-600 text-white">
              Guardar impuesto
            </Button>
            <Button variant="ghost" onClick={() => setShowTaxDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceCreator;
