import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { invoiceAPI } from '../services/api';
import { subscriptionAPI } from '../services/subscriptionApi';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import LanguageSwitcher from '../components/LanguageSwitcher';
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
import { Plus, Search, Download, Send, Trash2, FileText, LogOut, CheckCircle, Clock, XCircle, FileEdit, Loader2, CreditCard, Settings, User, Key, Sun, Moon, Share2, MessageCircle, Mail, Copy } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';
import InvoicePreview from '../components/InvoicePreview';
import { getTemplateById } from '../mock/invoiceData';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(null); // null = all, 'paid' = pagadas, 'pending' = pendientes
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [pdfInvoice, setPdfInvoice] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const pdfPreviewRef = useRef(null);
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
    toast({
      title: newMode ? "Modo Oscuro Activado" : "Modo Claro Activado",
      description: `El tema ha sido cambiado a modo ${newMode ? 'oscuro' : 'claro'}`,
    });
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
      
      toast({
        title: "¡Estado Actualizado!",
        description: `La factura ahora está marcada como ${newStatus === 'paid' ? 'Pagada' : newStatus === 'pending' ? 'Pendiente' : newStatus === 'overdue' ? 'Vencida' : 'Borrador'}`,
      });
      
      // Recargar datos
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
    return new Promise((resolve, reject) => {
      // Set the invoice for PDF preview
      setPdfInvoice(invoice);
      setGeneratingPdf(true);
      
      // Wait for the preview to render
      setTimeout(async () => {
        try {
          if (!pdfPreviewRef.current) {
            throw new Error("PDF preview not ready");
          }
          
          // Capture the preview as image with high quality (same as InvoiceCreator)
          const canvas = await html2canvas(pdfPreviewRef.current, {
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
            // Multiple pages - slice the canvas vertically (identical to InvoiceCreator)
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
          
          setGeneratingPdf(false);
          setPdfInvoice(null);
          
          resolve(pdf);
        } catch (error) {
          setGeneratingPdf(false);
          setPdfInvoice(null);
          reject(error);
        }
      }, 800);
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
    try {
      toast({
        title: "Preparando PDF...",
        description: "Generando factura para compartir",
      });

      // Load full invoice data
      const response = await invoiceAPI.getById(invoiceId);
      const invoice = response.data;

      // Generate PDF
      const pdf = await generatePdfFromInvoice(invoice);
      
      // Get invoice details for message
      const invoiceNumber = invoice.invoiceNumber || invoice.number || 'factura';
      const clientName = invoice.clientName || invoice.to?.name || invoice.toAddress?.name || 'Cliente';
      const total = invoice.total?.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0';
      const phone = invoice.to?.phone || invoice.toAddress?.phone || '';
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Check if device supports Web Share API with files (usually mobile)
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const canShareFiles = navigator.canShare && navigator.canShare({ files: [new File([], 'test.pdf', { type: 'application/pdf' })] });
      
      if (isMobile && canShareFiles) {
        // MOBILE: Share PDF directly as file attachment
        const pdfBlob = pdf.output('blob');
        const pdfFile = new File([pdfBlob], `Factura_${invoiceNumber}_${clientName}.pdf`, { type: 'application/pdf' });
        
        const shareData = {
          title: `Factura ${invoiceNumber}`,
          text: `Hola ${clientName}, le comparto su factura N° ${invoiceNumber} por un total de $${total}.\n\n¡Gracias por su preferencia!\n- FactuYa!`,
          files: [pdfFile]
        };
        
        await navigator.share(shareData);
        
        toast({
          title: "¡Compartido!",
          description: "El PDF se ha compartido exitosamente",
        });
      } else {
        // DESKTOP: Download PDF + Open WhatsApp with message
        // 1. Download PDF automatically
        const fileName = `Factura_${invoiceNumber}_${clientName}.pdf`;
        pdf.save(fileName);
        
        // 2. Prepare WhatsApp message (without link)
        const message = `Hola ${clientName}, le comparto su factura N° ${invoiceNumber} por un total de $${total}.\n\n📎 *El PDF está adjunto o descargado en su computador*\n\n¡Gracias por su preferencia!\n- FactuYa!`;
        const encodedMessage = encodeURIComponent(message);
        
        const whatsappUrl = cleanPhone 
          ? `https://wa.me/${cleanPhone}?text=${encodedMessage}`
          : `https://wa.me/?text=${encodedMessage}`;
        
        // Small delay to ensure PDF download starts first
        setTimeout(() => {
          window.open(whatsappUrl, '_blank');
        }, 500);
        
        toast({
          title: "¡PDF Descargado!",
          description: "Adjunta el PDF descargado en la conversación de WhatsApp",
        });
      }
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      
      // If share was cancelled by user, don't show error
      if (error.name === 'AbortError') {
        return;
      }
      
      toast({
        title: "Error",
        description: "No se pudo preparar el PDF para compartir",
        variant: "destructive"
      });
    }
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
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
      <header className="bg-white dark:bg-card border-b border-gray-200 dark:border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <div className="flex items-center cursor-pointer">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">Factu</span>
                  <span className="text-2xl font-bold text-white bg-lime-500 px-2 ml-1">Ya!</span>
                </div>
              </Link>
              {user && (
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {user.gender === 'female' ? t('common.welcomeFemale') : t('common.welcomeMale')}, {user.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Link to="/create">
                <Button className="bg-lime-500 hover:bg-lime-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('dashboard.newInvoice')}
                </Button>
              </Link>
              
              {/* Configuración Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    {t('settings.title')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{t('settings.myAccount')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="w-4 h-4 mr-2" />
                    {t('settings.profile')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/subscription')}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    {t('settings.subscription')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/change-password')}>
                    <Key className="w-4 h-4 mr-2" />
                    {t('settings.changePassword')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{t('settings.appearance')}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={toggleDarkMode}>
                    {darkMode ? (
                      <>
                        <Sun className="w-4 h-4 mr-2" />
                        {t('settings.lightMode')}
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4 mr-2" />
                        {t('settings.darkMode')}
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('settings.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6 dark:bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.totalRevenue')}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">${stats.totalRevenue.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>
            <Card 
              className="p-6 dark:bg-card cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setStatusFilter(null)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.totalInvoices')}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalInvoices}</p>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full">
                  <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>
            <Card 
              className={`p-6 dark:bg-card cursor-pointer hover:shadow-lg transition-all ${statusFilter === 'paid' ? 'ring-2 ring-green-500 shadow-lg' : ''}`}
              onClick={() => handleStatusFilterClick('paid')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.paid')}</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.paidInvoices}</p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                  <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>
            <Card 
              className={`p-6 dark:bg-card cursor-pointer hover:shadow-lg transition-all ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500 shadow-lg' : ''}`}
              onClick={() => handleStatusFilterClick('pending')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.pending')}</p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">{stats.pendingInvoices}</p>
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-full">
                  <FileText className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Search and Filter */}
        <Card className="p-6 mb-6 dark:bg-card">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder={t('dashboard.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </Card>

        {/* Invoices Table */}
        <Card className="dark:bg-card">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('dashboard.allInvoices')}</h2>
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">{t('dashboard.noInvoices')}</p>
                <p className="text-gray-500 dark:text-gray-400 mb-4">{t('dashboard.createFirst')}</p>
                <Link to="/create">
                  <Button className="bg-lime-500 hover:bg-lime-600 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Factura
                  </Button>
                </Link>
              </div>
            ) : (
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
                            Descargar PDF
                          </Button>
                          <Button 
                            variant="outline" 
                            size="default"
                            className="rounded-xl border-gray-200 dark:border-gray-600 bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted px-4 py-2 font-medium"
                            onClick={(event) => handleCopyInvoice(invoice.id, event)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="default"
                                className="rounded-xl border-gray-200 dark:border-gray-600 bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted px-4 py-2 font-medium"
                              >
                                <Share2 className="w-4 h-4 mr-2" />
                                Compartir
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
    </div>
  );
};

export default Dashboard;