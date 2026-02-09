import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockTemplates } from '../mock/invoiceData';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, Check } from 'lucide-react';

const Templates = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const handleSelectTemplate = (templateId) => {
    setSelectedTemplate(templateId);
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
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-gray-900">invoice </span>
                <span className="text-2xl font-bold text-yellow-400 bg-yellow-400 text-gray-900 px-2 ml-1">home</span>
              </div>
            </div>
            <Link to="/dashboard">
              <Button variant="outline">My Invoices</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Templates Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Invoice Template</h1>
          <p className="text-xl text-gray-600">Select from our professionally designed templates</p>
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
                <p className="text-gray-600 capitalize">{template.style} style</p>
                <Button
                  className="w-full mt-4 group-hover:bg-blue-600 group-hover:text-white transition-colors"
                  variant="outline"
                  style={selectedTemplate === template.id ? { backgroundColor: template.color, color: 'white', borderColor: template.color } : {}}
                >
                  Use This Template
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