import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { invoiceAPI } from '../services/api';
import { subscriptionAPI } from '../services/subscriptionApi';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import LanguageSwitcher from '../components/LanguageSwitcher';
import SwipeableInvoiceCard from '../components/SwipeableInvoiceCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Plus, Search, Download, Send, Trash2, FileText, LogOut, CheckCircle, Clock, XCircle, FileEdit, Loader2, CreditCard, Settings, User, Key, Sun, Moon, Share2, MessageCircle, Mail, Copy, Globe } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';
import InvoicePreview from '../components/InvoicePreview';
import { getTemplateById } from '../mock/invoiceData';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false); // Track if search is focused
  const [statusFilter, setStatusFilter] = useState(null); // null = all, 'paid' = pagadas, 'pending' = pendientes
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [pdfInvoice, setPdfInvoice] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const pdfPreviewRef = useRef(null);
  const searchInputRef = useRef(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const { toast } = useToast();
  const { logout, user } = useAuth();

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', JSON.stringify(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Poll payment status when returning from Stripe
  const pollPaymentStatus = useCallback(async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      setCheckingPayment(false);
      toast({
        title: "Verificación de pago",
        description: "No se pudo verificar el estado del pago. Por favor revisa tu correo para confirmar.",
        variant: "destructive"
      });
      // Clean URL params
      setSearchParams({});
      return;
    }

    try {
      const response = await subscriptionAPI.getCheckoutStatus(sessionId);
      const data = response.data;

      if (data.paymentStatus === 'paid') {
        setCheckingPayment(false);
        toast({
          title: "¡Pago exitoso!",
          description: "Tu suscripción Premium está activa. ¡Ahora tienes facturas ilimitadas!",
        });
        // Clean URL params
        setSearchParams({});
        return;
      } else if (data.status === 'expired') {
        setCheckingPayment(false);
        toast({
          title: "Sesión expirada",
          description: "La sesión de pago ha expirado. Por favor intenta de nuevo.",
          variant: "destructive"
        });
        setSearchParams({});
        return;
      }

      // Continue polling if still pending
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    } catch (error) {
      console.error('Error checking payment status:', error);
      if (attempts < maxAttempts - 1) {
        setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
      } else {
        setCheckingPayment(false);
        setSearchParams({});
      }
    }
  }, [toast, setSearchParams]);

  // Check for payment return from Stripe
  useEffect(() => {
    const payment = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');

    if (payment === 'success' && sessionId) {
      setCheckingPayment(true);
      pollPaymentStatus(sessionId);
    } else if (payment === 'canceled') {
      toast({
        title: "Pago cancelado",
        description: "Has cancelado el proceso de pago. Puedes intentarlo cuando quieras.",
      });
      setSearchParams({});
    }
  }, [searchParams, pollPaymentStatus, toast, setSearchParams]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invoicesRes, statsRes] = await Promise.all([
        invoiceAPI.getAll(),
        invoiceAPI.getStats()
      ]);
      setInvoices(invoicesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, event) => {
    console.log('handleDelete called with id:', id);
    
    // Prevenir propagación del evento
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    // Abrir el diálogo de confirmación
    setInvoiceToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!invoiceToDelete) return;
    
    console.log('Confirmando eliminación de:', invoiceToDelete);

    try {
      console.log('Attempting to delete invoice:', invoiceToDelete);
      await invoiceAPI.delete(invoiceToDelete);
      toast({
        title: "¡Éxito!",
        description: "Factura eliminada exitosamente"
      });
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la factura",
        variant: "destructive"
      });
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const handleCopyInvoice = async (invoiceId, event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    try {
      // Obtener los datos de la factura original
      const response = await invoiceAPI.getById(invoiceId);
      const originalInvoice = response.data;

      // Navegar al creador con los datos del cliente prerellenados
      navigate('/create', {
        state: {
          copyFrom: {
            to: originalInvoice.to || originalInvoice.toAddress,
            items: originalInvoice.items,
            notes: originalInvoice.notes,
            terms: originalInvoice.terms,
            template: originalInvoice.template
          }
        }
      });

      toast({
        title: "Factura copiada",
        description: "Se han copiado los datos del cliente. Puedes modificar lo que necesites.",
      });
    } catch (error) {
      console.error('Error copying invoice:', error);
      toast({
        title: "Error",
        description: "No se pudo copiar la factura",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (invoiceId, newStatus) => {
    try {
      // Buscar la factura completa
      const invoiceResponse = await invoiceAPI.getById(invoiceId);
      const invoiceData = invoiceResponse.data;
      
      // Actualizar solo el estado
      await invoiceAPI.update(invoiceId, {
        ...invoiceData,
        status: newStatus
      });
      
      // Recargar datos sin mostrar notificación
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive"
      });
    }
  };

  const handleView = (invoiceId) => {
    // Por ahora, redirigir a editar ya que es la misma vista
    navigate(`/create?id=${invoiceId}`);
  };

  const handleEdit = (invoiceId) => {
    navigate(`/create?id=${invoiceId}`);
  };

  // Helper function to generate PDF from invoice
  // This logic mirrors the InvoiceCreator.jsx implementation exactly
  const generatePdfFromInvoice = async (invoice) => {
    return new Promise(async (resolve, reject) => {
      try {
        setGeneratingPdf(true);
        
        console.log('generatePdfFromInvoice: Starting for invoice', invoice?.number);
        
        // Create a temporary hidden container for clean PDF render
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '794px';
        tempContainer.style.backgroundColor = '#ffffff';
        document.body.appendChild(tempContainer);

        console.log('generatePdfFromInvoice: Container created');

        const { createRoot } = await import('react-dom/client');
        const React = await import('react');
        const { default: InvoicePreviewComponent } = await import('../components/InvoicePreview');
        
        console.log('generatePdfFromInvoice: Modules imported');
        
        const root = createRoot(tempContainer);
        
        const invoiceData = {
          ...invoice,
          from: invoice.fromAddress || invoice.from,
          to: invoice.toAddress || invoice.to,
          items: invoice.items || []
        };
        const templateData = getTemplateById(invoice.template || 1);
        
        console.log('generatePdfFromInvoice: Rendering with template', invoice.template || 1);
        
        await new Promise((resolveRender) => {
          root.render(
            React.createElement(InvoicePreviewComponent, {
              invoice: invoiceData,
              template: templateData
            })
          );
          setTimeout(resolveRender, 500);
        });

        console.log('generatePdfFromInvoice: Rendered, capturing canvas');

        const canvas = await html2canvas(tempContainer, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          windowWidth: 794
        });

        console.log('generatePdfFromInvoice: Canvas captured', canvas.width, 'x', canvas.height);

        root.unmount();
        document.body.removeChild(tempContainer);

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = 210;
        const pageHeight = 297;
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (imgHeight <= pageHeight) {
          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        } else {
          const totalPages = Math.ceil(imgHeight / pageHeight);
          const sourceWidth = canvas.width;
          const sourcePageHeight = (canvas.width * pageHeight) / pageWidth;
          
          for (let page = 0; page < totalPages; page++) {
            if (page > 0) pdf.addPage();
            
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = sourceWidth;
            pageCanvas.height = sourcePageHeight;
            
            const ctx = pageCanvas.getContext('2d');
            const sourceY = page * sourcePageHeight;
            const drawHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(canvas, 0, sourceY, sourceWidth, drawHeight, 0, 0, sourceWidth, drawHeight);
            
            const pageImgData = pageCanvas.toDataURL('image/png');
            pdf.addImage(pageImgData, 'PNG', 0, 0, pageWidth, pageHeight);
          }
        }
        
        setGeneratingPdf(false);
        resolve(pdf);
      } catch (error) {
        setGeneratingPdf(false);
        reject(error);
      }
    });
  };

  const handleDownloadPDF = async (invoiceId) => {
    try {
      toast({
        title: "Generando PDF...",
        description: "Por favor espera un momento",
      });

      // Load full invoice data
      const response = await invoiceAPI.getById(invoiceId);
      const fullInvoice = response.data;
      
      if (!fullInvoice) {
        toast({
          title: "Error",
          description: "No se encontró la factura",
          variant: "destructive"
        });
        return;
      }

      const pdf = await generatePdfFromInvoice(fullInvoice);
      const invoiceNumber = fullInvoice.invoiceNumber || fullInvoice.number || 'documento';
      const clientName = fullInvoice.clientName || fullInvoice.to?.name || fullInvoice.toAddress?.name || 'cliente';
      pdf.save(`${invoiceNumber}_${clientName}.pdf`);

      toast({
        title: "¡Descarga Completa!",
        description: "Tu factura PDF ha sido descargada",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive"
      });
    }
  };

  const handleSendEmail = async (invoice) => {
    if (!invoice.to?.email) {
      toast({
        title: "Email No Disponible",
        description: "Esta factura no tiene email del cliente",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "¡Email Enviado!",
      description: `Factura enviada a ${invoice.to.email}`,
    });
  };

  const handleShareWhatsApp = async (invoiceId) => {
    // Navigate to invoice detail page where share works correctly
    // This avoids the "user gesture" issue with Web Share API
    navigate(`/invoice/${invoiceId}`);
  };

  const handleShareEmail = (invoice) => {
    const clientName = invoice.to?.name || 'Cliente';
    const clientEmail = invoice.to?.email || '';
    const invoiceNumber = invoice.invoiceNumber || invoice.number || 'S/N';
    const total = invoice.total?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';
    
    const subject = encodeURIComponent(`Factura N° ${invoiceNumber} - FactuYa!`);
    const body = encodeURIComponent(`Hola ${clientName},\n\nLe comparto su factura N° ${invoiceNumber} por un total de $${total}.\n\n¡Gracias por su preferencia!\n\nAtentamente,\nFactuYa!`);
    
    const mailtoUrl = `mailto:${clientEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
    
    toast({
      title: "Correo Abierto",
      description: "Se ha abierto su cliente de correo para enviar la factura",
    });
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle status filter click
  const handleStatusFilterClick = (status) => {
    if (statusFilter === status) {
      setStatusFilter(null); // Clear filter if clicking the same one
    } else {
      setStatusFilter(status);
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    // First apply search filter
    const matchesSearch = 
      invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.number.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Then apply status filter
    const matchesStatus = statusFilter ? invoice.status === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">Factu</span>
            <span className="text-4xl font-bold text-white bg-lime-500 px-3 ml-1">Ya!</span>
          </div>
          <Loader2 className="w-10 h-10 animate-spin text-lime-500 mx-auto" />
        </div>
      </div>
    );
  }

  // Payment verification overlay
  if (checkingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-lime-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Verificando tu pago...</h2>
          <p className="text-gray-600 dark:text-gray-400">Por favor espera un momento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-background">
      {/* Header */}
      <header className="bg-white dark:bg-card border-b border-gray-200 dark:border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo and welcome - stack on mobile */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div 
                className="flex items-center cursor-pointer"
                onClick={(e) => {
                  // Check if any dropdown menu is open
                  const openMenu = document.querySelector('[data-state="open"][role="menu"]');
                  if (!openMenu) {
                    navigate('/dashboard');
                  }
                }}
              >
                <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Factu</span>
                <span className="text-xl sm:text-2xl font-bold text-white bg-lime-500 px-1.5 sm:px-2 ml-1">Ya!</span>
              </div>
              {user && (
                <span className="hidden md:inline text-sm text-gray-600 dark:text-gray-300">
                  {user.gender === 'female' ? t('common.welcomeFemale') : t('common.welcomeMale')}, {user.name}
                </span>
              )}
            </div>
            
            {/* Actions - responsive */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>
              {/* Botón crear factura - solo visible en desktop */}
              <Link to="/create" className="hidden sm:block">
                <Button className="bg-lime-500 hover:bg-lime-600 text-white text-xs sm:text-sm px-2 sm:px-4">
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('dashboard.newInvoice')}</span>
                </Button>
              </Link>
              
              {/* Configuración Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="px-3 sm:px-3 h-11 sm:h-9">
                    <Settings className="w-7 h-7 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t('settings.title')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 z-[60]" onCloseAutoFocus={(e) => e.preventDefault()}>
                  <DropdownMenuLabel>{t('settings.myAccount')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')} className="text-base py-3">
                    <User className="w-5 h-5 mr-3" />
                    {t('settings.profile')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/subscription')} className="text-base py-3">
                    <CreditCard className="w-5 h-5 mr-3" />
                    {t('settings.subscription')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/change-password')} className="text-base py-3">
                    <Key className="w-5 h-5 mr-3" />
                    {t('settings.changePassword')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{t('settings.appearance')}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={toggleDarkMode} className="text-base py-3">
                    {darkMode ? (
                      <>
                        <Sun className="w-5 h-5 mr-3" />
                        {t('settings.lightMode')}
                      </>
                    ) : (
                      <>
                        <Moon className="w-5 h-5 mr-3" />
                        {t('settings.darkMode')}
                      </>
                    )}
                  </DropdownMenuItem>
                  {/* Language switcher - below dark mode */}
                  <DropdownMenuItem 
                    className="sm:hidden text-base py-3"
                    onClick={(e) => {
                      e.preventDefault();
                      const newLang = i18n.language === 'es' ? 'en' : 'es';
                      i18n.changeLanguage(newLang);
                    }}
                  >
                    <Globe className="w-5 h-5 mr-3" />
                    {i18n.language === 'es' ? 'Español' : 'English'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 text-base py-3">
                    <LogOut className="w-5 h-5 mr-3" />
                    {t('settings.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>



            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Stats - Hidden on mobile when search is focused */}
        {stats && (
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8 ${searchFocused ? 'hidden sm:grid' : ''}`}>
            <Card className="p-4 sm:p-6 dark:bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm sm:text-sm text-gray-600 dark:text-gray-400">{t('dashboard.totalRevenue')}</p>
                  <p className="text-lg sm:text-3xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2">{stats.totalRevenue.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 sm:p-3 rounded-full flex items-center justify-center">
                  <span className="w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center text-sm sm:text-lg font-bold text-blue-600 dark:text-blue-400">$</span>
                </div>
              </div>
            </Card>
            <Card 
              className="p-4 sm:p-6 dark:bg-card cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setStatusFilter(null)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm sm:text-sm text-gray-600 dark:text-gray-400">{t('dashboard.totalInvoices')}</p>
                  <p className="text-lg sm:text-3xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2">{stats.totalInvoices}</p>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 sm:p-3 rounded-full">
                  <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>
            <Card 
              className={`p-4 sm:p-6 dark:bg-card cursor-pointer hover:shadow-lg transition-all ${statusFilter === 'paid' ? 'ring-2 ring-green-500 shadow-lg' : ''}`}
              onClick={() => handleStatusFilterClick('paid')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm sm:text-sm text-gray-600 dark:text-gray-400">{t('dashboard.paid')}</p>
                  <p className="text-lg sm:text-3xl font-bold text-green-600 dark:text-green-400 mt-1 sm:mt-2">{stats.paidInvoices}</p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-2 sm:p-3 rounded-full">
                  <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>
            <Card 
              className={`p-4 sm:p-6 dark:bg-card cursor-pointer hover:shadow-lg transition-all ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500 shadow-lg' : ''}`}
              onClick={() => handleStatusFilterClick('pending')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm sm:text-sm text-gray-600 dark:text-gray-400">{t('dashboard.pending')}</p>
                  <p className="text-lg sm:text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1 sm:mt-2">{stats.pendingInvoices}</p>
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 sm:p-3 rounded-full">
                  <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Search and Filter */}
        <Card className={`p-4 sm:p-6 mb-4 sm:mb-6 dark:bg-card ${searchFocused ? 'sm:relative' : ''}`}>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder={t('dashboard.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => {
                  // Small delay to allow click events to fire first
                  setTimeout(() => setSearchFocused(false), 150);
                }}
                className="pl-10"
              />
            </div>
          </div>
        </Card>

        {/* Invoices - Cards for Mobile, Table for Desktop */}
        <Card className="dark:bg-card">
          <div className="p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">{t('dashboard.allInvoices')}</h2>
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-2">{t('dashboard.noInvoices')}</p>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4">{t('dashboard.createFirst')}</p>
                <Link to="/create">
                  <Button className="bg-lime-500 hover:bg-lime-600 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Factura
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Mobile View - Swipeable Cards */}
                <div className="sm:hidden">
                  {filteredInvoices.map((invoice) => (
                    <SwipeableInvoiceCard
                      key={invoice.id}
                      invoice={invoice}
                      onView={handleView}
                      onMarkPaid={handleStatusChange}
                      onShare={handleShareWhatsApp}
                    />
                  ))}
                </div>

                {/* Desktop View - Table */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:border-border">
                        <TableHead className="dark:text-gray-300">{t('table.invoiceNumber')}</TableHead>
                        <TableHead className="dark:text-gray-300">{t('table.client')}</TableHead>
                        <TableHead className="dark:text-gray-300">{t('table.date')}</TableHead>
                        <TableHead className="dark:text-gray-300">{t('table.dueDate')}</TableHead>
                        <TableHead className="dark:text-gray-300">{t('table.amount')}</TableHead>
                        <TableHead className="dark:text-gray-300">{t('table.status')}</TableHead>
                        <TableHead className="text-right dark:text-gray-300">{t('table.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => (
                        <TableRow 
                          key={invoice.id}
                          className="cursor-pointer hover:bg-lime-50 dark:hover:bg-lime-900/20 transition-colors dark:border-border"
                          onClick={() => handleView(invoice.id)}
                          data-testid={`invoice-row-${invoice.id}`}
                        >
                          <TableCell className="font-medium dark:text-white">{invoice.number}</TableCell>
                          <TableCell className="dark:text-gray-300">{invoice.clientName}</TableCell>
                          <TableCell className="dark:text-gray-300">{invoice.date}</TableCell>
                          <TableCell className="dark:text-gray-300">{invoice.dueDate}</TableCell>
                          <TableCell className="font-semibold dark:text-white">${invoice.total.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {/* Solo mostrar estado para facturas, no para cotizaciones */}
                            {!invoice.number?.startsWith('COT') && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <Badge className={getStatusColor(invoice.status) + " cursor-pointer"}>
                                      {invoice.status === 'paid' ? t('status.paid') : 
                                       invoice.status === 'pending' ? t('status.pending') : 
                                       t('status.overdue')}
                                    </Badge>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>{t('status.changeStatus')}</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'pending')}>
                                    <Clock className="w-4 h-4 mr-2 text-yellow-600" />
                                    {t('status.pending')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'paid')}>
                                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                    {t('status.paid')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'overdue')}>
                                    <XCircle className="w-4 h-4 mr-2 text-red-600" />
                                    {t('status.overdue')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-3">
                              <Button 
                                variant="outline" 
                                size="default"
                                className="rounded-xl border-gray-200 dark:border-gray-600 bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted px-4 py-2 font-medium"
                                onClick={() => handleDownloadPDF(invoice.id)}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                {t('dashboard.downloadPdf')}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="default"
                                className="rounded-xl border-gray-200 dark:border-gray-600 bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted px-4 py-2 font-medium"
                                onClick={(event) => handleCopyInvoice(invoice.id, event)}
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                {t('dashboard.copy')}
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="default"
                                    className="rounded-xl border-gray-200 dark:border-gray-600 bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted px-4 py-2 font-medium"
                                  >
                                    <Share2 className="w-4 h-4 mr-2" />
                                    {t('dashboard.share')}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleShareWhatsApp(invoice.id)}>
                                    <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
                                    WhatsApp
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleShareEmail(invoice)}>
                                    <Mail className="w-4 h-4 mr-2 text-blue-600" />
                                    Correo Electrónico
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="Eliminar" 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={(event) => handleDelete(invoice.id, event)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar factura?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La factura será eliminada permanentemente de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden PDF Preview for generating PDFs - Fixed width container for consistent rendering */}
      {pdfInvoice && (
        <div style={{ 
          position: 'absolute', 
          left: '-9999px', 
          top: 0,
          width: '794px' // A4 width at 96 DPI for consistent PDF generation
        }}>
          <div ref={pdfPreviewRef} style={{ width: '100%' }}>
            <InvoicePreview 
              invoice={{
                ...pdfInvoice,
                from: pdfInvoice.fromAddress || pdfInvoice.from,
                to: pdfInvoice.toAddress || pdfInvoice.to,
                items: pdfInvoice.items || []
              }} 
              template={getTemplateById(pdfInvoice.template || 1)} 
            />
          </div>
        </div>
      )}

      {/* Botón flotante "Crear nueva factura" - Solo visible en móvil */}
      <Link to="/create" className="sm:hidden">
        <div 
          className="fixed bottom-4 left-4 z-[9998] flex items-center gap-2 bg-lime-500 hover:bg-lime-600 text-white font-semibold px-4 py-3 rounded-full shadow-lg transition-all"
          style={{ boxShadow: '0 4px 14px rgba(132, 204, 22, 0.4)' }}
        >
          <Plus className="w-5 h-5" />
          <span>Crear nueva factura</span>
        </div>
      </Link>
    </div>
  );
};

export default Dashboard;