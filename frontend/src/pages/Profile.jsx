import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { ArrowLeft, User, Building, Mail, Phone, MapPin, Save, Loader2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Profile = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    gender: '',
    companyInfo: {
      name: '',
      nit: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: '',
      bank: '',
      bankAccount: ''
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
        gender: response.data.gender || '',
        companyInfo: {
          name: '',
          nit: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zip: '',
          country: '',
          bank: '',
          bankAccount: '',
          ...response.data.companyInfo
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
        title: t('profile.updated'),
        description: t('profile.updatedDesc'),
      });
      if (updateUser) {
        updateUser({ ...user, name: profile.name, gender: profile.gender });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: t('messages.error'),
        description: t('profile.errorSaving'),
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
                {t('profile.back')}
              </Button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('profile.title')}</h1>
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
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('profile.personalInfo')}</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">{t('profile.fullName')}</Label>
                <Input
                  id="name"
                  name="name"
                  value={profile.name}
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                    handleChange(e);
                  }}
                  placeholder={t('profile.fullNamePlaceholder')}
                  className="mt-1 uppercase"
                />
              </div>
              <div>
                <Label htmlFor="gender">{t('profile.gender')}</Label>
                <Select
                  value={profile.gender}
                  onValueChange={(value) => setProfile(prev => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('profile.selectGender')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('profile.male')}</SelectItem>
                    <SelectItem value="female">{t('profile.female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="email">{t('profile.email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="mt-1 bg-gray-100 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('profile.emailCantChange')}</p>
              </div>
            </div>
          </Card>

          {/* Company Info */}
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <Building className="w-5 h-5 text-lime-600" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('profile.companyInfo')}</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company.name">{t('profile.companyName')}</Label>
                <Input
                  id="company.name"
                  name="company.name"
                  value={profile.companyInfo.name}
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                    handleChange(e);
                  }}
                  placeholder={t('profile.companyNamePlaceholder')}
                  className="mt-1 uppercase"
                />
              </div>
              <div>
                <Label htmlFor="company.nit">NIT</Label>
                <Input
                  id="company.nit"
                  name="company.nit"
                  value={profile.companyInfo.nit || ''}
                  onChange={handleChange}
                  placeholder="900.123.456-7"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="company.email">{t('profile.companyEmail')}</Label>
                <Input
                  id="company.email"
                  name="company.email"
                  type="email"
                  value={profile.companyInfo.email}
                  onChange={handleChange}
                  placeholder={t('profile.companyEmailPlaceholder')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="company.phone">{t('profile.phone')}</Label>
                <Input
                  id="company.phone"
                  name="company.phone"
                  value={profile.companyInfo.phone}
                  onChange={handleChange}
                  placeholder={t('profile.phonePlaceholder')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="company.address">{t('profile.address')}</Label>
                <Input
                  id="company.address"
                  name="company.address"
                  value={profile.companyInfo.address}
                  onChange={handleChange}
                  placeholder={t('profile.addressPlaceholder')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="company.city">{t('profile.city')}</Label>
                <Input
                  id="company.city"
                  name="company.city"
                  value={profile.companyInfo.city}
                  onChange={handleChange}
                  placeholder={t('profile.cityPlaceholder')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="company.state">{t('profile.state')}</Label>
                <Input
                  id="company.state"
                  name="company.state"
                  value={profile.companyInfo.state}
                  onChange={handleChange}
                  placeholder={t('profile.statePlaceholder')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="company.zip">{t('profile.zip')}</Label>
                <Input
                  id="company.zip"
                  name="company.zip"
                  value={profile.companyInfo.zip}
                  onChange={handleChange}
                  placeholder={t('profile.zipPlaceholder')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="company.country">{t('profile.country')}</Label>
                <Input
                  id="company.country"
                  name="company.country"
                  value={profile.companyInfo.country}
                  onChange={handleChange}
                  placeholder={t('profile.countryPlaceholder')}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Bank Information */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('profile.bankInfo') || 'Información Bancaria'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company.bank">{t('profile.bank') || 'Banco'}</Label>
                  <Input
                    id="company.bank"
                    name="company.bank"
                    value={profile.companyInfo.bank}
                    onChange={handleChange}
                    placeholder="Ej: BANCOLOMBIA"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="company.bankAccount">{t('profile.bankAccount') || 'Número de Cuenta'}</Label>
                  <Input
                    id="company.bankAccount"
                    name="company.bankAccount"
                    value={profile.companyInfo.bankAccount}
                    onChange={handleChange}
                    placeholder="Ej: 614-122666-08"
                    className="mt-1"
                  />
                </div>
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
                  {t('profile.saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t('profile.saveChanges')}
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
