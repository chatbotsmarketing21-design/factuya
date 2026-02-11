import React, { useState, useEffect, useCallback } from 'react';
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
import { Plus, Search, Download, Send, Edit, Trash2, FileText, LogOut, CheckCircle, Clock, XCircle, FileEdit, Loader2, CreditCard, Settings, User, Key, Sun, Moon } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
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

  const handleDownloadPDF = async (invoiceId) => {
    toast({
      title: "Descargando...",
      description: "Generando tu factura en PDF",
    });
    
    // Simular descarga - en producción llamarías a la API
    setTimeout(() => {
      toast({
        title: "¡Descarga Completa!",
        description: "Tu factura PDF ha sido descargada",
      });
    }, 1500);
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

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.number.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-lime-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verificando tu pago...</h2>
          <p className="text-gray-600">Por favor espera un momento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <div className="flex items-center cursor-pointer">
                  <span className="text-2xl font-bold text-gray-900">Factu</span>
                  <span className="text-2xl font-bold text-white bg-lime-500 px-2 ml-1">Ya!</span>
                </div>
              </Link>
              {user && (
                <span className="text-sm text-gray-600">
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
                    Configuración
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="w-4 h-4 mr-2" />
                    Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/subscription')}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Mi Suscripción
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/change-password')}>
                    <Key className="w-4 h-4 mr-2" />
                    Cambiar Contraseña
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Apariencia</DropdownMenuLabel>
                  <DropdownMenuItem onClick={toggleDarkMode}>
                    {darkMode ? (
                      <>
                        <Sun className="w-4 h-4 mr-2" />
                        Modo Claro
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4 mr-2" />
                        Modo Oscuro
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
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
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('dashboard.totalRevenue')}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">${stats.totalRevenue.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('dashboard.totalInvoices')}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalInvoices}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('dashboard.paid')}</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.paidInvoices}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('dashboard.pending')}</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pendingInvoices}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <FileText className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Search and Filter */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar facturas por nombre de cliente o número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </Card>

        {/* Invoices Table */}
        <Card>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('dashboard.allInvoices')}</h2>
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-600 mb-2">{t('dashboard.noInvoices')}</p>
                <p className="text-gray-500 mb-4">{t('dashboard.createFirst')}</p>
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
                  <TableRow>
                    <TableHead>{t('table.invoiceNumber')}</TableHead>
                    <TableHead>{t('table.client')}</TableHead>
                    <TableHead>{t('table.date')}</TableHead>
                    <TableHead>{t('table.dueDate')}</TableHead>
                    <TableHead>{t('table.amount')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead className="text-right">{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow 
                      key={invoice.id}
                      className="cursor-pointer hover:bg-lime-50 transition-colors"
                      onClick={() => handleView(invoice.id)}
                      data-testid={`invoice-row-${invoice.id}`}
                    >
                      <TableCell className="font-medium">{invoice.number}</TableCell>
                      <TableCell>{invoice.clientName}</TableCell>
                      <TableCell>{invoice.date}</TableCell>
                      <TableCell>{invoice.dueDate}</TableCell>
                      <TableCell className="font-semibold">${invoice.total.toFixed(2)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
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
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Editar"
                            onClick={() => handleEdit(invoice.id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Descargar PDF"
                            onClick={() => handleDownloadPDF(invoice.id)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Enviar Email"
                            onClick={() => handleSendEmail(invoice)}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Eliminar" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
    </div>
  );
};

export default Dashboard;