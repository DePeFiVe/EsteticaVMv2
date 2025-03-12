import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AddImageModalProps {
  onClose: () => void;
  onSuccess: () => void;
  selectedCategory: string;
  services: Array<{ id: string; name: string; category: string }>;
  getCategoryName: (category: string) => string;
}

const AddImageModal: React.FC<AddImageModalProps> = ({
  onClose,
  onSuccess,
  selectedCategory,
  services,
  getCategoryName
}) => {
  const [formData, setFormData] = useState({
    service_id: '',
    image_url: '',
    description: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.service_id || !formData.image_url) {
        throw new Error('Por favor completa todos los campos requeridos');
      }

      const { error: insertError } = await supabase
        .from('gallery_images')
        .insert(formData);

      if (insertError) throw insertError;

      onSuccess();
    } catch (err) {
      console.error('Error adding image:', err);
      setError(err instanceof Error ? err.message : 'Error al agregar la imagen');
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = selectedCategory === 'all'
    ? services
    : services.filter(service => service.category === selectedCategory);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-black">Agregar Imagen</h2>
          <button
            onClick={onClose}
            className="text-black hover:text-primary"
            aria-label="Cerrar modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Servicio
            </label>
            <select
              value={formData.service_id}
              onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
              required
            >
              <option value="">Seleccionar servicio</option>
              {filteredServices.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">
              URL de la imagen
            </label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
              rows={3}
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-accent py-2 px-4 hover:bg-black/90 disabled:bg-primary/50"
          >
            {loading ? 'Agregando...' : 'Agregar Imagen'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddImageModal;