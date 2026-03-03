import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { 
  ArrowLeft, 
  Users, 
  FileText, 
  DollarSign, 
  Crown,
  Loader2,
  ShieldAlert,
  TrendingUp,
  Calendar
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/signin');
        return;
      }

      // Check if user is admin
      const checkResponse = await fetch(`${API_URL}/api/admin/check`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!checkResponse.ok) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const checkData = await checkResponse.json();
      
      if (!checkData.isAdmin) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      // Load admin data
      await loadAdminData(token);
    } catch (error) {
      console.error('Error checking admin access:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async (token) => {
    try {
      // Load stats
      const statsResponse = await fetch(`${API_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Load users
      const usersResponse = await fetch(`${API_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSubscriptionBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-lime-500">Premium</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500">Trial</Badge>;
      default:
        return <Badge className="bg-gray-500">Gratis</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background">
        <Card className="p-8 max-w-md text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Acceso Denegado
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            No tienes permisos para acceder al panel de administración.
          </p>
          <Button onClick={() => navigate('/dashboard')} className="bg-lime-500 hover:bg-lime-600">
            Volver al Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      {/* Header */}
      <header className="bg-white dark:bg-card border-b border-gray-200 dark:border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-lime-500" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Panel de Administración
                </h1>
              </div>
            </div>
            <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">Factu</span>
              <span className="text-2xl font-bold text-white bg-lime-500 px-2 ml-1">Ya!</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Card className="p-4 dark:bg-card">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Usuarios</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 dark:bg-card">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full">
                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Facturas</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalInvoices}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 dark:bg-card">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ingresos</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {stats.totalRevenue.toLocaleString('es-CO')}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 dark:bg-card">
              <div className="flex items-center gap-3">
                <div className="bg-lime-100 dark:bg-lime-900/30 p-2 rounded-full">
                  <Crown className="w-5 h-5 text-lime-600 dark:text-lime-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Premium</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.premiumUsers}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 dark:bg-card">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full">
                  <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Usuarios/Mes</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.usersThisMonth}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 dark:bg-card">
              <div className="flex items-center gap-3">
                <div className="bg-cyan-100 dark:bg-cyan-900/30 p-2 rounded-full">
                  <Calendar className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Fact./Mes</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.invoicesThisMonth}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Users Table */}
        <Card className="dark:bg-card">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Usuarios Registrados ({users.length})
            </h2>
            
            {users.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No hay usuarios registrados
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead>Facturas</TableHead>
                      <TableHead>Plan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user, index) => (
                      <TableRow key={user.id || index}>
                        <TableCell className="font-medium dark:text-white">
                          {user.email}
                        </TableCell>
                        <TableCell className="dark:text-gray-300">
                          {user.name || 'Sin nombre'}
                        </TableCell>
                        <TableCell className="dark:text-gray-300">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="dark:text-gray-300">
                          {user.invoiceCount}
                        </TableCell>
                        <TableCell>
                          {getSubscriptionBadge(user.subscriptionStatus)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;
