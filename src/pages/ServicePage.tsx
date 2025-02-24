import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, DollarSign } from 'lucide-react';
import AppointmentModal from '../components/AppointmentModal';
import { supabase } from '../lib/supabase';
import type { Service } from '../types';

const ServicePage = () => {
  const { category } = useParams<{ category: string }>();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categoryImages: Record<string, string> = {
    'pestañas': 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=1920&q=80',
    'pestanas': 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=1920&q=80',
    'cejas': 'https://images.unsplash.com/photo-1594742331548-2783e5df6916?auto=format&fit=crop&w=1920&q=80',
    'facial': 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1920&q=80',
    'labios': 'https://images.unsplash.com/photo-1588006173527-0fd5f9ae60c9?auto=format&fit=crop&w=1920&q=80',
    'uñas': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1920&q=80',
    'unas': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1920&q=80',
    'masajes': 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=1920&q=80',
    'packs': 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=1920&q=80'
  };

  const categoryNames: Record<string, string> = {
    'pestañas': 'Pestañas',
    'pestanas': 'Pestañas',
    'cejas': 'Cejas',
    'facial': 'Tratamientos Faciales',
    'labios': 'Labios',
    'uñas': 'Uñas',
    'unas': 'Uñas',
    'masajes': 'Masajes',
    'packs': 'Packs Especiales'
  };

  // Mapa de normalización de categorías
  const categoryMap: Record<string, string> = {
    'pestanas': 'pestañas',
    'pestañas': 'pestañas',
    'unas': 'uñas',
    'uñas': 'uñas',
    'cejas': 'cejas',
    'facial': 'facial',
    'labios': 'labios',
    'masajes': 'masajes',
    'packs': 'packs'
  };

  useEffect(() => {
    const fetchServices = async () => {
      if (!category) {
        setError('Categoría no encontrada');
        setLoading(false);
        return;
      }

      try {
        // Normalizar la categoría para la consulta
        const normalizedCategory = categoryMap[category.toLowerCase()];
        
        if (!normalizedCategory) {
          setError(`Categoría no válida: ${categoryNames[category.toLowerCase()] || category}`);
          setLoading(false);
          return;
        }

        const { data, error: supabaseError } = await supabase
          .from('services')
          .select('*')
          .eq('category', normalizedCategory)
          .order('price', { ascending: true });

        if (supabaseError) {
          throw supabaseError;
        }

        if (!data || data.length === 0) {
          setError(`No se encontraron servicios en la categoría ${categoryNames[category.toLowerCase()]}`);
        } else {
          setServices(data);
          setError(null); // Limpiar error si la consulta fue exitosa
        }
      } catch (err) {
        console.error('Error fetching services:', err);
        setError('Error al cargar los servicios');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [category]);

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}min` : ''}`;
    }
    return `${minutes} minutos`;
  };

  if (loading) {
    return (
      <div className="min-h-screen py-16 flex items-center justify-center">
        <div className="text-xl text-black">Cargando servicios...</div>
      </div>
    );
  }

  const currentCategory = category?.toLowerCase();
  const categoryImage = categoryImages[currentCategory || ''];
  const categoryName = categoryNames[currentCategory || ''];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div 
        className="relative h-[50vh] bg-cover bg-center"
        style={{
          backgroundImage: categoryImage ? `url("${categoryImage}")` : undefined
        }}
      >
        <div className="absolute inset-0 bg-black/40">
          <div className="max-w-7xl mx-auto h-full flex items-center px-4">
            <div className="text-center w-full">
              <h1 className="text-5xl font-light text-white mb-4">
                {categoryName || 'Servicios'}
              </h1>
              <p className="text-xl text-white/90 max-w-2xl mx-auto">
                Descubre nuestros servicios profesionales y déjate mimar por expertos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        {error ? (
          <div className="text-center py-12">
            <p className="text-xl text-red-600">{error}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div 
                key={service.id} 
                className="bg-white p-8 border border-gray-100 hover:border-primary transition-all duration-300 group"
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-light text-black mb-4">
                    {service.name}
                  </h3>
                  <div className="text-3xl font-semibold text-primary mb-4">
                    ${service.price}
                  </div>
                  {service.description && (
                    <p className="text-gray-600 mb-6">{service.description}</p>
                  )}
                  <div className="space-y-3 text-gray-600">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      <span>{formatDuration(service.duration)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedService(service)}
                  className="w-full bg-primary text-primary-accent py-3 hover:bg-black/90 transition-colors"
                >
                  Reservar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedService && (
        <AppointmentModal
          service={selectedService}
          isOpen={!!selectedService}
          onClose={() => setSelectedService(null)}
        />
      )}
    </div>
  );
};

export default ServicePage;