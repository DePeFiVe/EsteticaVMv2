import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [status, setStatus] = useState<{
    submitting: boolean;
    error: string | null;
    success: boolean;
  }>({    submitting: false,
    error: null,
    success: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus({ submitting: true, error: null, success: false });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          to: 'contacto@esteticavm.com'
        })
      });

      if (!response.ok) {
        throw new Error('Error al enviar el mensaje');
      }

      setStatus({ submitting: false, error: null, success: true });
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      setStatus({
        submitting: false,
        error: 'Hubo un error al enviar el mensaje. Por favor, intente nuevamente.',
        success: false
      });
    }
  };

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
                    <p className="text-gray-600">San José 1172, Montevideo</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="h-6 w-6 text-primary mt-1 mr-4" />
                  <div>
                    <h3 className="font-semibold mb-1 text-black">Teléfono</h3>
                    <p className="text-gray-600">+598 92 636 038</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail className="h-6 w-6 text-primary mt-1 mr-4" />
                  <div>
                    <h3 className="font-semibold mb-1 text-black">Email</h3>
                    <p className="text-gray-600">contacto@esteticavm.com</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Clock className="h-6 w-6 text-primary mt-1 mr-4" />
                  <div>
                    <h3 className="font-semibold mb-1 text-black">Horario</h3>
                    <p className="text-gray-600">Lunes a Viernes: 12:30 - 19:30</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div 
            className="bg-cover bg-center relative shadow-lg"
            style={{
              backgroundImage: 'url("https://i.imgur.com/GGM5Nr6.jpeg")'
            }}
          >
            <div className="absolute inset-0 bg-black/70"></div>
            <div className="relative p-8">
              <h2 className="text-2xl font-bold mb-6 text-white">Envíanos un Mensaje</h2>
              {status.success && (
                <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
                  Mensaje enviado exitosamente. Nos pondremos en contacto contigo pronto.
                </div>
              )}
              {status.error && (
                <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
                  {status.error}
                </div>
              )}
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-white mb-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-white mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-white mb-1">
                    Mensaje
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={status.submitting}
                  className="w-full bg-primary text-primary-accent py-3 px-6 hover:bg-primary-accent hover:text-primary transition-colors relative z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status.submitting ? 'Enviando...' : 'Enviar Mensaje'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;