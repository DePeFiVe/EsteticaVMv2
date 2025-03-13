import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageViewerModalProps {
  image: {
    image_url: string;
    description?: string;
    service: {
      name: string;
    };
  };
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  image,
  onClose,
  onNext,
  onPrev,
  hasNext,
  hasPrev
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-primary-accent z-10"
          aria-label="Cerrar visor"
        >
          <X className="h-8 w-8" />
        </button>

        {/* Navegación */}
        {hasPrev && (
          <button
            onClick={onPrev}
            className="absolute left-4 text-white hover:text-primary-accent z-10"
            aria-label="Imagen anterior"
          >
            <ChevronLeft className="h-12 w-12" />
          </button>
        )}

        {hasNext && (
          <button
            onClick={onNext}
            className="absolute right-4 text-white hover:text-primary-accent z-10"
            aria-label="Siguiente imagen"
          >
            <ChevronRight className="h-12 w-12" />
          </button>
        )}

        {/* Contenedor de imagen */}
        <div className="max-w-7xl mx-auto px-4 w-full h-full flex flex-col items-center justify-center">
          <img
            src={image.image_url}
            alt={image.description || image.service.name}
            className="max-h-[80vh] max-w-full object-contain"
            width="800"
            height="600"
            loading="eager"
            fetchPriority="high"
            onError={(e) => {
              console.error(`Error loading image in modal: ${image.image_url}`);
              e.currentTarget.src = 'https://placehold.co/800x600?text=Image+Not+Found';
            }}
          />
          
          {/* Información */}
          <div className="mt-4 text-center">
            <h3 className="text-white text-xl font-semibold">
              {image.service.name}
            </h3>
            {image.description && (
              <p className="text-white/80 mt-2">{image.description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageViewerModal;