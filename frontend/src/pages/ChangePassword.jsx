import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { ArrowLeft, Key, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import api from '../services/api';

const ChangePassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (formData.newPassword.length < 6) {
      toast({
        title: t('messages.error'),
        description: t('changePassword.minLength'),
        variant: "destructive"
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: t('messages.error'),
        description: t('changePassword.noMatch'),
        variant: "destructive"
      });
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      toast({
        title: t('messages.error'),
        description: t('changePassword.mustBeDifferent'),
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      toast({
        title: t('changePassword.success'),
        description: t('changePassword.successDesc'),
      });
      
      // Clear form and redirect
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: t('messages.error'),
        description: error.response?.data?.detail || t('changePassword.errorChanging'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: t('changePassword.weak'), color: 'bg-red-500' };
    if (strength <= 3) return { strength, label: t('changePassword.medium'), color: 'bg-yellow-500' };
    return { strength, label: t('changePassword.strong'), color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('changePassword.back')}
              </Button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('changePassword.title')}</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Key className="w-5 h-5 text-lime-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('changePassword.updatePassword')}</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Password */}
            <div>
              <Label htmlFor="currentPassword">{t('changePassword.currentPassword')}</Label>
              <div className="relative mt-1">
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder={t('changePassword.currentPasswordPlaceholder')}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <Label htmlFor="newPassword">{t('changePassword.newPassword')}</Label>
              <div className="relative mt-1">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder={t('changePassword.newPasswordPlaceholder')}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      passwordStrength.strength <= 2 ? 'text-red-600' :
                      passwordStrength.strength <= 3 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-gray-500">
                    <li className={formData.newPassword.length >= 6 ? 'text-green-600' : ''}>
                      {formData.newPassword.length >= 6 ? <CheckCircle className="w-3 h-3 inline mr-1" /> : '○'} {t('changePassword.req6Chars')}
                    </li>
                    <li className={/[A-Z]/.test(formData.newPassword) ? 'text-green-600' : ''}>
                      {/[A-Z]/.test(formData.newPassword) ? <CheckCircle className="w-3 h-3 inline mr-1" /> : '○'} {t('changePassword.reqUppercase')}
                    </li>
                    <li className={/[0-9]/.test(formData.newPassword) ? 'text-green-600' : ''}>
                      {/[0-9]/.test(formData.newPassword) ? <CheckCircle className="w-3 h-3 inline mr-1" /> : '○'} {t('changePassword.reqNumber')}
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <Label htmlFor="confirmPassword">{t('changePassword.confirmPassword')}</Label>
              <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder={t('changePassword.confirmPasswordPlaceholder')}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">{t('changePassword.passwordsNoMatch')}</p>
              )}
              {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> {t('changePassword.passwordsMatch')}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full bg-lime-500 hover:bg-lime-600 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('changePassword.updating')}
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  {t('changePassword.changeButton')}
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ChangePassword;
