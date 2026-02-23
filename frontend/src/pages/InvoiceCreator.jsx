import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { getTemplateById, mockTemplates } from '../mock/invoiceData';
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
import { ArrowLeft, Plus, Trash2, Download, Send, Save, FileText, FileCheck, Calculator, Receipt, DollarSign, Percent, ChevronDown, ChevronUp, Eye, X, Menu, Upload, RotateCw } from 'lucide-react';
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
  const location = useLocation();
  const templateId = parseInt(searchParams.get('template')) || 1;
  const colorFromUrl = searchParams.get('color');
  const invoiceId = searchParams.get('id'); // ID de factura para editar
  const copyData = location.state?.copyFrom; // Datos copiados de otra factura
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
  const [templateColor, setTemplateColor] = useState(colorFromUrl || '#84cc16'); // Color de la plantilla
  const [userDefaultTemplate, setUserDefaultTemplate] = useState(null); // Plantilla guardada del usuario
  const invoicePreviewRef = useRef(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Estados para secciones colapsables - cargar desde localStorage
  const [sectionsOpen, setSectionsOpen] = useState(() => {
    const saved = localStorage.getItem('invoiceSectionsState');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { details: true, from: true, to: true, items: true, notes: true };
      }
    }
    return { details: true, from: true, to: true, items: true, notes: true };
  });
  
  const toggleSection = (section) => {
    setSectionsOpen(prev => {
      const newState = { ...prev, [section]: !prev[section] };
      // Guardar en localStorage
      localStorage.setItem('invoiceSectionsState', JSON.stringify(newState));
      return newState;
    });
  };

  // Calcular fecha de vencimiento (un mes exacto después)
  const getOneMonthLater = () => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().split('T')[0];
  };

  const [invoice, setInvoice] = useState({
    number: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: getOneMonthLater(),
    status: 'pending',
    documentType: 'invoice', // invoice, proforma, quotation, bill, receipt
    logo: '', // Para guardar el logo en base64
    from: {
      name: '',
      nit: '',
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
      nit: '',
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
    template: templateId,
    signature: '',
    signatureRotation: 0
  });

  useEffect(() => {
    if (invoiceId) {
      // Modo edición - cargar factura existente
      loadInvoice(invoiceId);
    } else if (copyData) {
      // Modo copia - cargar datos del cliente desde otra factura
      loadCompanyInfo();
      generateInvoiceNumber(invoice.documentType);
      
      // Calcular totales de los items copiados
      const copiedItems = copyData.items || [];
      const subtotal = copiedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      const taxRate = copyData.taxRate || 0;
      const hasTax = copyData.hasTax || false;
      const tax = hasTax ? (subtotal * taxRate) / 100 : 0;
      const total = subtotal + tax;
      
      // Aplicar los datos copiados
      setTimeout(() => {
        setInvoice(prev => ({
          ...prev,
          to: {
            name: copyData.to?.name || '',
            nit: copyData.to?.nit || '',
            email: copyData.to?.email || '',
            phone: copyData.to?.phone || '',
            address: copyData.to?.address || '',
            city: copyData.to?.city || '',
            state: copyData.to?.state || '',
            zip: copyData.to?.zip || ''
          },
          items: copiedItems,
          notes: copyData.notes || prev.notes,
          terms: copyData.terms || prev.terms,
          hasTax: hasTax,
          taxRate: taxRate,
          subtotal: subtotal,
          tax: tax,
          total: total
        }));
        
        // Si hay plantilla en los datos copiados, aplicarla
        if (copyData.template) {
          setTemplate(getTemplateById(copyData.template));
        }
      }, 500);
    } else {
      // Modo creación - cargar info de empresa y generar número
      loadCompanyInfo();
      generateInvoiceNumber(invoice.documentType);
    }
  }, [invoiceId, copyData]);

  const loadInvoice = async (id) => {
    try {
      setLoading(true);
      const response = await invoiceAPI.getById(id);
      const invoiceData = response.data;
      
      // Obtener info actual de la empresa para fusionar el NIT
      let companyNit = '';
      let companyLogo = '';
      try {
        const companyResponse = await profileAPI.getCompany();
        companyNit = companyResponse.data.nit || '';
        companyLogo = companyResponse.data.logo || '';
      } catch (err) {
        console.error('Error loading company info for NIT:', err);
      }
      
      const fromData = invoiceData.fromAddress || invoiceData.from || {};
      const toData = invoiceData.toAddress || invoiceData.to || {};
      
      setInvoice({
        ...invoiceData,
        logo: invoiceData.logo || companyLogo,
        from: {
          ...fromData,
          // Fusionar el NIT del perfil si la factura antigua no lo tiene
          nit: fromData.nit || companyNit
        },
        to: {
          name: toData.name || '',
          nit: toData.nit || '',
          email: toData.email || '',
          phone: toData.phone || '',
          address: toData.address || '',
          city: toData.city || '',
          state: toData.state || '',
          zip: toData.zip || ''
        }
      });
      
      // Cargar la plantilla guardada en la factura
      if (invoiceData.template) {
        setTemplate(getTemplateById(invoiceData.template));
      }
      
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
        const savedTemplate = getTemplateById(companyInfo.defaultTemplate);
        setTemplate(savedTemplate);
        setUserDefaultTemplate(savedTemplate); // Guardar como plantilla por defecto del usuario
        setInvoice(prev => ({ ...prev, template: companyInfo.defaultTemplate }));
      } else {
        // Si viene de URL o no hay plantilla guardada, usar la actual como default
        setUserDefaultTemplate(getTemplateById(templateId));
      }
      
      // Cargar color guardado (solo si no viene de URL)
      if (companyInfo.defaultColor && !colorFromUrl) {
        setTemplateColor(companyInfo.defaultColor);
      }
      
      setInvoice(prev => ({
        ...prev,
        logo: companyInfo.logo || '',  // Cargar logo guardado
        notes: companyInfo.defaultNotes || prev.notes,  // Cargar notas guardadas
        terms: companyInfo.defaultTerms || prev.terms,  // Cargar términos guardados
        signature: companyInfo.signature || '',  // Cargar firma guardada
        signatureRotation: companyInfo.signatureRotation || 0,  // Cargar rotación de firma
        from: {
          name: companyInfo.name || '',
          nit: companyInfo.nit || '',
          email: companyInfo.email || '',
          phone: companyInfo.phone || '',
          address: companyInfo.address || '',
          city: companyInfo.city || '',
          state: companyInfo.state || '',
          zip: companyInfo.zip || '',
          country: companyInfo.country || '',
          bank: companyInfo.bank || '',
          bankAccount: companyInfo.bankAccount || ''
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
    
    // Si es Cuenta de Cobro (bill), aplicar automáticamente la plantilla especial
    if (newType === 'bill') {
      const cuentaCobroTemplate = mockTemplates.find(t => t.type === 'cuenta_cobro');
      if (cuentaCobroTemplate) {
        setTemplate(cuentaCobroTemplate);
      }
    } else {
      // Si NO es Cuenta de Cobro, restaurar la plantilla del usuario
      // Solo cambiar si la plantilla actual es cuenta_cobro
      if (template?.type === 'cuenta_cobro') {
        // Usar la plantilla guardada del usuario, o la por defecto
        const restoreTemplate = userDefaultTemplate || getTemplateById(templateId) || getTemplateById(1);
        setTemplate(restoreTemplate);
      }
    }
    
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
      {/* Header - Responsive */}
      <header className="bg-white dark:bg-card border-b border-gray-200 dark:border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Logo and back button */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/dashboard" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al Dashboard
                </Button>
              </Link>
              <Link to="/dashboard" className="sm:hidden">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center">
                <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Factu</span>
                <span className="text-lg sm:text-xl font-bold text-white bg-lime-500 px-1.5 sm:px-2 ml-1">Ya!</span>
              </div>
            </div>
            
            {/* Right side - Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Desktop actions */}
              <div className="hidden md:flex items-center gap-3">
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
                    {t('invoice.changeTemplate')}
                  </Button>
                </Link>
              </div>
              
              {/* Save button - Always visible */}
              <Button 
                size="sm" 
                className="bg-lime-500 hover:bg-lime-600 text-white text-xs sm:text-sm px-2 sm:px-4" 
                onClick={handleSave} 
                disabled={loading}
              >
                <Save className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{loading ? t('invoice.saving') : isEditMode ? t('invoice.updateInvoice') : t('invoice.saveInvoice')}</span>
              </Button>
              
              {/* Mobile menu button */}
              <DropdownMenu open={showMobileMenu} onOpenChange={setShowMobileMenu}>
                <DropdownMenuTrigger asChild className="md:hidden">
                  <Button variant="outline" size="icon">
                    <Menu className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Tipo de Documento</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { changeDocumentType('invoice'); setShowMobileMenu(false); }}>
                    <FileText className="w-4 h-4 mr-2 text-blue-600" />
                    FACTURA
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { changeDocumentType('proforma'); setShowMobileMenu(false); }}>
                    <FileCheck className="w-4 h-4 mr-2 text-purple-600" />
                    FACTURA PROFORMA
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { changeDocumentType('quotation'); setShowMobileMenu(false); }}>
                    <Calculator className="w-4 h-4 mr-2 text-green-600" />
                    COTIZACIÓN
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { changeDocumentType('bill'); setShowMobileMenu(false); }}>
                    <DollarSign className="w-4 h-4 mr-2 text-orange-600" />
                    CUENTA DE COBRO
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { changeDocumentType('receipt'); setShowMobileMenu(false); }}>
                    <Receipt className="w-4 h-4 mr-2 text-cyan-600" />
                    RECIBO
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/templates" className="w-full">
                      {t('invoice.changeTemplate')}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          {/* Editor Panel */}
          <div className="space-y-4 sm:space-y-6">
            {/* Invoice Details */}
            <Card className="p-4 sm:p-6 dark:bg-card">
              <div className="flex justify-between items-center mb-4 sm:mb-6 cursor-pointer" onClick={() => toggleSection('details')}>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('invoice.details')}</h2>
                <Button variant="ghost" size="sm">
                  {sectionsOpen.details ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </Button>
              </div>
              {sectionsOpen.details && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="number" className="dark:text-gray-300 text-sm">{t('invoice.invoiceNumber')}</Label>
                    <Input
                      id="number"
                      value={invoice.number}
                      onChange={(e) => updateInvoice('number', e.target.value)}
                      placeholder="001"
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date" className="dark:text-gray-300 text-sm">{t('invoice.invoiceDate')}</Label>
                    <Input
                      id="date"
                      type="date"
                      value={invoice.date}
                      onChange={(e) => updateInvoice('date', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="dueDate" className="dark:text-gray-300 text-sm">{t('invoice.dueDate')}</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={invoice.dueDate}
                      onChange={(e) => updateInvoice('dueDate', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* From Section */}
            <Card className="p-4 sm:p-6 dark:bg-card">
              <div className="flex justify-between items-center mb-4 sm:mb-6 cursor-pointer" onClick={() => toggleSection('from')}>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('invoice.from')}</h2>
                <Button variant="ghost" size="sm">
                  {sectionsOpen.from ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </Button>
              </div>
              {sectionsOpen.from && (
              <div className="space-y-4">
                {/* Logo Upload Section */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 sm:p-4">
                  <Label className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 block dark:text-white">{t('invoice.logo')}</Label>
                  {invoice.logo ? (
                    <div className="flex items-center gap-3 sm:gap-4">
                      <img 
                        src={invoice.logo} 
                        alt="Logo" 
                        className="h-16 w-16 sm:h-20 sm:w-20 object-contain border border-gray-200 dark:border-gray-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">Logo cargado</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={removeLogo}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs sm:text-sm"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
                        Sube el logo de tu empresa (JPG, PNG - máx 2MB)
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="block w-full text-xs sm:text-sm text-gray-500 dark:text-gray-400
                          file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4
                          file:rounded-lg file:border-0
                          file:text-xs sm:file:text-sm file:font-semibold
                          file:bg-lime-50 file:text-lime-700
                          dark:file:bg-lime-900/30 dark:file:text-lime-400
                          hover:file:bg-lime-100 dark:hover:file:bg-lime-900/50
                          cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="fromName" className="dark:text-gray-300 text-sm">{t('invoice.companyName')}</Label>
                    <Input
                      id="fromName"
                      value={invoice.from.name}
                      onChange={(e) => updateFrom('name', e.target.value.toUpperCase())}
                      className="dark:bg-secondary dark:border-border dark:text-white uppercase"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromNit" className="dark:text-gray-300 text-sm">{t('invoice.nit')}</Label>
                    <Input
                      id="fromNit"
                      value={invoice.from.nit}
                      onChange={(e) => updateFrom('nit', e.target.value)}
                      placeholder="900.123.456-7"
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="fromEmail" className="dark:text-gray-300 text-sm">{t('invoice.email')}</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      value={invoice.from.email}
                      onChange={(e) => updateFrom('email', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromPhone" className="dark:text-gray-300 text-sm">{t('invoice.phone')}</Label>
                    <Input
                      id="fromPhone"
                      value={invoice.from.phone}
                      onChange={(e) => updateFrom('phone', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="fromAddress" className="dark:text-gray-300 text-sm">{t('invoice.address')}</Label>
                  <Input
                    id="fromAddress"
                    value={invoice.from.address}
                    onChange={(e) => updateFrom('address', e.target.value)}
                    className="dark:bg-secondary dark:border-border dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="fromCity" className="dark:text-gray-300 text-sm">{t('invoice.city')}</Label>
                    <Input
                      id="fromCity"
                      value={invoice.from.city}
                      onChange={(e) => updateFrom('city', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromState" className="dark:text-gray-300 text-sm">{t('invoice.state')}</Label>
                    <Input
                      id="fromState"
                      value={invoice.from.state}
                      onChange={(e) => updateFrom('state', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fromZip" className="dark:text-gray-300 text-sm">C. Postal</Label>
                    <Input
                      id="fromZip"
                      value={invoice.from.zip}
                      onChange={(e) => updateFrom('zip', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                </div>
              </div>
              )}
            </Card>

            {/* To Section */}
            <Card className="p-4 sm:p-6 dark:bg-card">
              <div className="flex justify-between items-center mb-4 sm:mb-6 cursor-pointer" onClick={() => toggleSection('to')}>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Para (Cliente)</h2>
                <Button variant="ghost" size="sm">
                  {sectionsOpen.to ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </Button>
              </div>
              {sectionsOpen.to && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="toName" className="dark:text-gray-300 text-sm">Nombre del Cliente *</Label>
                    <Input
                      id="toName"
                      value={invoice.to.name}
                      onChange={(e) => updateTo('name', e.target.value.toUpperCase())}
                      required
                      className="dark:bg-secondary dark:border-border dark:text-white uppercase"
                    />
                  </div>
                  <div>
                    <Label htmlFor="toNit" className="dark:text-gray-300 text-sm">NIT / Cédula</Label>
                    <Input
                      id="toNit"
                      value={invoice.to.nit}
                      onChange={(e) => updateTo('nit', e.target.value)}
                      placeholder="123.456.789"
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="toEmail" className="dark:text-gray-300 text-sm">Correo Electrónico</Label>
                    <Input
                      id="toEmail"
                      type="email"
                      value={invoice.to.email}
                      onChange={(e) => updateTo('email', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="toPhone" className="dark:text-gray-300 text-sm">Teléfono</Label>
                    <Input
                      id="toPhone"
                      value={invoice.to.phone}
                      onChange={(e) => updateTo('phone', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="toAddress" className="dark:text-gray-300 text-sm">Dirección</Label>
                  <Input
                    id="toAddress"
                    value={invoice.to.address}
                    onChange={(e) => updateTo('address', e.target.value)}
                    className="dark:bg-secondary dark:border-border dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="toCity" className="dark:text-gray-300 text-sm">Ciudad</Label>
                    <Input
                      id="toCity"
                      value={invoice.to.city}
                      onChange={(e) => updateTo('city', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="toState" className="dark:text-gray-300 text-sm">Dpto/Prov</Label>
                    <Input
                      id="toState"
                      value={invoice.to.state}
                      onChange={(e) => updateTo('state', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="toZip" className="dark:text-gray-300 text-sm">C. Postal</Label>
                    <Input
                      id="toZip"
                      value={invoice.to.zip}
                      onChange={(e) => updateTo('zip', e.target.value)}
                      className="dark:bg-secondary dark:border-border dark:text-white"
                    />
                  </div>
                </div>
              </div>
              )}
            </Card>

            {/* Items Section */}
            <Card className="p-4 sm:p-6 dark:bg-card">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Items / Servicios</h2>
                <Button onClick={addItem} size="sm" className="text-xs sm:text-sm">
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Agregar Item</span>
                </Button>
              </div>
              <div className="space-y-4">
                {invoice.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 dark:border-border rounded-lg p-3 sm:p-4">
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                      <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Item {index + 1}</span>
                      {invoice.items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-7 w-7 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="dark:text-gray-300 text-sm">Descripción *</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Descripción del servicio o producto"
                          required
                          className="dark:bg-secondary dark:border-border dark:text-white text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <div>
                          <Label className="dark:text-gray-300 text-xs sm:text-sm">Cant.</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={item.quantityText !== undefined ? item.quantityText : (item.quantity || '')}
                            onChange={(e) => {
                              let inputValue = e.target.value.replace(',', '.');
                              if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
                                const newItems = [...invoice.items];
                                newItems[index] = { 
                                  ...newItems[index], 
                                  quantityText: inputValue,
                                  quantity: parseFloat(inputValue) || 0
                                };
                                const quantity = parseFloat(inputValue) || 0;
                                const rate = parseFloat(newItems[index].rate) || 0;
                                newItems[index].amount = quantity * rate;
                                setInvoice(prev => ({ ...prev, items: newItems }));
                                recalculateTotal(newItems, invoice.taxRate);
                              }
                            }}
                            onBlur={() => {
                              const newItems = [...invoice.items];
                              delete newItems[index].quantityText;
                              setInvoice(prev => ({ ...prev, items: newItems }));
                            }}
                            placeholder=""
                            className="dark:bg-secondary dark:border-border dark:text-white text-sm"
                          />
                        </div>
                        <div>
                          <Label className="dark:text-gray-300 text-xs sm:text-sm">Precio</Label>
                          <Input
                            type="text"
                            value={item.rate ? Number(item.rate).toLocaleString('es-CO') : ''}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/\./g, '').replace(/,/g, '.');
                              const numValue = parseFloat(rawValue) || 0;
                              updateItem(index, 'rate', numValue);
                            }}
                            className="dark:bg-secondary dark:border-border dark:text-white text-sm"
                          />
                        </div>
                        <div>
                          <Label className="dark:text-gray-300 text-xs sm:text-sm">Monto</Label>
                          <Input
                            value={item.amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            disabled
                            className="bg-gray-50 dark:bg-muted dark:text-gray-300 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3 border-t dark:border-border pt-3 sm:pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">Subtotal:</span>
                  <span className="font-semibold text-base sm:text-lg dark:text-white">${invoice.subtotal.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
                
                {/* Tax Section */}
                {invoice.hasTax ? (
                  <div className="flex justify-between items-center bg-gray-50 dark:bg-muted p-2 sm:p-3 rounded-lg">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{invoice.taxName || 'Impuesto'} ({invoice.taxRate}%):</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveTax}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-6 w-6 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <span className="font-semibold text-base sm:text-lg dark:text-white">${invoice.tax.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddTax}
                      className="text-lime-600 border-lime-300 hover:bg-lime-50 dark:hover:bg-lime-900/20 text-xs sm:text-sm"
                    >
                      <Percent className="w-4 h-4 mr-1 sm:mr-2" />
                      Añadir Impuesto
                    </Button>
                  </div>
                )}

                <div className="flex justify-between items-center text-lg sm:text-xl font-bold border-t dark:border-border pt-2 sm:pt-3">
                  <span className="dark:text-white">Total:</span>
                  <span className="text-lime-700 dark:text-lime-400">${invoice.total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </Card>

            {/* Notes and Terms */}
            <Card className="p-4 sm:p-6 dark:bg-card">
              <div className="flex justify-between items-center mb-4 sm:mb-6 cursor-pointer" onClick={() => toggleSection('notes')}>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Notas / Pie de Página</h2>
                <Button variant="ghost" size="sm">
                  {sectionsOpen.notes ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </Button>
              </div>
              {sectionsOpen.notes && (
                <>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">Los cambios se guardan automáticamente</p>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="notes" className="dark:text-gray-300 text-sm">Notas</Label>
                      <Textarea
                        id="notes"
                        value={invoice.notes}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        placeholder="¡Gracias por su preferencia!"
                        rows={2}
                        className="dark:bg-secondary dark:border-border dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="terms" className="dark:text-gray-300 text-sm">Términos y Condiciones</Label>
                      <Textarea
                        id="terms"
                        value={invoice.terms}
                        onChange={(e) => handleTermsChange(e.target.value)}
                        placeholder="Pago a 30 días"
                        rows={2}
                        className="dark:bg-secondary dark:border-border dark:text-white text-sm"
                      />
                    </div>
                    
                    {/* Signature Upload */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Label className="dark:text-gray-300 text-sm mb-2 block">Firma</Label>
                      <div className="flex items-center gap-4">
                        {invoice.signature ? (
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img 
                                src={invoice.signature} 
                                alt="Firma" 
                                className="h-16 max-w-[200px] object-contain border border-gray-200 dark:border-gray-600 rounded p-2 bg-white"
                                style={{ transform: `rotate(${invoice.signatureRotation || 0}deg)` }}
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                                onClick={async () => {
                                  updateInvoice('signature', '');
                                  updateInvoice('signatureRotation', 0);
                                  
                                  // Eliminar firma del perfil
                                  try {
                                    await profileAPI.deleteSignature();
                                    toast({
                                      title: "Firma eliminada",
                                      description: "La firma ha sido removida de tu perfil",
                                    });
                                  } catch (error) {
                                    console.error('Error deleting signature:', error);
                                  }
                                }}
                              >
                                ×
                              </Button>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-10 px-3"
                              onClick={async () => {
                                const newRotation = ((invoice.signatureRotation || 0) + 90) % 360;
                                updateInvoice('signatureRotation', newRotation);
                                
                                // Guardar rotación en el perfil
                                try {
                                  await profileAPI.updateSignature(invoice.signature, newRotation);
                                } catch (error) {
                                  console.error('Error saving signature rotation:', error);
                                }
                              }}
                              title="Rotar 90°"
                            >
                              <RotateCw className="w-4 h-4 mr-1" />
                              Rotar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex-1">
                            <input
                              type="file"
                              id="signature-upload"
                              accept="image/png,image/jpeg,image/jpg"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 1024 * 1024) {
                                    toast({
                                      title: "Error",
                                      description: "La firma no debe superar 1MB",
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = async (event) => {
                                    const signatureData = event.target?.result;
                                    updateInvoice('signature', signatureData);
                                    updateInvoice('signatureRotation', 0);
                                    
                                    // Guardar firma en el perfil
                                    try {
                                      await profileAPI.updateSignature(signatureData, 0);
                                      toast({
                                        title: "¡Firma guardada!",
                                        description: "La firma se ha guardado y aparecerá en tus próximos documentos",
                                      });
                                    } catch (error) {
                                      console.error('Error saving signature:', error);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <label
                              htmlFor="signature-upload"
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            >
                              <Upload className="w-4 h-4" />
                              Subir Firma (PNG, JPG)
                            </label>
                            <p className="text-xs text-gray-500 mt-1">Máximo 1MB - Fondo transparente recomendado</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* Preview Panel - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:block lg:sticky lg:top-24 h-fit">
            <div ref={invoicePreviewRef}>
              <InvoicePreview invoice={invoice} template={template} companyInfo={invoice.from} templateColor={templateColor} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Preview Button - Fixed at bottom */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 pb-4 bg-white dark:bg-card border-t border-gray-200 dark:border-border shadow-lg z-[100]">
        <Button 
          data-testid="mobile-preview-btn"
          onClick={() => setShowMobilePreview(true)}
          className="w-full bg-lime-500 hover:bg-lime-600 text-white h-12"
        >
          <Eye className="w-5 h-5 mr-2" />
          Ver Vista Previa
        </Button>
      </div>

      {/* Mobile Preview Modal */}
      {showMobilePreview && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50">
          <div className="absolute inset-0 bg-white dark:bg-background overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-card border-b dark:border-border p-3 flex items-center justify-between z-10">
              <h3 className="font-semibold text-gray-900 dark:text-white">Vista Previa</h3>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleDownload}
                  className="text-xs"
                >
                  <Download className="w-4 h-4 mr-1" />
                  PDF
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => setShowMobilePreview(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            {/* Preview Content */}
            <div className="p-4 pb-20">
              <div className="transform scale-90 origin-top">
                <div ref={invoicePreviewRef}>
                  <InvoicePreview invoice={invoice} template={template} companyInfo={invoice.from} templateColor={templateColor} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
