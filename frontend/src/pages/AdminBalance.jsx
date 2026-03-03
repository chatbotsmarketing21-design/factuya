import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  ArrowLeft, 
  Loader2,
  ShieldAlert,
  DollarSign,
  TrendingUp
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const AdminBalance = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [balanceData, setBalanceData] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadBalanceData(selectedYear);
    }
  }, [isAdmin, selectedYear]);

  const checkAdminAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/signin');
        return;
      }

      const checkResponse = await fetch(`${API_URL}/api/admin/check`, {
        headers: { 'Authorization': `Bearer ${token}` }
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

      // Load available years
      const yearsResponse = await fetch(`${API_URL}/api/admin/balance/years`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (yearsResponse.ok) {
        const yearsData = await yearsResponse.json();
        setAvailableYears(yearsData.years);
      }

    } catch (error) {
      console.error('Error checking admin access:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const loadBalanceData = async (year) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/balance?year=${year}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBalanceData(data);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
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
            No tienes permisos para acceder a esta página.
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
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div className="flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-lime-500" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Balance de Ingresos
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
        {/* Year Selector */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Ingresos Mensuales
          </h2>
          <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Balance Table */}
        <Card className="dark:bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800">
                <TableHead className="font-bold">Mes</TableHead>
                <TableHead className="text-center font-bold">Nuevos</TableHead>
                <TableHead className="text-center font-bold">Renovaciones</TableHead>
                <TableHead className="text-right font-bold">Ingresos Nuevos</TableHead>
                <TableHead className="text-right font-bold">Ingresos Renovación</TableHead>
                <TableHead className="text-right font-bold text-green-600 dark:text-green-400">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balanceData?.months.map((month, index) => (
                <TableRow key={month.month} className={index % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-gray-50 dark:bg-gray-800/50'}>
                  <TableCell className="font-medium dark:text-white">
                    {MONTH_NAMES[month.month - 1]}
                  </TableCell>
                  <TableCell className="text-center dark:text-gray-300">
                    {month.newPremium}
                  </TableCell>
                  <TableCell className="text-center dark:text-gray-300">
                    {month.renewals}
                  </TableCell>
                  <TableCell className="text-right dark:text-gray-300">
                    ${month.newRevenue} USD
                  </TableCell>
                  <TableCell className="text-right dark:text-gray-300">
                    ${month.renewalRevenue} USD
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                    ${month.totalRevenue} USD
                  </TableCell>
                </TableRow>
              ))}
              {/* Total Row */}
              <TableRow className="bg-lime-50 dark:bg-lime-900/20 border-t-2 border-lime-500">
                <TableCell className="font-bold text-lg dark:text-white">
                  TOTAL {selectedYear}
                </TableCell>
                <TableCell className="text-center font-bold dark:text-white">
                  {balanceData?.months.reduce((sum, m) => sum + m.newPremium, 0)}
                </TableCell>
                <TableCell className="text-center font-bold dark:text-white">
                  {balanceData?.months.reduce((sum, m) => sum + m.renewals, 0)}
                </TableCell>
                <TableCell className="text-right font-bold dark:text-white">
                  ${balanceData?.months.reduce((sum, m) => sum + m.newRevenue, 0)} USD
                </TableCell>
                <TableCell className="text-right font-bold dark:text-white">
                  ${balanceData?.months.reduce((sum, m) => sum + m.renewalRevenue, 0)} USD
                </TableCell>
                <TableCell className="text-right font-bold text-xl text-green-600 dark:text-green-400">
                  ${balanceData?.yearTotal} USD
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>

        {/* Summary Card */}
        {balanceData && (
          <Card className="mt-6 p-6 dark:bg-card">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-lime-500" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Resumen {selectedYear}
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Nuevos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {balanceData.months.reduce((sum, m) => sum + m.newPremium, 0)}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Renovaciones</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {balanceData.months.reduce((sum, m) => sum + m.renewals, 0)}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Ingresos Nuevos</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${balanceData.months.reduce((sum, m) => sum + m.newRevenue, 0)} USD
                </p>
              </div>
              <div className="text-center p-4 bg-lime-100 dark:bg-lime-900/30 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Ingresos Totales</p>
                <p className="text-2xl font-bold text-lime-600 dark:text-lime-400">
                  ${balanceData.yearTotal} USD
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminBalance;
