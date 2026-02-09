import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { invoiceAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Plus, Search, Eye, Download, Send, Edit, Trash2, FileText, LogOut } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { logout, user } = useAuth();

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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) {
      return;
    }

    try {
      await invoiceAPI.delete(id);
      toast({
        title: "Success",
        description: "Invoice deleted successfully"
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive"
      });
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <div className="flex items-center cursor-pointer">
                  <span className="text-2xl font-bold text-gray-900">invoice </span>
                  <span className="text-2xl font-bold text-yellow-400 bg-yellow-400 text-gray-900 px-2 ml-1">home</span>
                </div>
              </Link>
              {user && (
                <span className="text-sm text-gray-600">Welcome, {user.name}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link to="/create">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Invoice
                </Button>
              </Link>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
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
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">${stats.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Invoices</p>
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
                  <p className="text-sm text-gray-600">Paid</p>
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
                  <p className="text-sm text-gray-600">Pending</p>
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
                placeholder="Search invoices by client name or number..."
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">All Invoices</h2>
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-600 mb-2">No invoices yet</p>
                <p className="text-gray-500 mb-4">Create your first invoice to get started</p>
                <Link to="/create">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.number}</TableCell>
                      <TableCell>{invoice.clientName}</TableCell>
                      <TableCell>{invoice.date}</TableCell>
                      <TableCell>{invoice.dueDate}</TableCell>
                      <TableCell className="font-semibold">${invoice.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" title="View">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Edit">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Download">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Send">
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Delete" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(invoice.id)}
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
    </div>
  );
};

export default Dashboard;