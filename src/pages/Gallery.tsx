import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { supabase } from '../lib/supabase';
import { isAdmin } from '../lib/auth';
import { Plus, X, ImageIcon, ZoomIn, Search } from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useSwipeable } from 'react-swipeable';
import { useDebounce } from '../hooks/useDebounce';

// Lazy load modals
const ImageViewerModal = lazy(() => import('../components/ImageViewerModal'));
const AddImageModal = lazy(() => import('../components/AddImageModal'));

interface GalleryImage {
  id: string;
  service_id: string;
  image_url: string;
  description: string;
  created_at: string;
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

  const userIsAdmin = isAdmin();

  const allowedCategories = [
    'cejas',
    'pestañas',
    'facial',
    'labios',
    'uñas'
  ];

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
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  const fetchImages = useCallback(async (pageNumber: number = 1, retry: boolean = false) => {
    try {
      setLoading(true);
      const from = (pageNumber - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Use cache if available and not a retry
      if (!retry && pageNumber === 1 && cachedImages.length > 0) {
        setImages(cachedImages);
        setLoading(false);
        // Fetch in background to update cache
        fetchImages(1, true);
        return;
      }

      const { data, error } = await supabase
        .from('gallery_images')
        .select(`
          *,
          service:services (
            name,
            category
          )
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) {
        const validImages = data.filter(img => img.service !== null);
        const newImages = pageNumber === 1 ? validImages : [...images, ...validImages];
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
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-primary text-primary-accent px-4 py-2 flex items-center"
                aria-label="Agregar imagen"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Imagen
              </button>
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
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={image.image_url}
                  alt={image.description || (image.service?.name ?? '')}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
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
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="absolute top-2 right-2 text-white hover:text-red-500"
                    aria-label="Eliminar imagen"
                  >
                    <X className="h-6 w-6" />
                  </button>
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
                image={selectedImage}
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