import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { invoiceAPI } from '../services/api';
import { ArrowLeft, Copy, CreditCard, Clock, Download, Share2, Edit, MessageCircle, Mail, ChevronRight } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import InvoicePreview from '../components/InvoicePreview';
import { getTemplateById } from '../mock/invoiceData';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const invoicePreviewRef = useRef(null);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoiceAPI.getById(id);
      setInvoice(response.data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
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

  const handleCopy = async () => {
    try {
      const response = await invoiceAPI.duplicate(id);
      toast({
        title: "Factura duplicada",
        description: `Se creó la factura ${response.data.number}`,
      });
      navigate(`/invoice/${response.data.id}`);
    } catch (error) {
      console.error('Error duplicating invoice:', error);
      toast({
        title: "Error",
        description: "No se pudo duplicar la factura",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async () => {
    try {
      setGeneratingPdf(true);
      toast({
        title: "Generando PDF...",
        description: "Por favor espera un momento",
      });

      // Crear un contenedor temporal
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '794px';
      tempContainer.style.backgroundColor = '#ffffff';
      document.body.appendChild(tempContainer);

      const { createRoot } = await import('react-dom/client');
      const React = await import('react');
      const { default: InvoicePreviewComponent } = await import('../components/InvoicePreview');
      
      const root = createRoot(tempContainer);
      
      const invoiceData = {
        ...invoice,
        number: invoice.number,
        date: invoice.date,
        dueDate: invoice.dueDate,
        from: invoice.fromAddress || invoice.from,
        to: invoice.toAddress || invoice.to,
        items: invoice.items || [],
        notes: invoice.notes,
        terms: invoice.terms,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        total: invoice.total,
        signature: invoice.signature,
        signatureRotation: invoice.signatureRotation,
        documentType: invoice.documentType || 'invoice'
      };

      await new Promise((resolve) => {
        root.render(
          React.createElement(InvoicePreviewComponent, {
            invoice: invoiceData,
            template: getTemplateById(invoice.template || 1),
            companyInfo: invoice.fromAddress || invoice.from,
            templateColor: invoice.templateColor
          })
        );
        setTimeout(resolve, 500);
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
      
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');

      toast({
        title: "¡PDF Listo!",
        description: "El PDF se ha abierto para visualizar",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive"
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    await handleDownload();
    const message = `Factura ${invoice.number} - ${invoice.clientName || invoice.to?.name} - Total: $${invoice.total?.toLocaleString('es-CO')} COP`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setShowShareOptions(false);
  };

  const handleShareEmail = () => {
    const subject = `Factura ${invoice.number}`;
    const body = `Adjunto la factura ${invoice.number} por un total de $${invoice.total?.toLocaleString('es-CO')} COP.`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setShowShareOptions(false);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await invoiceAPI.updateStatus(id, newStatus);
      setInvoice({ ...invoice, status: newStatus });
      toast({
        title: "Estado actualizado",
        description: newStatus === 'paid' ? "Marcada como pagada" : "Marcada como pendiente",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando factura...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const getStatusInfo = () => {
    switch (invoice.status) {
      case 'paid':
        return { text: 'Pagado', color: 'text-green-600', bg: 'bg-green-500' };
      case 'pending':
        return { text: 'No pagado', color: 'text-yellow-600', bg: 'bg-yellow-500' };
      case 'overdue':
        return { text: 'Vencido', color: 'text-red-600', bg: 'bg-red-500' };
      default:
        return { text: 'Pendiente', color: 'text-gray-600', bg: 'bg-gray-500' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header azul */}
      <header className="bg-blue-800 text-white">
        <div className="flex items-center px-4 py-4">
          <button onClick={() => navigate('/dashboard')} className="mr-4">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">{invoice.number}</h1>
        </div>
      </header>

      {/* Action List */}
      <div className="bg-white dark:bg-gray-800">
        {/* Copiar */}
        <button 
          onClick={handleCopy}
          className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-4">
            <Copy className="w-6 h-6 text-gray-500" />
            <span className="text-lg text-gray-900 dark:text-white">Copiar</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Pago en línea / Estado */}
        <button 
          onClick={() => handleStatusChange(invoice.status === 'paid' ? 'pending' : 'paid')}
          className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className={`w-6 h-6 rounded-full ${statusInfo.bg}`}></div>
            <span className="text-lg text-gray-900 dark:text-white">Estado de pago</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${statusInfo.color}`}>{statusInfo.text}</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </button>

        {/* Descargar */}
        <button 
          onClick={handleDownload}
          disabled={generatingPdf}
          className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-4">
            <Download className="w-6 h-6 text-blue-500" />
            <span className="text-lg text-gray-900 dark:text-white">
              {generatingPdf ? 'Generando...' : 'Descargar'}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Compartir */}
        <div className="relative">
          <button 
            onClick={() => setShowShareOptions(!showShareOptions)}
            className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-4">
              <Share2 className="w-6 h-6 text-green-500" />
              <span className="text-lg text-gray-900 dark:text-white">Compartir</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          
          {/* Share submenu */}
          {showShareOptions && (
            <div className="bg-gray-50 dark:bg-gray-700">
              <button 
                onClick={handleShareWhatsApp}
                className="w-full flex items-center gap-4 px-8 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-green-600" />
                <span className="text-gray-700 dark:text-gray-300">WhatsApp</span>
              </button>
              <button 
                onClick={handleShareEmail}
                className="w-full flex items-center gap-4 px-8 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border-b border-gray-200 dark:border-gray-600"
              >
                <Mail className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700 dark:text-gray-300">Correo electrónico</span>
              </button>
            </div>
          )}
        </div>

        {/* Editar */}
        <Link 
          to={`/create?edit=${id}`}
          className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-4">
            <Edit className="w-6 h-6 text-orange-500" />
            <span className="text-lg text-gray-900 dark:text-white">Editar</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>
      </div>

      {/* Invoice Preview */}
      <div className="p-4">
        <div 
          className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer"
          onClick={handleDownload}
        >
          <div 
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
                <InvoicePreview 
                  invoice={{
                    ...invoice,
                    number: invoice.number,
                    date: invoice.date,
                    dueDate: invoice.dueDate,
                    from: invoice.fromAddress || invoice.from,
                    to: invoice.toAddress || invoice.to,
                    items: invoice.items || [],
                    notes: invoice.notes,
                    terms: invoice.terms,
                    subtotal: invoice.subtotal,
                    tax: invoice.tax,
                    total: invoice.total,
                    signature: invoice.signature,
                    signatureRotation: invoice.signatureRotation,
                    documentType: invoice.documentType || 'invoice'
                  }} 
                  template={getTemplateById(invoice.template || 1)} 
                  companyInfo={invoice.fromAddress || invoice.from}
                  templateColor={invoice.templateColor}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
