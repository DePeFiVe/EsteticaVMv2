import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/cloudinary';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        setError('Por favor selecciona un archivo de imagen válido');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setUploadProgress(0);

    try {
      if (!formData.service_id) {
        throw new Error('Por favor selecciona un servicio');
      }

      if (!selectedFile) {
        throw new Error('Por favor selecciona una imagen para subir');
      }

      // Upload image to Cloudinary
      setUploadProgress(10);
      console.log('Starting image upload to Cloudinary...');
      
      // Verify Cloudinary configuration
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) {
        throw new Error('La configuración de Cloudinary no está completa. Contacte al administrador.');
      }
      
      const uploadResult = await uploadImage(selectedFile, {
        folder: 'gallery',
        resource_type: 'image',
        // Add service category as a tag for better organization
        tags: [selectedCategory !== 'all' ? selectedCategory : 'gallery']
      });
      
      console.log('Upload successful:', uploadResult);
      setUploadProgress(70);

      // Save to database with the Cloudinary URL
      const { error: insertError } = await supabase
        .from('gallery_images')
        .insert({
          ...formData,
          image_url: (uploadResult as { secure_url: string }).secure_url
        });

      setUploadProgress(100);

      if (insertError) throw insertError;

      onSuccess();
    } catch (err) {
      console.error('Error adding image:', err);
      setError(err instanceof Error ? err.message : 'Error al agregar la imagen');
      setUploadProgress(0);
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
              Subir imagen (se convertirá a formato WebP)
            </label>
            <div className="border border-dashed border-gray-300 rounded-md p-4 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="image-upload"
                required
              />
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">
                  {selectedFile ? selectedFile.name : 'Haz clic para seleccionar una imagen'}
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  La imagen se optimizará automáticamente en formato WebP
                </span>
              </label>
            </div>
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

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
              <p className="text-xs text-gray-500 mt-1 text-center">
                {uploadProgress < 70 ? 'Subiendo imagen...' : 'Guardando en la galería...'}
              </p>
            </div>
          )}

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