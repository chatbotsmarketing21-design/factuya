import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { profileAPI } from '../services/api';

/**
 * Galería de Logos
 *
 * Lista los logos guardados por el usuario (hasta 10).
 * Al tocar un logo → se selecciona como activo y se regresa al creador.
 * Permite eliminar logos y subir uno nuevo desde un botón flotante.
 */
const LogoGallery = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [logos, setLogos] = useState([]);
  const [max, setMax] = useState(10);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await profileAPI.getLogos();
      setLogos(res.data.logos || []);
      setMax(res.data.max || 10);
    } catch (error) {
      console.error('Error loading logos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los logos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Comprime una imagen a base64 (máx 800px de ancho, JPEG 75%)
  const compressImage = (file) =>
    new Promise((resolve, reject) => {
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
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = reject;
        img.src = ev.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (logos.length >= max) {
      toast({
        title: 'Límite alcanzado',
        description: `Solo puedes guardar hasta ${max} logos. Elimina uno antes de agregar otro.`,
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }
    try {
      setUploading(true);
      const compressed = await compressImage(file);
      const res = await profileAPI.addLogo(compressed);
      setLogos(res.data.logos || []);
      toast({ title: 'Logo añadido', description: 'Se guardó en tu galería.' });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error',
        description: error?.response?.data?.detail || 'No se pudo guardar el logo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSelect = async (logo) => {
    try {
      await profileAPI.updateLogo(logo);
      toast({ title: 'Logo seleccionado' });
      navigate(-1);
    } catch (error) {
      console.error('Error selecting logo:', error);
      toast({
        title: 'Error',
        description: 'No se pudo seleccionar el logo',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (index, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar este logo de la galería?')) return;
    try {
      const res = await profileAPI.deleteLogoFromGallery(index);
      setLogos(res.data.logos || []);
      toast({ title: 'Logo eliminado' });
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el logo',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-lime-500 dark:bg-lime-600 sticky top-0 z-30 shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-lime-600 dark:hover:bg-lime-700 p-2 rounded-full transition"
            data-testid="logo-gallery-back"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white text-xl font-semibold">Seleccionar su logo</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
          </div>
        ) : logos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              Aún no tienes logos guardados.
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Toca <strong>+ Añadir otro logo</strong> para empezar.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {logos.map((logo, index) => (
              <div
                key={index}
                className="flex items-center gap-3"
                data-testid={`logo-gallery-row-${index}`}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(logo)}
                  className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-lime-500 hover:shadow-md transition flex items-center justify-center min-h-[140px]"
                  data-testid={`logo-gallery-select-${index}`}
                >
                  <img
                    src={logo}
                    alt={`Logo ${index + 1}`}
                    className="max-h-32 max-w-full object-contain"
                  />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDelete(index, e)}
                  className="text-red-500 hover:text-red-700 p-3 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                  data-testid={`logo-gallery-delete-${index}`}
                  aria-label={`Eliminar logo ${index + 1}`}
                >
                  <Trash2 className="w-7 h-7" />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-8">
          {logos.length} / {max} logos
        </p>
      </main>

      {/* Floating "Añadir su logo" button */}
      <input
        type="file"
        id="logo-gallery-upload"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/heic"
        className="hidden"
        onChange={handleUpload}
        data-testid="logo-gallery-upload-input"
      />
      <label
        htmlFor="logo-gallery-upload"
        className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 bg-lime-500 hover:bg-lime-600 text-white font-semibold px-5 py-3 rounded-full shadow-lg transition-all text-base cursor-pointer"
        style={{ boxShadow: '0 4px 14px rgba(132, 204, 22, 0.4)', opacity: uploading ? 0.7 : 1 }}
        data-testid="logo-gallery-add-btn"
      >
        {uploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Subiendo...</span>
          </>
        ) : (
          <>
            <Plus className="w-5 h-5" />
            <span>Añadir otro logo</span>
          </>
        )}
      </label>
    </div>
  );
};

export default LogoGallery;
