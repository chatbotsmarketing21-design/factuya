import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { mockTemplates } from '../mock/invoiceData';
import { profileAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, Check } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Templates = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const handleSelectTemplate = async (templateId) => {
    setSelectedTemplate(templateId);
    
    // Guardar plantilla seleccionada en el perfil del usuario
    try {
      await profileAPI.updateInvoiceDefaults({ template: templateId });
    } catch (error) {
      console.error('Error saving template preference:', error);
    }
    
    // Navigate to invoice creator with selected template
    setTimeout(() => {
      navigate(`/create?template=${templateId}`);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/create">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('common.back')}
                </Button>
              </Link>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-gray-900">Factu</span>
                <span className="text-2xl font-bold text-white bg-lime-500 px-2 ml-1">Ya!</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Link to="/dashboard">
                <Button variant="outline">{t('templates.myInvoices')}</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Templates Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('templates.title')}</h1>
          <p className="text-xl text-gray-600">{t('templates.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mockTemplates.map((template) => (
            <Card
              key={template.id}
              className={`group cursor-pointer transition-all duration-300 hover:shadow-xl overflow-hidden ${
                selectedTemplate === template.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleSelectTemplate(template.id)}
            >
              <div className="relative">
                {/* Template Preview */}
                {(template.type === 'wave' || template.type === 'dexter' || template.type === 'moderno') ? (
                  // Mostrar imagen real para plantillas especiales
                  <div className="h-64 overflow-hidden relative">
                    <img 
                      src={template.thumbnail} 
                      alt={template.name}
                      className="w-full h-full object-cover object-top"
                    />
                    {/* Color indicator for moderno templates */}
                    {template.type === 'moderno' && (
                      <div 
                        className="absolute bottom-2 right-2 w-6 h-6 rounded-full border-2 border-white shadow-md"
                        style={{ backgroundColor: template.color }}
                      ></div>
                    )}
                  </div>
                ) : (
                  // Preview genérico para plantillas default
                  <div
                    className="h-64 p-6 flex flex-col justify-between"
                    style={{ backgroundColor: `${template.color}15` }}
                  >
                    <div>
                      <div
                        className="h-8 rounded mb-4"
                        style={{ backgroundColor: template.color, width: '60%' }}
                      ></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-300 rounded w-full"></div>
                        <div className="h-3 bg-gray-300 rounded w-5/6"></div>
                        <div className="h-3 bg-gray-300 rounded w-4/6"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <div className="h-3 bg-gray-300 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-400 rounded w-1/4"></div>
                      </div>
                      <div className="flex justify-between">
                        <div className="h-3 bg-gray-300 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-400 rounded w-1/4"></div>
                      </div>
                      <div
                        className="h-4 rounded mt-4"
                        style={{ backgroundColor: template.color, width: '50%', marginLeft: 'auto' }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Selection Overlay */}
                {selectedTemplate === template.id && (
                  <div className="absolute inset-0 bg-blue-600 bg-opacity-20 flex items-center justify-center">
                    <div className="bg-white rounded-full p-3">
                      <Check className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div className="p-6 bg-white">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{template.name}</h3>
                <p className="text-gray-600 capitalize">{template.style} {t('templates.style')}</p>
                <Button
                  className="w-full mt-4 group-hover:bg-blue-600 group-hover:text-white transition-colors"
                  variant="outline"
                  style={selectedTemplate === template.id ? { backgroundColor: template.color, color: 'white', borderColor: template.color } : {}}
                >
                  {t('templates.useTemplate')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Templates;