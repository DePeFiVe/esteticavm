import React, { useState, useEffect } from 'react';
import { Star, Clock, Shield, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AppointmentModal from '../components/AppointmentModal';
import type { Service } from '../types';

const Home = () => {
  const [packs, setPacks] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  useEffect(() => {
    const fetchPacks = async () => {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('category', 'packs')
        .order('price', { ascending: true });
      
      if (data) {
        setPacks(data);
      }
    };

    fetchPacks();
  }, []);

  const scrollToServices = () => {
    const servicesSection = document.getElementById('services-section');
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const services = [
    {
      title: 'Pestañas',
      image: 'https://i.imgur.com/5IQBpLi.jpeg',
      link: '/services/pestañas'
    },
    {
      title: 'Labios',
      image: 'https://i.imgur.com/GUVJYsX.jpeg',
      link: '/services/labios'
    },
    {
      title: 'Tratamientos Faciales',
      image: 'https://i.imgur.com/J3Yjpmn.jpeg',
      link: '/services/facial'
    },
    {
      title: 'Cejas',
      image: 'https://i.imgur.com/u9vAKpZ.jpeg',
      link: '/services/cejas'
    },
    {
      title: 'Uñas',
      image: 'https://i.pinimg.com/564x/11/97/e8/1197e815c14404726c363e27876f0ef4.jpg',
      link: '/services/uñas'
    },
    {
      title: 'Masajes',
      image: 'https://mindfit.club/wp-content/uploads/2018/02/Masaje-Bambuterapia-1.jpg',
      link: '/services/masajes'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-black">
        <div className="max-w-7xl mx-auto">
          {/* Logo container with responsive aspect ratio */}
          <div className="relative w-full max-w-4xl mx-auto pt-[56.25%]">
            <img
              src="https://i.imgur.com/GGM5Nr6.jpeg"
              alt="Valery Miranda Cosmetóloga"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Schedule button */}
            <div className="absolute -left-16 bottom-24">
              <button
                onClick={scrollToServices}
                className="bg-primary text-primary-accent px-8 py-3 text-lg hover:bg-black/90 transition-colors border-2 border-primary-accent shadow-[0_0_15px_rgba(255,215,0,0.3)] hover:shadow-[0_0_20px_rgba(255,215,0,0.5)]"
              >
                Agendate ahora
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Specials Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-semibold text-center mb-12 text-black">
            Especiales para ti
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packs.map((pack) => (
              <div 
                key={pack.id} 
                className="bg-white p-8 border border-gray-100 hover:border-primary transition-all duration-300 group"
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-light text-black mb-4">
                    {pack.name}
                  </h3>
                  <div className="text-3xl font-semibold text-primary mb-4">
                    ${pack.price}
                  </div>
                  {pack.description && (
                    <p className="text-gray-600 mb-6">{pack.description}</p>
                  )}
                  <div className="space-y-3 text-gray-600">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      <span>{pack.duration} minutos</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedService(pack)}
                  className="w-full bg-primary text-primary-accent py-3 hover:bg-black/90 transition-colors"
                >
                  Reservar
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div id="services-section" className="py-16" style={{ backgroundColor: '#D6D4D4' }}>
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-semibold text-center mb-12 text-white">
            Nuestros Servicios
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {services.map((service, index) => (
              <Link
                key={index}
                to={service.link}
                className="group relative overflow-hidden block"
              >
                <div className="aspect-square">
                  <img 
                    src={service.image} 
                    alt={service.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-100 group-hover:opacity-90 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {service.title}
                    </h3>
                    <span className="inline-flex items-center text-primary-accent text-sm">
                      Ver servicios
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4">
                <Star className="w-full h-full text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-black">Experiencia</h3>
              <p className="text-gray-600 text-sm">
                Nuestros profesionales altamente capacitados te brindarán un servicio excepcional.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4">
                <Clock className="w-full h-full text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-black">Puntualidad</h3>
              <p className="text-gray-600 text-sm">
                Valoramos tu tiempo y nos aseguramos de mantener nuestros horarios.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4">
                <Shield className="w-full h-full text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-black">Seguridad</h3>
              <p className="text-gray-600 text-sm">
                Utilizamos productos de primera calidad y seguimos estrictos protocolos de higiene.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonial Section */}
      <div className="py-16 bg-primary text-primary-accent">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xl font-light italic leading-relaxed mb-6">
            "El equipo de Estética VM es increíblemente profesional y detallista.
            Siempre salgo completamente satisfecha con los resultados."
          </p>
          <p className="font-semibold">María González</p>
          <p className="text-sm opacity-80">Cliente frecuente</p>
        </div>
      </div>

      {/* CTA Section */}
      <div 
        className="py-16 bg-cover bg-center relative"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1560750588-73207b1ef5b8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80")'
        }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-semibold text-white mb-4">
              Realza tu belleza natural
            </h2>
            <p className="text-lg text-white/90 mb-6">
              Agenda tu cita hoy y déjanos ayudarte a lucir tu mejor versión.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center bg-primary text-primary-accent px-6 py-2 text-lg hover:bg-white hover:text-primary transition-colors group"
            >
              Contáctanos
              <ChevronRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Appointment Modal */}
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

export default Home;