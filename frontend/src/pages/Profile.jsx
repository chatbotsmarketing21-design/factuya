import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { ArrowLeft, User, Building, Mail, Phone, MapPin, Save, Loader2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    companyInfo: {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    }
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/me');
      setProfile({
        name: response.data.name || '',
        email: response.data.email || '',
        companyInfo: response.data.companyInfo || {
          name: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zip: '',
          country: ''
        }
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el perfil",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('company.')) {
      const field = name.replace('company.', '');
      setProfile(prev => ({
        ...prev,
        companyInfo: {
          ...prev.companyInfo,
          [field]: value
        }
      }));
    } else {
      setProfile(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/profile', profile);
      toast({
        title: "Perfil Actualizado",
        description: "Tu información ha sido guardada correctamente",
      });
      if (updateUser) {
        updateUser({ ...user, name: profile.name });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el perfil",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mi Perfil</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          {/* Personal Info */}
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-lime-600" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Información Personal</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="mt-1 bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">El email no se puede cambiar</p>
              </div>
            </div>
          </Card>

          {/* Company Info */}
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <Building className="w-5 h-5 text-lime-600" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Información de la Empresa</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company.name">Nombre de la Empresa</Label>
                <Input
                  id="company.name"
                  name="company.name"
                  value={profile.companyInfo.name}
                  onChange={handleChange}
                  placeholder="Mi Empresa S.A.S"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="company.email">Email de la Empresa</Label>
                <Input
                  id="company.email"
                  name="company.email"
                  type="email"
                  value={profile.companyInfo.email}
                  onChange={handleChange}
                  placeholder="contacto@miempresa.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="company.phone">Teléfono</Label>
                <Input
                  id="company.phone"
                  name="company.phone"
                  value={profile.companyInfo.phone}
                  onChange={handleChange}
                  placeholder="+57 300 123 4567"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="company.address">Dirección</Label>
                <Input
                  id="company.address"
                  name="company.address"
                  value={profile.companyInfo.address}
                  onChange={handleChange}
                  placeholder="Calle 123 # 45-67"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="company.city">Ciudad</Label>
                <Input
                  id="company.city"
                  name="company.city"
                  value={profile.companyInfo.city}
                  onChange={handleChange}
                  placeholder="Medellín"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="company.state">Departamento/Estado</Label>
                <Input
                  id="company.state"
                  name="company.state"
                  value={profile.companyInfo.state}
                  onChange={handleChange}
                  placeholder="Antioquia"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="company.zip">Código Postal</Label>
                <Input
                  id="company.zip"
                  name="company.zip"
                  value={profile.companyInfo.zip}
                  onChange={handleChange}
                  placeholder="050001"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="company.country">País</Label>
                <Input
                  id="company.country"
                  name="company.country"
                  value={profile.companyInfo.country}
                  onChange={handleChange}
                  placeholder="Colombia"
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              type="submit" 
              className="bg-lime-500 hover:bg-lime-600 text-white"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
