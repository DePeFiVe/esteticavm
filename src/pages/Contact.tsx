import React from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

const Contact = () => {
  return (
    <div className="min-h-screen py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-black mb-4">Contacto</h1>
          <p className="text-xl text-gray-600">
            Estamos aquí para ayudarte. Contáctanos de la manera que prefieras.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-8">
            <div className="bg-white shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6 text-black">Información de Contacto</h2>
              <div className="space-y-6">
                <div className="flex items-start">
                  <MapPin className="h-6 w-6 text-primary mt-1 mr-4" />
                  <div>
                    <h3 className="font-semibold mb-1 text-black">Dirección</h3>
                    <p className="text-gray-600">Av. Principal 1234, Montevideo</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="h-6 w-6 text-primary mt-1 mr-4" />
                  <div>
                    <h3 className="font-semibold mb-1 text-black">Teléfono</h3>
                    <p className="text-gray-600">+598 99 123 456</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail className="h-6 w-6 text-primary mt-1 mr-4" />
                  <div>
                    <h3 className="font-semibold mb-1 text-black">Email</h3>
                    <p className="text-gray-600">info@beautycenter.com</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Clock className="h-6 w-6 text-primary mt-1 mr-4" />
                  <div>
                    <h3 className="font-semibold mb-1 text-black">Horario</h3>
                    <p className="text-gray-600">Lunes a Sábado: 9:00 - 20:00</p>
                    <p className="text-gray-600">Domingo: Cerrado</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-black">Envíanos un Mensaje</h2>
            <form className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-black mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-4 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-black mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-4 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-black mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  id="phone"
                  className="w-full px-4 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-black mb-1">
                  Mensaje
                </label>
                <textarea
                  id="message"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-white py-3 px-6 hover:bg-primary-dark transition-colors"
              >
                Enviar Mensaje
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;