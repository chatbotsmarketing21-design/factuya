import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { ArrowLeft, Plus, Trash2, Download, Send, Save, FileText, FileCheck, Calculator, Receipt, DollarSign, Percent, ChevronDown, ChevronUp, Eye, X, Menu, Upload, RotateCw, Palette, Sparkles } from 'lucide-react';
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
  const { t } = useTranslation();
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
    // Detectar si es móvil o escritorio
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      // Móvil: cliente e items abiertos por defecto, el resto cerrado
      return { details: false, from: false, to: true, items: true, notes: false };
    } else {
      // Escritorio: solo cerrados "detalles" y "notas"
      return { details: false, from: true, to: true, items: true, notes: false };
    }
  });
  
  const toggleSection = (section) => {
    setSectionsOpen(prev => {
      const newState = { ...prev, [section]: !prev[section] };
      return newState;
    });
  };

  // Devuelve la fecha de hoy en formato YYYY-MM-DD en la zona horaria LOCAL del usuario.
  // No usar toISOString() porque siempre retorna UTC y desfasa la fecha en horas nocturnas.
  const getLocalDateString = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Draft persistence: keep invoice form state alive across navigation to /templates
  // and back. Stored in sessionStorage so it is scoped to this tab/session.
  const DRAFT_KEY = 'factuya:invoice-draft';
  const saveDraft = (draft) => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      // ignore quota / privacy-mode errors
    }
  };
  const loadDraft = () => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  };
  const clearDraft = () => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      // ignore
    }
  };

  // Navigate to /templates while preserving the in-progress invoice as a draft.
  const goToTemplates = () => {
    saveDraft({ invoice, templateColor, savedAt: Date.now() });
    navigate('/templates');
  };

  // Calcular fecha de vencimiento (un mes exacto después)
  const getOneMonthLater = () => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return getLocalDateString(nextMonth);
  };

  const [invoice, setInvoice] = useState({
    number: '',
    date: getLocalDateString(),
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
      // Modo copia - cargar TODOS los datos copiados (documento idéntico, solo cambia número/fechas)
      loadCompanyInfo();
      // Si la copia incluye un documentType, usarlo para generar el número correcto
      const targetDocType = copyData.documentType || invoice.documentType;
      if (copyData.documentType) {
        setInvoice(prev => ({ ...prev, documentType: targetDocType }));
      }
      generateInvoiceNumber(targetDocType);
      
      // Calcular totales de los items copiados
      const copiedItems = copyData.items || [];
      const subtotal = copiedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      const taxRate = copyData.taxRate || 0;
      const hasTax = copyData.hasTax || false;
      const tax = hasTax ? (subtotal * taxRate) / 100 : 0;
      const discount = copyData.discount || 0;
      const total = subtotal + tax - discount;
      
      // Aplicar los datos copiados (documento idéntico)
      setTimeout(() => {
        setInvoice(prev => ({
          ...prev,
          documentType: targetDocType,
          // Emisor: si viene en copia, usarla; si no, mantener lo que cargó loadCompanyInfo()
          from: copyData.from ? { ...prev.from, ...copyData.from } : prev.from,
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
          // Logo y firma de la factura original
          logo: copyData.logo || prev.logo,
          signature: copyData.signature || prev.signature,
          signatureRotation: copyData.signatureRotation ?? prev.signatureRotation,
          // Configuración fiscal y monetaria
          hasTax,
          taxRate,
          currency: copyData.currency || prev.currency,
          discount,
          subtotal,
          tax,
          total,
          // El status financiero, pagos, fechas y número se generan nuevos
          status: 'pending',
          payments: [],
          totalPaid: 0,
          balance: total,
        }));
        
        // Aplicar plantilla y color copiados
        if (copyData.template) {
          setTemplate(getTemplateById(copyData.template));
        }
        if (copyData.templateColor) {
          setTemplateColor(copyData.templateColor);
        }
      }, 500);
    } else {
      // Modo creación - cargar info de empresa y generar número
      // PERO si hay un draft guardado (porque el usuario fue a /templates y volvió),
      // restaurarlo en lugar de empezar en blanco. El template/color del query param
      // (que vienen de la página de plantillas) tienen prioridad sobre el draft.
      const draft = loadDraft();
      if (draft && draft.invoice) {
        setInvoice(prev => ({
          ...draft.invoice,
          // El template viene del URL (recién seleccionado en /templates)
          template: templateId,
        }));
        // El color también: si vino del URL, usar ese; si no, el del draft
        if (colorFromUrl) {
          setTemplateColor(colorFromUrl);
        } else if (draft.templateColor) {
          setTemplateColor(draft.templateColor);
        }
        // No regeneramos el número: respetamos el que ya tenía el draft
      } else {
        loadCompanyInfo();
        generateInvoiceNumber(invoice.documentType);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      
      // Cargar el color: prioridad al color de URL (cuando viene de plantillas) sobre el guardado
      if (colorFromUrl) {
        // El usuario viene de la página de plantillas con un color específico
        setTemplateColor(colorFromUrl);
      } else if (invoiceData.templateColor) {
        // Usar el color guardado en la factura
        setTemplateColor(invoiceData.templateColor);
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
          bankAccount: companyInfo.bankAccount || '',
          accountType: companyInfo.accountType || 'savings'
        }
      }));
    } catch (error) {
      console.error('Failed to load company info:', error);
    }
  };

  // Auto-save notes, terms and template with debounce
  const saveTimeoutRef = useRef(null);

  // Cuando el usuario regresa de la galería de logos (/logos) con un logo seleccionado,
  // sessionStorage tiene la key "factuya:newSelectedLogo". Lo aplicamos al estado local
  // del documento en curso para que el cambio sea inmediato sin recargar la página.
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const newLogo = sessionStorage.getItem('factuya:newSelectedLogo');
        if (newLogo) {
          sessionStorage.removeItem('factuya:newSelectedLogo');
          setInvoice((prev) => ({ ...prev, logo: newLogo }));
        }
      } catch (_) { /* ignore */ }
    }, 300);

    // También chequear inmediatamente al montar (caso típico tras navigate(-1))
    try {
      const newLogo = sessionStorage.getItem('factuya:newSelectedLogo');
      if (newLogo) {
        sessionStorage.removeItem('factuya:newSelectedLogo');
        setInvoice((prev) => ({ ...prev, logo: newLogo }));
      }
    } catch (_) { /* ignore */ }

    return () => clearInterval(interval);
  }, []);
  
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
        bill: 'COB',
        tax_invoice: 'FIM',
        sales_receipt: 'RVE',
        cash_receipt: 'REF',
        offer: 'OFE',
        credit_note: 'NAB',
        order: 'PED',
        delivery_note: 'NEN'
      };
      const prefix = prefixes[docType] || 'FAC';
      setInvoice(prev => ({ ...prev, number: `${prefix}-001` }));
    }
  };

  const handleDocumentTypeChange = async (newType) => {
    updateInvoice('documentType', newType);

    // Documentos NO cobrables: propuestas, ofertas, pedidos y entregas.
    // No deben quedar marcados como "pagado" ni acumular pagos.
    const nonPayableTypes = ['quotation', 'proforma', 'offer', 'order', 'delivery_note'];
    if (nonPayableTypes.includes(newType)) {
      setInvoice(prev => ({
        ...prev,
        status: 'pending',
        payments: [],
        totalPaid: 0,
      }));
    }

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

    // Siempre generar nuevo número cuando cambia el tipo de documento
    await generateInvoiceNumber(newType);
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

  const addItem = (insertAfterIndex = null) => {
    const newItem = {
      description: '',
      quantity: 0,
      rate: 0,
      amount: 0
    };
    
    // Si nos pasaron un índice, insertamos el nuevo item justo después del que tocaron.
    // Si no, lo añadimos al final (comportamiento clásico del botón "Agregar item").
    let newIndex;
    if (insertAfterIndex !== null && insertAfterIndex >= 0) {
      newIndex = insertAfterIndex + 1;
      setInvoice(prev => {
        const newItems = [...prev.items];
        newItems.splice(newIndex, 0, newItem);
        return { ...prev, items: newItems };
      });
    } else {
      newIndex = invoice.items.length;
      setInvoice(prev => ({ ...prev, items: [...prev.items, newItem] }));
    }
    
    // Enfocar el campo de descripción del nuevo ítem después de renderizar
    setTimeout(() => {
      const newDescriptionField = document.getElementById(`item-description-${newIndex}`);
      if (newDescriptionField) {
        newDescriptionField.focus();
        newDescriptionField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
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
        shortName: 'Factura',
        icon: <FileText className="w-4 h-4" />,
        color: '#2563eb'
      },
      tax_invoice: {
        name: 'FACTURA DE IMPUESTOS',
        shortName: 'Factura Impuestos',
        icon: <FileText className="w-4 h-4" />,
        color: '#1d4ed8'
      },
      proforma: {
        name: 'FACTURA PROFORMA',
        shortName: 'Proforma',
        icon: <FileCheck className="w-4 h-4" />,
        color: '#7c3aed'
      },
      quotation: {
        name: 'COTIZACIÓN',
        shortName: 'Cotización',
        icon: <Calculator className="w-4 h-4" />,
        color: '#059669'
      },
      bill: {
        name: 'CUENTA DE COBRO',
        shortName: 'Cuenta',
        icon: <DollarSign className="w-4 h-4" />,
        color: '#ea580c'
      },
      receipt: {
        name: 'RECIBO',
        shortName: 'Recibo',
        icon: <Receipt className="w-4 h-4" />,
        color: '#0891b2'
      },
      sales_receipt: {
        name: 'RECIBO DE LA VENTA',
        shortName: 'Recibo Venta',
        icon: <Receipt className="w-4 h-4" />,
        color: '#0e7490'
      },
      cash_receipt: {
        name: 'RECIBO DE EFECTIVO',
        shortName: 'Recibo Efectivo',
        icon: <DollarSign className="w-4 h-4" />,
        color: '#16a34a'
      },
      offer: {
        name: 'OFERTA',
        shortName: 'Oferta',
        icon: <Sparkles className="w-4 h-4" />,
        color: '#db2777'
      },
      credit_note: {
        name: 'NOTA DE ABONO',
        shortName: 'Nota Abono',
        icon: <FileText className="w-4 h-4" />,
        color: '#9333ea'
      },
      order: {
        name: 'PEDIDO',
        shortName: 'Pedido',
        icon: <FileText className="w-4 h-4" />,
        color: '#ca8a04'
      },
      delivery_note: {
        name: 'NOTA DE ENTREGA',
        shortName: 'Nota Entrega',
        icon: <FileText className="w-4 h-4" />,
        color: '#475569'
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
      
      let savedInvoiceId = invoiceId;
      
      // Include templateColor in the invoice data
      const invoiceDataToSave = {
        ...invoice,
        templateColor: templateColor
      };
      
      if (isEditMode && invoiceId) {
        // Actualizar factura existente
        await invoiceAPI.update(invoiceId, invoiceDataToSave);
        toast({
          title: "¡Factura Actualizada!",
          description: "Los cambios han sido guardados exitosamente.",
        });
      } else {
        // Crear nueva factura
        const response = await invoiceAPI.create(invoiceDataToSave);
        savedInvoiceId = response.data.id;
        toast({
          title: "¡Factura Guardada!",
          description: "Tu factura ha sido creada exitosamente.",
        });
      }
      
      // On mobile, navigate to invoice detail page; on desktop, go to dashboard
      // Clear the draft regardless: the invoice is now persisted in DB.
      clearDraft();
      const isMobile = window.innerWidth < 640;
      if (isMobile && savedInvoiceId) {
        navigate(`/invoice/${savedInvoiceId}`);
      } else {
        navigate('/dashboard');
      }
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
      toast({
        title: "Generando PDF...",
        description: "Por favor espera un momento",
      });

      // Crear un contenedor temporal oculto para renderizar el PDF sin transformaciones
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '794px';
      tempContainer.style.backgroundColor = '#ffffff';
      document.body.appendChild(tempContainer);

      // Renderizar el componente InvoicePreview en el contenedor temporal
      const { createRoot } = await import('react-dom/client');
      const React = await import('react');
      const { default: InvoicePreviewComponent } = await import('../components/InvoicePreview');
      
      const root = createRoot(tempContainer);
      
      await new Promise((resolve) => {
        root.render(
          React.createElement(InvoicePreviewComponent, {
            invoice: invoice,
            template: template,
            companyInfo: invoice.from,
            templateColor: templateColor
          })
        );
        // Esperar a que se renderice
        setTimeout(resolve, 500);
      });

      // Capturar el contenedor temporal como imagen con alta calidad
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794
      });

      // Limpiar
      root.unmount();
      document.body.removeChild(tempContainer);

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
          
          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.85);
          pdf.addImage(pageImgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        }
      }
      
      // Crear blob y abrir directamente en el navegador/visor del sistema
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      // Abrir en nueva pestaña - esto activa el visor del sistema en móvil
      window.open(blobUrl, '_blank');

      toast({
        title: "¡PDF Listo!",
        description: "El PDF se ha abierto para visualizar",
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
              {/* Mobile: Back arrow */}
              <Link to="/dashboard" className="sm:hidden">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              {/* Logo - clickable on mobile to go back */}
              <Link to="/dashboard" className="sm:hidden">
                <div className="flex items-center">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">Factu</span>
                  <span className="text-lg font-bold text-white bg-lime-500 px-1.5 ml-1">Ya!</span>
                </div>
              </Link>
              {/* Logo - desktop (not clickable, just display) */}
              <div className="hidden sm:flex items-center">
                <span className="text-xl font-bold text-gray-900 dark:text-white">Factu</span>
                <span className="text-xl font-bold text-white bg-lime-500 px-2 ml-1">Ya!</span>
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
                      className="gap-2 text-base font-semibold shadow-md hover:shadow-lg transition-shadow text-gray-900 border-gray-300"
                      style={{ 
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)'
                      }}
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
                    <DropdownMenuItem onClick={() => changeDocumentType('tax_invoice')}>
                      <FileText className="w-4 h-4 mr-2 text-blue-700" />
                      FACTURA DE IMPUESTOS
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
                    <DropdownMenuItem onClick={() => changeDocumentType('sales_receipt')}>
                      <Receipt className="w-4 h-4 mr-2 text-cyan-700" />
                      RECIBO DE LA VENTA
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeDocumentType('cash_receipt')}>
                      <DollarSign className="w-4 h-4 mr-2 text-green-700" />
                      RECIBO DE EFECTIVO
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeDocumentType('offer')}>
                      <Sparkles className="w-4 h-4 mr-2 text-pink-600" />
                      OFERTA
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeDocumentType('credit_note')}>
                      <FileText className="w-4 h-4 mr-2 text-purple-700" />
                      NOTA DE ABONO
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeDocumentType('order')}>
                      <FileText className="w-4 h-4 mr-2 text-yellow-600" />
                      PEDIDO
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeDocumentType('delivery_note')}>
                      <FileText className="w-4 h-4 mr-2 text-slate-600" />
                      NOTA DE ENTREGA
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Link to="/templates" onClick={(e) => { e.preventDefault(); goToTemplates(); }}>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all font-semibold gap-2 border-0"
                    data-testid="change-template-btn-desktop"
                  >
                    <Palette className="w-4 h-4" />
                    {t('invoice.changeTemplate')}
                    <Sparkles className="w-3.5 h-3.5 opacity-80" />
                  </Button>
                </Link>
              </div>
              
              {/* Save button - Only visible on desktop */}
              <Button 
                size="sm" 
                className="hidden sm:flex bg-lime-500 hover:bg-lime-600 text-white text-xs sm:text-sm px-2 sm:px-4" 
                onClick={handleSave} 
                disabled={loading}
              >
                <Save className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{loading ? t('invoice.saving') : isEditMode ? t('invoice.updateInvoice') : t('invoice.saveInvoice')}</span>
              </Button>
              
              {/* Mobile menu button - Shows document type selector */}
              <DropdownMenu open={showMobileMenu} onOpenChange={setShowMobileMenu}>
                <DropdownMenuTrigger asChild className="md:hidden">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-base px-3 font-semibold shadow-md hover:shadow-lg transition-shadow text-gray-900 border-gray-300"
                    style={{
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)'
                    }}
                  >
                    Tipo de Documento
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 max-h-[70vh] overflow-y-auto">
                  <DropdownMenuItem onClick={() => { changeDocumentType('invoice'); setShowMobileMenu(false); }}>
                    <FileText className="w-4 h-4 mr-2 text-blue-600" />
                    FACTURA
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { changeDocumentType('tax_invoice'); setShowMobileMenu(false); }}>
                    <FileText className="w-4 h-4 mr-2 text-blue-700" />
                    FACTURA DE IMPUESTOS
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
                  <DropdownMenuItem onClick={() => { changeDocumentType('sales_receipt'); setShowMobileMenu(false); }}>
                    <Receipt className="w-4 h-4 mr-2 text-cyan-700" />
                    RECIBO DE LA VENTA
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { changeDocumentType('cash_receipt'); setShowMobileMenu(false); }}>
                    <DollarSign className="w-4 h-4 mr-2 text-green-700" />
                    RECIBO DE EFECTIVO
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { changeDocumentType('offer'); setShowMobileMenu(false); }}>
                    <Sparkles className="w-4 h-4 mr-2 text-pink-600" />
                    OFERTA
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { changeDocumentType('credit_note'); setShowMobileMenu(false); }}>
                    <FileText className="w-4 h-4 mr-2 text-purple-700" />
                    NOTA DE ABONO
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { changeDocumentType('order'); setShowMobileMenu(false); }}>
                    <FileText className="w-4 h-4 mr-2 text-yellow-600" />
                    PEDIDO
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { changeDocumentType('delivery_note'); setShowMobileMenu(false); }}>
                    <FileText className="w-4 h-4 mr-2 text-slate-600" />
                    NOTA DE ENTREGA
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    asChild
                    className="bg-lime-500 focus:bg-lime-600 hover:bg-lime-600 text-white focus:text-white data-[highlighted]:bg-lime-600 data-[highlighted]:text-white mt-1 rounded-md"
                  >
                    <Link
                      to="/templates"
                      className="w-full flex items-center gap-2 font-semibold text-white focus:text-white py-2"
                      onClick={(e) => { e.preventDefault(); setShowMobileMenu(false); goToTemplates(); }}
                      data-testid="change-template-btn-mobile"
                    >
                      <Palette className="w-4 h-4 text-white" />
                      {t('invoice.changeTemplate')}
                      <Sparkles className="w-3.5 h-3.5 ml-auto text-white" />
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
                    <div>
                      <div className="flex items-center gap-3 sm:gap-4">
                        <img 
                          src={invoice.logo} 
                          alt="Logo" 
                          className="h-16 w-16 sm:h-20 sm:w-20 object-contain border border-gray-200 dark:border-gray-600 rounded flex-shrink-0"
                        />
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex-1">Logo cargado</p>
                      </div>
                      <div className="flex items-center gap-2 mt-3 flex-nowrap">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={removeLogo}
                          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs sm:text-sm"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          Eliminar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => navigate('/logos')}
                          className="flex-1 bg-lime-500 hover:bg-lime-600 text-white text-xs sm:text-sm gap-1"
                          data-testid="select-logo-btn-active"
                        >
                          <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                          Seleccionar logo
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
                          cursor-pointer mb-3"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => navigate('/logos')}
                        className="w-full bg-lime-500 hover:bg-lime-600 text-white text-xs sm:text-sm gap-1"
                        data-testid="select-logo-btn-empty"
                      >
                        <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                        Seleccionar logo de la galería
                      </Button>
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
                    <Label htmlFor="fromZip" className="dark:text-gray-300 text-sm">{t('invoice.zip')}</Label>
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
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('invoice.to')}</h2>
                <Button variant="ghost" size="sm">
                  {sectionsOpen.to ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </Button>
              </div>
              {sectionsOpen.to && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="toName" className="dark:text-gray-300 text-sm">{t('invoice.clientInfo')}</Label>
                  <Textarea
                    id="toName"
                    value={invoice.to.name}
                    onChange={(e) => updateTo('name', e.target.value)}
                    onBlur={(e) => updateTo('name', e.target.value.toUpperCase())}
                    placeholder="Nombre del cliente, NIT, dirección, teléfono..."
                    className="dark:bg-secondary dark:border-border dark:text-white uppercase min-h-[100px]"
                    style={{ textTransform: 'uppercase' }}
                    rows={4}
                  />
                </div>
              </div>
              )}
            </Card>

            {/* Items Section */}
            <Card className="p-4 sm:p-6 dark:bg-card">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('invoice.items')}</h2>
                <Button onClick={addItem} size="sm" className="text-xs sm:text-sm">
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('invoice.addItem')}</span>
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
                        <Label className="dark:text-gray-300 text-sm">{t('invoice.description')} *</Label>
                        <Input
                          id={`item-description-${index}`}
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder={t('invoice.description')}
                          required
                          className="dark:bg-secondary dark:border-border dark:text-white text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <div>
                          <Label className="dark:text-gray-300 text-xs sm:text-sm">{t('invoice.quantity')}</Label>
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
                          <Label className="dark:text-gray-300 text-xs sm:text-sm">{t('invoice.rate')}</Label>
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
                          <Label className="dark:text-gray-300 text-xs sm:text-sm">{t('invoice.amount')}</Label>
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
                  <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">{t('invoice.subtotal')}:</span>
                  <span className="font-semibold text-base sm:text-lg dark:text-white">${invoice.subtotal.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
                
                {/* Tax Section */}
                {invoice.hasTax ? (
                  <div className="flex justify-between items-center bg-gray-50 dark:bg-muted p-2 sm:p-3 rounded-lg">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{invoice.taxName || t('invoice.tax')} ({invoice.taxRate}%):</span>
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
                      {t('invoice.addTax')}
                    </Button>
                  </div>
                )}

                <div className="flex justify-between items-center text-lg sm:text-xl font-bold border-t dark:border-border pt-2 sm:pt-3">
                  <span className="dark:text-white">{t('invoice.total')}:</span>
                  <span className="text-lime-700 dark:text-lime-400">${invoice.total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </Card>

            {/* Notes and Terms */}
            <Card className="p-4 sm:p-6 dark:bg-card">
              <div className="flex justify-between items-center mb-4 sm:mb-6 cursor-pointer" onClick={() => toggleSection('notes')}>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('invoice.notesFooter')}</h2>
                <Button variant="ghost" size="sm">
                  {sectionsOpen.notes ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </Button>
              </div>
              {sectionsOpen.notes && (
                <>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">{t('invoice.changesAutoSaved')}</p>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="notes" className="dark:text-gray-300 text-sm">{t('invoice.notes')}</Label>
                      <Textarea
                        id="notes"
                        value={invoice.notes}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        placeholder=""
                        rows={2}
                        className="dark:bg-secondary dark:border-border dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="terms" className="dark:text-gray-300 text-sm">{t('invoice.terms')}</Label>
                      <Textarea
                        id="terms"
                        value={invoice.terms}
                        onChange={(e) => handleTermsChange(e.target.value)}
                        placeholder=""
                        rows={6}
                        className="dark:bg-secondary dark:border-border dark:text-white text-sm"
                      />
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

        {/* Mobile Inline Preview - Shows below form on mobile */}
        <div className="lg:hidden mt-6 px-1">
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer active:opacity-90 transition-colors shadow-sm border border-gray-200 dark:border-gray-700"
            onClick={handleDownload}
          >
            <div 
              className="w-full"
              style={{ 
                overflow: 'hidden',
                maxHeight: '400px'
              }}
            >
              <div 
                style={{ 
                  width: '794px',
                  transform: 'scale(0.44)',
                  transformOrigin: 'top left',
                  marginLeft: '4px'
                }}
              >
                <div 
                  ref={invoicePreviewRef} 
                  className="bg-white" 
                  style={{ width: '794px' }}
                >
                  <InvoicePreview invoice={invoice} template={template} companyInfo={invoice.from} templateColor={templateColor} />
                </div>
              </div>
            </div>
            {/* Message inside the card */}
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 py-2 px-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
              Toca para descargar PDF
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Save Button - Floating at bottom RIGHT (igual al "+ Nueva Factura" del Dashboard) */}
      <Link to="#" className="lg:hidden" onClick={(e) => { e.preventDefault(); if (!loading) handleSave(); }}>
        <div 
          data-testid="mobile-save-btn"
          className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 bg-lime-500 hover:bg-lime-600 text-white font-semibold px-4 py-3 rounded-full shadow-lg transition-all text-base cursor-pointer"
          style={{ boxShadow: '0 4px 14px rgba(132, 204, 22, 0.4)', opacity: loading ? 0.7 : 1 }}
        >
          <Save className="w-5 h-5" />
          <span>{loading ? 'Guardando...' : (isEditMode ? 'Actualizar documento' : 'Guardar documento')}</span>
        </div>
      </Link>

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
            <DialogTitle>{t('invoice.addTax')}</DialogTitle>
            <DialogDescription>
              {t('invoice.addTax')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taxName">{t('invoice.taxName')}</Label>
                <Input
                  id="taxName"
                  value={tempTaxName}
                  onChange={(e) => setTempTaxName(e.target.value)}
                  placeholder="IVA"
                />
              </div>
              <div>
                <Label htmlFor="taxRate">{t('invoice.taxRate')}</Label>
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
              {t('invoice.saveTax')}
            </Button>
            <Button variant="ghost" onClick={() => setShowTaxDialog(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceCreator;
