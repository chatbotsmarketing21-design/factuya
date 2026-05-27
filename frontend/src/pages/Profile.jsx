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
import { ArrowLeft, User, Building, Mail, Phone, MapPin, Save, Loader2, Landmark, Upload, RotateCw, Edit } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';
import api, { profileAPI } from '../services/api';
import { COUNTRY_LIST, CURRENCY_LIST, getCountryConfig } from '../constants/countryConfig';

const Profile = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signature, setSignature] = useState('');
  const [signatureRotation, setSignatureRotation] = useState(0);
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
      bankAccount: '',
      accountType: 'savings',
      defaultCurrency: ''
    }
  });

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          accountType: 'savings',
          defaultCurrency: '',
          ...response.data.companyInfo
        }
      });
      // Cargar firma guardada
      setSignature(response.data.companyInfo?.signature || '');
      setSignatureRotation(response.data.companyInfo?.signatureRotation || 0);
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
      // Incluir signature/signatureRotation actuales en companyInfo para evitar
      // que el backend los sobreescriba con null al hacer $set.
      const payload = {
        ...profile,
        companyInfo: {
          ...profile.companyInfo,
          signature: signature || null,
          signatureRotation: signatureRotation || 0,
        },
      };
      await api.put('/profile', payload);
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

  // Manejo de la firma del propietario (se guarda en companyInfo del perfil)
  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast({ title: 'Procesando imagen...', description: 'Por favor espera' });

    try {
      // Comprimir la imagen antes de subir
      const compressed = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            const maxWidth = 800;
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });

      await profileAPI.updateSignature(compressed, 0);
      setSignature(compressed);
      setSignatureRotation(0);
      toast({ title: 'Firma guardada', description: 'Se aplicará automáticamente a tus documentos.' });
    } catch (error) {
      console.error('Error saving signature:', error);
      toast({ title: 'Error', description: 'No se pudo guardar la firma', variant: 'destructive' });
    }
  };

  const handleSignatureRotate = async () => {
    const newRotation = ((signatureRotation || 0) + 90) % 360;
    setSignatureRotation(newRotation);
    try {
      await profileAPI.updateSignature(signature, newRotation);
    } catch (error) {
      console.error('Error rotating signature:', error);
    }
  };

  const handleSignatureDelete = async () => {
    try {
      await profileAPI.deleteSignature();
      setSignature('');
      setSignatureRotation(0);
      toast({ title: 'Firma eliminada' });
    } catch (error) {
      console.error('Error deleting signature:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar la firma', variant: 'destructive' });
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
                <Label htmlFor="company.nit">{getCountryConfig(profile.companyInfo.country).taxIdLabel}</Label>
                <Input
                  id="company.nit"
                  name="company.nit"
                  value={profile.companyInfo.nit || ''}
                  onChange={handleChange}
                  placeholder={getCountryConfig(profile.companyInfo.country).taxIdPlaceholder}
                  className="mt-1"
                  data-testid="profile-nit-input"
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
                <Select
                  value={profile.companyInfo.country || ''}
                  onValueChange={(val) => {
                    const cfg = getCountryConfig(val);
                    // #30.d — Al cambiar el país, la moneda se actualiza
                    // automáticamente a la del país. Si el usuario quiere otra,
                    // puede cambiarla manualmente desde el selector de moneda.
                    setProfile((prev) => ({
                      ...prev,
                      companyInfo: {
                        ...prev.companyInfo,
                        country: val,
                        defaultCurrency: cfg.currency,
                      },
                    }));
                  }}
                >
                  <SelectTrigger className="mt-1" data-testid="profile-country-select">
                    <SelectValue placeholder={t('profile.countryPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_LIST.map((c) => (
                      <SelectItem key={c.code} value={c.name} data-testid={`profile-country-opt-${c.code}`}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* #30.d — Moneda predeterminada */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <Label htmlFor="company.defaultCurrency">Moneda predeterminada</Label>
                <Select
                  value={profile.companyInfo.defaultCurrency || ''}
                  onValueChange={(val) =>
                    setProfile((prev) => ({
                      ...prev,
                      companyInfo: { ...prev.companyInfo, defaultCurrency: val },
                    }))
                  }
                >
                  <SelectTrigger className="mt-1" data-testid="profile-currency-select">
                    <SelectValue placeholder="Selecciona la moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_LIST.map((c) => (
                      <SelectItem key={c.code} value={c.code} data-testid={`profile-currency-opt-${c.code}`}>
                        {c.code} ({c.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Información para Cuenta de Cobro (bloque separado) */}
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <Landmark className="w-5 h-5 text-lime-600" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Información para Cuenta de Cobro
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="company.bank">{t('profile.bank') || 'Banco'}</Label>
                <Input
                  id="company.bank"
                  name="company.bank"
                  value={profile.companyInfo.bank}
                  onChange={handleChange}
                  placeholder="Ej: Tu Banco"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="company.accountType">{t('profile.accountType') || 'Tipo de Cuenta'}</Label>
                <select
                  id="company.accountType"
                  name="company.accountType"
                  value={profile.companyInfo.accountType || 'savings'}
                  onChange={handleChange}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:bg-secondary dark:border-border dark:text-white"
                >
                  <option value="savings">Cuenta de Ahorros</option>
                  <option value="checking">Cuenta Corriente</option>
                </select>
              </div>
              <div>
                <Label htmlFor="company.bankAccount">{t('profile.bankAccount') || 'Número de Cuenta'}</Label>
                <Input
                  id="company.bankAccount"
                  name="company.bankAccount"
                  value={profile.companyInfo.bankAccount}
                  onChange={handleChange}
                  placeholder="Ej: 000-000000-00"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Firma */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Edit className="w-4 h-4 text-lime-600" />
                <Label className="dark:text-gray-300 text-sm font-medium">Firma</Label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Esta firma se mostrará automáticamente al final de tus facturas, cotizaciones y cuentas de cobro.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                {signature ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative">
                      <img
                        src={signature}
                        alt="Firma"
                        className="h-20 max-w-[240px] object-contain border border-gray-200 dark:border-gray-600 rounded p-2 bg-white"
                        style={{ transform: `rotate(${signatureRotation || 0}deg)` }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                        onClick={handleSignatureDelete}
                        data-testid="profile-delete-signature-btn"
                      >
                        ×
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 px-3"
                      onClick={handleSignatureRotate}
                      data-testid="profile-rotate-signature-btn"
                    >
                      <RotateCw className="w-4 h-4 mr-1" />
                      Rotar
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="profile-signature-upload"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/heic"
                      className="hidden"
                      onChange={handleSignatureUpload}
                      data-testid="profile-signature-input"
                    />
                    <label
                      htmlFor="profile-signature-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                    >
                      <Upload className="w-4 h-4" />
                      Subir Firma
                    </label>
                  </div>
                )}
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
