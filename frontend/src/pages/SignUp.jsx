import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';

const SignUp = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      companyName: formData.companyName || formData.name
    });
    
    if (result.success) {
      toast({
        title: "¡Registro Exitoso!",
        description: "Tu cuenta ha sido creada. Bienvenido a Invoice Home!",
      });
      navigate('/dashboard');
    } else {
      toast({
        title: "Error en el Registro",
        description: result.error || "No se pudo crear la cuenta",
        variant: "destructive"
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/">
              <div className="flex items-center cursor-pointer">
                <span className="text-2xl font-bold text-gray-900">invoice </span>
                <span className="text-2xl font-bold text-yellow-400 bg-yellow-400 text-gray-900 px-2 ml-1">home</span>
              </div>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Inicio
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Sign Up Form */}
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Cuenta</h1>
            <p className="text-gray-600">Comienza a crear facturas profesionales gratis</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Nombre Completo *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Tu nombre"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="companyName">Nombre de la Empresa (Opcional)</Label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Nombre de tu empresa"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Correo Electrónico *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repite tu contraseña"
                required
                className="mt-1"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta Gratis'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/signin" className="text-blue-600 hover:text-blue-700 font-semibold">
                Inicia sesión
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Al registrarte, aceptas nuestros términos de servicio y política de privacidad
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;
