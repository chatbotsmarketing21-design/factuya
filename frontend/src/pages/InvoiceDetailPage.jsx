import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { invoiceAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import InvoicePreview from '../components/InvoicePreview';
import { getTemplateById } from '../mock/invoiceData';
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
  ArrowLeft, 
  FileEdit, 
  Download, 
  Share2, 
  Copy, 
  CheckCircle, 
  Trash2,
  MessageCircle,
  Mail,
  Loader2,
  DollarSign
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const InvoiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [addingPayment, setAddingPayment] = useState(false);
  const pdfPreviewRef = useRef(null);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoiceAPI.getById(id);
      setInvoice(response.data);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500';
      case 'partial':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'overdue':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid':
        return t('status.paid');
      case 'partial':
        return t('status.partial');
      case 'pending':
        return t('status.pending');
      case 'overdue':
        return t('status.overdue');
      default:
        return 'Borrador';
    }
  };

  const handleEdit = () => {
    navigate(`/create?id=${id}`);
  };

  const handleCopy = async () => {
    try {
      navigate('/create', {
        state: {
          copyFrom: {
            to: invoice.to || invoice.toAddress,
            items: invoice.items,
            notes: invoice.notes,
            terms: invoice.terms,
            template: invoice.template
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

  const handleTogglePaidStatus = async () => {
    try {
      const newStatus = invoice.status === 'paid' ? 'pending' : 'paid';
      
      await invoiceAPI.update(id, {
        ...invoice,
        status: newStatus
      });
      
      setInvoice(prev => ({ ...prev, status: newStatus }));
      
      toast({
        title: "Estado actualizado",
        description: newStatus === 'paid' 
          ? "La factura ha sido marcada como pagada"
          : "La factura ha sido marcada como pendiente",
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    try {
      await invoiceAPI.delete(id);
      toast({
        title: "Eliminada",
        description: "La factura ha sido eliminada",
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la factura",
        variant: "destructive"
      });
    }
    setDeleteDialogOpen(false);
  };

  const generatePdf = async () => {
    return new Promise(async (resolve, reject) => {
      try {
        setGeneratingPdf(true);
        
        // Create a temporary hidden container for clean PDF render
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '794px';
        tempContainer.style.backgroundColor = '#ffffff';
        tempContainer.className = 'light'; // Force light mode for PDF
        document.body.appendChild(tempContainer);

        const { createRoot } = await import('react-dom/client');
        const React = await import('react');
        const { default: InvoicePreviewComponent } = await import('../components/InvoicePreview');
        
        const root = createRoot(tempContainer);
        
        await new Promise((resolveRender) => {
          root.render(
            React.createElement(InvoicePreviewComponent, {
              invoice: {
                ...invoice,
                from: invoice.fromAddress || invoice.from,
                to: invoice.toAddress || invoice.to,
                items: invoice.items || []
              },
              template: getTemplateById(invoice.template || 1),
              templateColor: invoice.templateColor
            })
          );
          setTimeout(resolveRender, 500);
        });

        const canvas = await html2canvas(tempContainer, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          windowWidth: 794
        });

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

  const handleDownloadPdf = async () => {
    try {
      toast({
        title: "Generando PDF...",
        description: "Por favor espera un momento",
      });
      
      const pdf = await generatePdf();
      const invoiceNumber = invoice.invoiceNumber || invoice.number || 'documento';
      const clientName = invoice.clientName || invoice.to?.name || invoice.toAddress?.name || 'cliente';
      
      // Open in new tab for mobile viewing
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');

      toast({
        title: "PDF Listo",
        description: "El PDF se ha abierto para visualizar",
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

  const handleShareWhatsApp = async () => {
    try {
      toast({
        title: "Preparando PDF...",
        description: "Generando factura para compartir",
      });

      const pdf = await generatePdf();
      
      const invoiceNumber = invoice.invoiceNumber || invoice.number || 'factura';
      const clientName = invoice.clientName || invoice.to?.name || invoice.toAddress?.name || 'Cliente';
      const total = invoice.total?.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0';
      const phone = invoice.to?.phone || invoice.toAddress?.phone || '';
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Mobile: Use Web Share API
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], `${invoiceNumber}_${clientName}.pdf`, { type: 'application/pdf' });
      
      const shareData = {
        title: `Factura ${invoiceNumber}`,
        text: `Hola ${clientName}, le comparto su factura N° ${invoiceNumber} por un total de $${total}.\n\n¡Gracias por su preferencia!\n- FactuYa!`,
        files: [pdfFile]
      };
      
      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({
          title: "Compartido",
          description: "El PDF se ha compartido exitosamente",
        });
      } else {
        // Fallback: Open WhatsApp with message
        const message = `Hola ${clientName}, le comparto su factura N° ${invoiceNumber} por un total de $${total}.\n\n¡Gracias por su preferencia!\n- FactuYa!`;
        const whatsappUrl = cleanPhone 
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
          : `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Error sharing via WhatsApp:', error);
      toast({
        title: "Error",
        description: "No se pudo compartir la factura",
        variant: "destructive"
      });
    }
  };

  const handleShareEmail = () => {
    const clientName = invoice.to?.name || invoice.toAddress?.name || 'Cliente';
    const clientEmail = invoice.to?.email || invoice.toAddress?.email || '';
    const invoiceNumber = invoice.invoiceNumber || invoice.number || 'S/N';
    const total = invoice.total?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';
    
    const subject = encodeURIComponent(`Factura N° ${invoiceNumber} - FactuYa!`);
    const body = encodeURIComponent(`Hola ${clientName},\n\nLe comparto su factura N° ${invoiceNumber} por un total de $${total}.\n\n¡Gracias por su preferencia!\n\nAtentamente,\nFactuYa!`);
    
    window.location.href = `mailto:${clientEmail}?subject=${subject}&body=${body}`;
    
    toast({
      title: "Correo abierto",
      description: "Se ha abierto tu cliente de correo",
    });
  };

  // Función para abrir el modal de abono
  const openPaymentDialog = () => {
    setPaymentAmount('');
    setPaymentNote('');
    setPaymentDialogOpen(true);
  };

  // Función para agregar un abono
  const handleAddPayment = async () => {
    if (!paymentAmount) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Ingresa un monto válido",
        variant: "destructive"
      });
      return;
    }
    
    setAddingPayment(true);
    try {
      await invoiceAPI.addPayment(id, {
        amount: amount,
        note: paymentNote || null
      });
      
      toast({
        title: t('payments.paymentAdded'),
        description: `Abono de $${amount.toLocaleString()} registrado`,
      });
      
      setPaymentDialogOpen(false);
      loadInvoice(); // Recargar datos de la factura
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar el abono",
        variant: "destructive"
      });
    } finally {
      setAddingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const template = getTemplateById(invoice.template || 1);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-background">
      {/* Header */}
      <header className="bg-white dark:bg-card border-b border-gray-200 dark:border-border sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/dashboard')}
                data-testid="back-button"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-bold text-gray-900 dark:text-white">
                  {invoice.number}
                </h1>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(invoice.status)}`} />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {getStatusText(invoice.status)}
                  </span>
                </div>
              </div>
            </div>
            <Link to="/dashboard">
              <div className="flex items-center">
                <span className="text-lg font-bold text-gray-900 dark:text-white">Factu</span>
                <span className="text-lg font-bold text-white bg-lime-500 px-1.5 ml-1">Ya!</span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Action Buttons - List style like Invoice Home */}
      <div className="px-4 pt-4 pb-4">
        <div className="bg-white dark:bg-card rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
          {/* 1. Eliminar */}
          <button 
            className="w-full flex items-center px-4 py-4 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-b border-gray-100 dark:border-gray-700"
            onClick={() => setDeleteDialogOpen(true)}
            data-testid="delete-button"
          >
            <Trash2 className="w-5 h-5 text-red-500" />
            <span className="ml-4 text-red-500 font-medium">Eliminar</span>
          </button>

          {/* 2. Editar */}
          <button 
            className="w-full flex items-center px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700"
            onClick={handleEdit}
            data-testid="edit-button"
          >
            <FileEdit className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="ml-4 text-gray-900 dark:text-white font-medium">Editar</span>
          </button>

          {/* 3. Descargar PDF */}
          <button 
            className="w-full flex items-center px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700"
            onClick={handleDownloadPdf}
            disabled={generatingPdf}
            data-testid="download-button"
          >
            {generatingPdf ? (
              <Loader2 className="w-5 h-5 text-gray-600 dark:text-gray-400 animate-spin" />
            ) : (
              <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
            <span className="ml-4 text-gray-900 dark:text-white font-medium">Descargar PDF</span>
          </button>

          {/* 4. Copiar Factura */}
          <button 
            className="w-full flex items-center px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700"
            onClick={handleCopy}
            data-testid="copy-button"
          >
            <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="ml-4 text-gray-900 dark:text-white font-medium">Copiar Factura</span>
          </button>

          {/* 5. Agregar Abono - Solo para facturas (no cotizaciones) */}
          {!invoice.number?.startsWith('COT') && (
            <button 
              className="w-full flex items-center px-4 py-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-100 dark:border-gray-700"
              onClick={openPaymentDialog}
              data-testid="add-payment-button"
            >
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="ml-4 text-blue-600 font-medium">{t('payments.addPayment')}</span>
              {invoice.totalPaid > 0 && (
                <span className="ml-auto text-sm text-blue-500">
                  Saldo: ${(invoice.total - invoice.totalPaid)?.toLocaleString()}
                </span>
              )}
            </button>
          )}

          {/* 6. Toggle Paid Status - Show for all invoices except quotations */}
          {!invoice.number?.startsWith('COT') && (
            <button 
              className="w-full flex items-center px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700"
              onClick={handleTogglePaidStatus}
              data-testid="toggle-paid-button"
            >
              {invoice.status === 'paid' ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-4 text-gray-900 dark:text-white font-medium">Marcar como no pagada</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="ml-4 text-gray-900 dark:text-white font-medium">Marcar como Pagada</span>
                </>
              )}
            </button>
          )}

          {/* 7. Correo */}
          <button 
            className="w-full flex items-center px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700"
            onClick={handleShareEmail}
            data-testid="email-button"
          >
            <Mail className="w-5 h-5 text-blue-600" />
            <span className="ml-4 text-gray-900 dark:text-white font-medium">Correo</span>
          </button>

          {/* 8. WhatsApp */}
          <button 
            className="w-full flex items-center px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={handleShareWhatsApp}
            disabled={generatingPdf}
            data-testid="whatsapp-button"
          >
            <MessageCircle className="w-5 h-5 text-green-600" />
            <span className="ml-4 text-gray-900 dark:text-white font-medium">WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Invoice Preview - Same style as InvoiceCreator */}
      <div className="px-4 pb-8">
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer active:opacity-90 transition-colors shadow-sm border border-gray-200 dark:border-gray-700"
          onClick={handleDownloadPdf}
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
                className="bg-white" 
                style={{ width: '794px' }}
              >
                <InvoicePreview 
                  invoice={{
                    ...invoice,
                    from: invoice.fromAddress || invoice.from,
                    to: invoice.toAddress || invoice.to,
                    items: invoice.items || []
                  }} 
                  template={template}
                  templateColor={invoice.templateColor}
                />
              </div>
            </div>
          </div>
          {/* Message inside the card */}
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 py-2 px-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            Toca para descargar PDF
          </p>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar factura?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La factura será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Abono */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              {t('payments.addPayment')}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="font-medium">{invoice?.to?.name || invoice?.toAddress?.name}</p>
                <p className="text-sm text-gray-500">
                  {invoice?.number} - Total: ${invoice?.total?.toLocaleString()}
                </p>
                {invoice?.totalPaid > 0 && (
                  <p className="text-sm text-blue-600 mt-1">
                    {t('payments.totalPaid')}: ${invoice?.totalPaid?.toLocaleString()} | 
                    {t('payments.balance')}: ${(invoice?.total - invoice?.totalPaid)?.toLocaleString()}
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="paymentAmount">{t('payments.amount')} *</Label>
              <Input
                id="paymentAmount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={t('payments.enterAmount')}
                className="mt-1"
                min="0"
                step="1000"
              />
            </div>
            <div>
              <Label htmlFor="paymentNote">{t('payments.note')} ({t('payments.optional')})</Label>
              <Textarea
                id="paymentNote"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Ej: Transferencia Bancolombia, Efectivo..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddPayment} 
              disabled={addingPayment || !paymentAmount}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {addingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Registrar Abono
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Exit Button - Same style as Save button in InvoiceCreator */}
      <div className="fixed bottom-4 right-4 z-[100]">
        <Button 
          data-testid="exit-button"
          onClick={() => navigate('/dashboard')}
          className="bg-lime-500 hover:bg-lime-600 text-white h-12 px-6 rounded-full shadow-lg"
          style={{ boxShadow: '0 4px 14px rgba(132, 204, 22, 0.4)' }}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Salir
        </Button>
      </div>
    </div>
  );
};

export default InvoiceDetailPage;
