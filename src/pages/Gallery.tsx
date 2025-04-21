import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { supabase } from '../lib/supabase';
import { extendSupabaseWithHeaders } from '../lib/supabaseHeaders';
import { isAdmin } from '../lib/auth';
import { Plus, X, ImageIcon, ZoomIn, Search, GripVertical } from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useSwipeable } from 'react-swipeable';
import { useDebounce } from '../hooks/useDebounce';
import { addVirtualPositionToImages } from '../lib/gallery-position-workaround.ts';

// Lazy load modals
const ImageViewerModal = lazy(() => import('../components/ImageViewerModal'));
const AddImageModal = lazy(() => import('../components/AddImageModal'));

interface GalleryImage {
  id: string;
  service_id: string;
  image_url: string;
  description: string;
  created_at: string;
  position?: number;
  service: {
    name: string;
    category: string;
  } | null;
}

const ITEMS_PER_PAGE = 12;

const Gallery = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [services, setServices] = useState<Array<{ id: string; name: string; category: string }>>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [retryCount, setRetryCount] = useState(0);
  const [cachedImages, setCachedImages] = useLocalStorage<GalleryImage[]>('gallery-images', []);
// Removed draggedImageId state since it was unused

  const [userIsAdmin, setUserIsAdmin] = useState(false);

  // Verificar si el usuario es administrador
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const isAdminStatus = await isAdmin();
        setUserIsAdmin(isAdminStatus);
      } catch (err) {
        console.error('Error al verificar estado de administrador:', err);
        setUserIsAdmin(false);
      }
    };
    
    checkAdminStatus();
  }, []);

  // Define getCategoryName function before using it
  const getCategoryName = (category: string) => {
    const categoryNames: Record<string, string> = {
      'cejas': 'Cejas',
      'pestañas': 'Pestañas',
      'facial': 'Tratamientos Faciales',
      'labios': 'Labios',
      'uñas': 'Uñas'
    };
    return categoryNames[category] || category;
  };

  // Categorías ordenadas alfabéticamente por su nombre de visualización
  const allowedCategories = [
    'cejas',
    'facial',
    'labios',
    'pestañas',
    'uñas'
  ].sort((a, b) => {
    const nameA = getCategoryName(a);
    const nameB = getCategoryName(b);
    return nameA.localeCompare(nameB);
  });

  // Filtrar imágenes
  const filteredImages = useMemo(() => {
    return images.filter(image => {
      if (!image.service) return false;
      
      const matchesCategory = selectedCategory === 'all' || image.service.category === selectedCategory;
      const matchesSearch = !debouncedSearch || 
        image.description?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        image.service.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [images, selectedCategory, debouncedSearch]);

  // Handlers para gestos táctiles
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (selectedImage && filteredImages.length > 1) {
        const currentIndex = filteredImages.findIndex(img => img.id === selectedImage.id);
        const nextIndex = (currentIndex + 1) % filteredImages.length;
        setSelectedImage(filteredImages[nextIndex]);
      }
    },
    onSwipedRight: () => {
      if (selectedImage && filteredImages.length > 1) {
        const currentIndex = filteredImages.findIndex(img => img.id === selectedImage.id);
        const prevIndex = currentIndex === 0 ? filteredImages.length - 1 : currentIndex - 1;
        setSelectedImage(filteredImages[prevIndex]);
      }
    },
    delta: 10,
    trackMouse: true
  });

  const fetchImages = useCallback(async (pageNumber: number = 1, retry: boolean = false) => {
    try {
      setLoading(true);
      const from = (pageNumber - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Siempre obtener datos frescos al cargar la página
      const { data, error } = await supabase
        .from('gallery_images')
        .select(`
          *,
          service:services!left (  
            name,
            category
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const validImages = data.filter(img => img.service !== null);
        // Add virtual position to images based on created_at
        const imagesWithPosition = addVirtualPositionToImages(validImages);
        const newImages = pageNumber === 1 ? imagesWithPosition : [...images, ...imagesWithPosition];
        setImages(newImages);
        if (pageNumber === 1) {
          setCachedImages(newImages);
        }
        setHasMore(validImages.length === ITEMS_PER_PAGE);
      }
    } catch (err) {
      console.error('Error fetching images:', err);
      setError('Error al cargar las imágenes');
      
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchImages(pageNumber, true);
        }, 1000 * Math.pow(2, retryCount));
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, retryCount, cachedImages, images]);

  // Cargar servicios
  useEffect(() => {
    const fetchServices = async () => {
      try {
        // Extender Supabase con headers adecuados para evitar errores de aceptación
        extendSupabaseWithHeaders(supabase, { Accept: 'application/json' });
        
        const { data, error } = await supabase
          .from('services')
          .select('id, name, category')
          .order('name');

        if (error) throw error;
        setServices(data || []);
      } catch (err) {
        console.error('Error fetching services:', err);
        setError('Error al cargar los servicios');
      }
    };

    fetchServices();
  }, []);

  // Cargar imágenes iniciales
  useEffect(() => {
    fetchImages(1);
  }, [fetchImages]);

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
    fetchImages(page + 1);
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!userIsAdmin || !confirm('¿Estás seguro de que deseas eliminar esta imagen?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('gallery_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      setImages(prev => prev.filter(img => img.id !== imageId));
      if (selectedImage?.id === imageId) {
        setShowImageModal(false);
        setSelectedImage(null);
      }
    } catch (err) {
      console.error('Error deleting image:', err);
      setError('Error al eliminar la imagen');
    }
  };

  // Handle moving images (reordering)
  const handleMoveImage = async (imageId: string, newPosition: number) => {
    if (!userIsAdmin) return;
  
    const imageIndex = images.findIndex(img => img.id === imageId);
    if (imageIndex === -1) return;
  
    const updatedImages = [...images];
    const [movedImage] = updatedImages.splice(imageIndex, 1);
    updatedImages.splice(newPosition, 0, movedImage);
  
    // Update positions
    const reorderedImages = updatedImages.map((img, index) => ({
      ...img,
      position: index + 1
    }));
  
    // Update UI immediately for better user experience
    setImages(reorderedImages);
    setCachedImages(reorderedImages);
  
    try {
      // Update all affected images in the database
      // We only need to update images whose position has changed
      const imagesToUpdate = reorderedImages
        .filter((img, idx) => img.position !== images[idx]?.position)
        .map(img => ({
          id: img.id,
          position: img.position
        }));
  
      // Update each image position in the database
      for (const img of imagesToUpdate) {
        // Actualizar solo la fecha de creación para simular un cambio de posición
        // ya que la columna 'position' no existe en la tabla
        const { error } = await supabase
          .from('gallery_images')
          .update({ 
            created_at: new Date().toISOString() // Actualizar timestamp para afectar el orden
          })
          .eq('id', img.id);
  
        if (error) {
          console.error(`Error updating position for image ${img.id}:`, error);
          throw error;
        }
      }
    } catch (err) {
      console.error('Error updating image positions:', err);
      setError('Error al actualizar las posiciones de las imágenes');
      // Refresh images to restore original order
      fetchImages(1, true);
    }
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    if (!userIsAdmin) return;
    
    e.dataTransfer.setData('text/plain', imageId);
// Remove setDraggedImageId since it's not defined and not needed
    e.currentTarget.classList.add('opacity-50');
  };

  // Handle drag end
  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
// Remove setDraggedImageId call since the state is not defined
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent, targetImageId: string) => {
    e.preventDefault();
    
    const sourceImageId = e.dataTransfer.getData('text/plain');
    if (!sourceImageId || sourceImageId === targetImageId) return;
    
    const targetIndex = images.findIndex(img => img.id === targetImageId);
    if (targetIndex === -1) return;

    try {
      // Update positions in UI first for immediate feedback
      handleMoveImage(sourceImageId, targetIndex);

      // Update position in database
      // Actualizar solo la fecha de creación para simular un cambio de posición
      // ya que la columna 'position' no existe en la tabla
      const { error } = await supabase
        .from('gallery_images')
        .update({ 
          created_at: new Date().toISOString() // Actualizar timestamp para afectar el orden
        })
        .eq('id', sourceImageId);

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Error updating image position:', err);
      setError('Error al actualizar la posición de la imagen');
      // Refresh images to restore original order
      fetchImages(1, true);
    }
  };

  return (
    <div className="min-h-screen py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header y controles */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 space-y-4 md:space-y-0">
          <h1 className="text-4xl font-bold text-black">Galería</h1>
          <div className="flex items-center space-x-4">
            {/* Buscador */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary rounded-md"
                aria-label="Buscar imágenes"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            </div>
            
            {userIsAdmin && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-primary text-primary-accent px-4 py-2 flex items-center"
                  aria-label="Agregar imagen"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Imagen
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filtros de categoría */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 capitalize transition-colors duration-200 ${
              selectedCategory === 'all'
                ? 'bg-primary text-primary-accent'
                : 'bg-gray-200 text-black hover:bg-gray-300'
            }`}
            aria-pressed={selectedCategory === 'all'}
          >
            Todos
          </button>
          {allowedCategories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 capitalize transition-colors duration-200 ${
                selectedCategory === category
                  ? 'bg-primary text-primary-accent'
                  : 'bg-gray-200 text-black hover:bg-gray-300'
              }`}
              aria-pressed={selectedCategory === category}
            >
              {getCategoryName(category)}
            </button>
          ))}
        </div>

        {/* Mensajes de error */}
        {error && (
          <div 
            className="text-red-600 mb-4 p-4 bg-red-50 border border-red-200 rounded"
            role="alert"
          >
            {error}
          </div>
        )}

        {userIsAdmin && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-800 text-sm">Modo administrador: Puedes reordenar las imágenes arrastrando el icono <GripVertical className="inline-block h-4 w-4" /></p>
          </div>
        )}

        {/* Grid de imágenes */}
        <div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          role="grid"
          aria-label="Galería de imágenes"
        >
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className="group relative bg-white shadow-lg hover:shadow-xl transition-all duration-300"
              role="gridcell"
              data-image-id={image.id}
              draggable={!!userIsAdmin}
              onDragStart={(e) => handleDragStart(e, image.id)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, image.id)}
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={image.image_url}
                  alt={image.description || (image.service?.name ?? '')}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                  onError={(e) => {
                    console.error(`Error loading image: ${image.image_url}`);
                    e.currentTarget.src = 'https://placehold.co/600x600?text=Image+Not+Found';
                  }}
                  onClick={() => {
                    setSelectedImage(image);
                    setShowImageModal(true);
                  }}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                <h3 className="text-white font-semibold">{image.service?.name}</h3>
                {image.description && (
                  <p className="text-white/90 text-sm mt-1">{image.description}</p>
                )}
                <button
                  onClick={() => {
                    setSelectedImage(image);
                    setShowImageModal(true);
                  }}
                  className="absolute top-2 left-2 text-white hover:text-primary-accent"
                  aria-label="Ver imagen ampliada"
                >
                  <ZoomIn className="h-6 w-6" />
                </button>
                {userIsAdmin && (
                  <>
                    <button
                      onClick={() => handleDeleteImage(image.id)}
                      className="absolute top-2 right-2 text-white hover:text-red-500"
                      aria-label="Eliminar imagen"
                    >
                      <X className="h-6 w-6" />
                    </button>
                    <button
                      className="absolute top-2 right-12 text-white hover:text-primary-accent cursor-move"
                      aria-label="Mover imagen"
                    >
                      <GripVertical className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Carga más */}
        {hasMore && (
          <div className="text-center mt-8">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="bg-primary text-primary-accent px-6 py-2 disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Cargar más'}
            </button>
          </div>
        )}

        {/* Estado vacío */}
        {filteredImages.length === 0 && !loading && (
          <div className="text-center py-12">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay imágenes para mostrar</p>
          </div>
        )}

        {/* Modales */}
        <Suspense fallback={null}>
          {showAddModal && (
            <AddImageModal
              onClose={() => setShowAddModal(false)}
              onSuccess={() => {
                setShowAddModal(false);
                fetchImages(1, true);
              }}
              selectedCategory={selectedCategory}
              services={services}
              getCategoryName={getCategoryName}
            />
          )}

          {showImageModal && selectedImage && (
            <div {...handlers}>
              <ImageViewerModal
                image={selectedImage && {
                  image_url: selectedImage.image_url,
                  description: selectedImage.description,
                  service: selectedImage.service || { name: '' }
                }}
                onClose={() => {
                  setShowImageModal(false);
                  setSelectedImage(null);
                }}
                onNext={() => {
                  if (selectedImage && filteredImages.length > 1) {
                    const currentIndex = filteredImages.findIndex(img => img.id === selectedImage.id);
                    const nextIndex = (currentIndex + 1) % filteredImages.length;
                    setSelectedImage(filteredImages[nextIndex]);
                  }
                }}
                onPrev={() => {
                  if (selectedImage && filteredImages.length > 1) {
                    const currentIndex = filteredImages.findIndex(img => img.id === selectedImage.id);
                    const prevIndex = currentIndex === 0 ? filteredImages.length - 1 : currentIndex - 1;
                    setSelectedImage(filteredImages[prevIndex]);
                  }
                }}
                hasNext={filteredImages.length > 1}
                hasPrev={filteredImages.length > 1}
              />
            </div>
          )}


        </Suspense>
      </div>
    </div>
  );
};

export default Gallery;