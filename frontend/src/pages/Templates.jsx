import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { mockTemplates, templateColors } from '../mock/invoiceData';
import { profileAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, Check } from 'lucide-react';

const Templates = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedColor, setSelectedColor] = useState('#84cc16'); // Lima por defecto
  const [savedTemplateId, setSavedTemplateId] = useState(null);

  // Cargar preferencias guardadas
  useEffect(() => {
    const loadSavedPreferences = async () => {
      try {
        const response = await profileAPI.getCompany();
        if (response.data.defaultTemplate) {
          setSavedTemplateId(response.data.defaultTemplate);
        }
        if (response.data.defaultColor) {
          setSelectedColor(response.data.defaultColor);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };
    loadSavedPreferences();
  }, []);

  const handleSelectTemplate = async (templateId) => {
    setSelectedTemplate(templateId);
    
    // Guardar plantilla y color seleccionado en el perfil del usuario
    try {
      await profileAPI.updateInvoiceDefaults({ 
        template: templateId,
        color: selectedColor 
      });
    } catch (error) {
      console.error('Error saving template preference:', error);
    }
    
    // Navigate to invoice creator with selected template and color
    setTimeout(() => {
      navigate(`/create?template=${templateId}&color=${encodeURIComponent(selectedColor)}`);
    }, 300);
  };

  const handleColorSelect = async (color) => {
    setSelectedColor(color.hex);
    
    // Guardar color en el perfil
    try {
      await profileAPI.updateInvoiceDefaults({ color: color.hex });
    } catch (error) {
      console.error('Error saving color preference:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/create">
                <Button variant="ghost" size="sm" className="dark:text-gray-300 dark:hover:bg-gray-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('common.back')}
                </Button>
              </Link>
            </div>
            <Link to="/dashboard">
              <div className="flex items-center cursor-pointer">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">Factu</span>
                <span className="text-2xl font-bold text-white bg-lime-500 px-2 ml-1">Ya!</span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Templates Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{t('templates.title')}</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">{t('templates.subtitle')}</p>
        </div>

        {/* Color Selector */}
        <div className="mb-10 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>Filtrar por color</span>
            {selectedColor && (
              <span 
                className="w-5 h-5 rounded-full border-2 border-gray-300"
                style={{ backgroundColor: selectedColor }}
              ></span>
            )}
          </h2>
          <div className="flex flex-wrap gap-3">
            {templateColors.map((color) => (
              <button
                key={color.id}
                onClick={() => handleColorSelect(color)}
                className={`w-10 h-10 rounded-full transition-all duration-200 hover:scale-110 flex items-center justify-center ${
                  selectedColor === color.hex 
                    ? 'ring-2 ring-offset-2 ring-gray-400' 
                    : 'hover:ring-2 hover:ring-offset-2 hover:ring-gray-300'
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              >
                {selectedColor === color.hex && (
                  <Check className="w-5 h-5 text-white drop-shadow-md" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {mockTemplates.map((template) => (
            <Card
              key={template.id}
              className={`group cursor-pointer transition-all duration-300 hover:shadow-xl overflow-hidden dark:bg-gray-800 dark:border-gray-700 ${
                selectedTemplate === template.id ? 'ring-2 ring-lime-500' : ''
              } ${savedTemplateId === template.id ? 'ring-2 ring-blue-400' : ''}`}
              onClick={() => handleSelectTemplate(template.id)}
            >
              <div className="relative">
                {/* Template Preview */}
                {template.thumbnail ? (
                  // Mostrar imagen real para plantillas con thumbnail
                  <div className="h-48 overflow-hidden relative">
                    <img 
                      src={template.thumbnail} 
                      alt={template.name}
                      className="w-full h-full object-cover object-top"
                    />
                    {/* Color overlay indicator */}
                    <div 
                      className="absolute bottom-2 right-2 w-6 h-6 rounded-full border-2 border-white shadow-md"
                      style={{ backgroundColor: selectedColor }}
                    ></div>
                  </div>
                ) : (
                  // Preview genérico para plantilla clásica
                  <div
                    className="h-48 p-4 flex flex-col justify-between"
                    style={{ backgroundColor: `${selectedColor}15` }}
                  >
                    <div>
                      <div
                        className="h-6 rounded mb-3"
                        style={{ backgroundColor: selectedColor, width: '60%' }}
                      ></div>
                      <div className="space-y-2">
                        <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                        <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
                        <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-4/6"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
                        <div className="h-2 bg-gray-400 dark:bg-gray-500 rounded w-1/4"></div>
                      </div>
                      <div
                        className="h-3 rounded mt-2"
                        style={{ backgroundColor: selectedColor, width: '50%', marginLeft: 'auto' }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Selection Overlay */}
                {selectedTemplate === template.id && (
                  <div className="absolute inset-0 bg-lime-600 bg-opacity-20 flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 rounded-full p-2">
                      <Check className="w-6 h-6 text-lime-600" />
                    </div>
                  </div>
                )}

                {/* Current template badge */}
                {savedTemplateId === template.id && selectedTemplate !== template.id && (
                  <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    Actual
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div className="p-4 bg-white dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{template.name}</h3>
                <Button
                  className="w-full mt-2 transition-colors"
                  variant="outline"
                  size="sm"
                  style={selectedTemplate === template.id ? { backgroundColor: selectedColor, color: 'white', borderColor: selectedColor } : {}}
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
