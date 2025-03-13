import { useState, useEffect } from 'react';
import { Star, Clock, Shield, ChevronRight, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AppointmentModal from '../components/AppointmentModal';
import type { Service } from '../types';

const Home = () => {
  const [packs, setPacks] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

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

  const testimonials = [
    {
      text: "La mejor siempre! Amo las extensiones de pestañas y el laminado. No puedo vivir sin el, son un viaje de ida 🤣❤️",
      stars: 5,
      image: "https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=800&q=80"
    },
    {
      text: "La mejor siempre!! 🤍 no me faltes!!!",
      stars: 5,
      image: "https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=800&q=80"
    },
    {
      text: "Hermoso lugar, hermosa Valery siempre. Todo perfecto!!!",
      stars: 5,
      image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80"
    },
    {
      text: "Me hice laminado de cejas y quedé enamorada del resultado 😍",
      stars: 5,
      image: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=800&q=80"
    },
    {
      text: "Me encantó mi experiencia de lifting de pestañas. Valery fue muy atenta y cuidadosa en todo momento",
      stars: 5,
      image: "https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=800&q=80"
    }
  ];

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const services = [
    {
      title: 'Pestañas',
      image: new URL('/src/images/Pestanas - Portada web VM.webp', import.meta.url).href,
      link: '/services/pestañas'
    },
    {
      title: 'Labios',
      image: new URL('/src/images/Labios - PORTADA WEB VM .webp', import.meta.url).href,
      link: '/services/labios'
    },
    {
      title: 'Tratamientos Faciales',
      image: new URL('/src/images/Faciales - Portada web VM.webp', import.meta.url).href,
      link: '/services/facial'
    },
    {
      title: 'Cejas',
      image: new URL('/src/images/Cejas - Portada web VM.webp', import.meta.url).href,
      link: '/services/cejas'
    },
    {
      title: 'Uñas',
      image: 'https://i.pinimg.com/564x/11/97/e8/1197e815c14404726c363e27876f0ef4.jpg',
      link: '/services/uñas'
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
              src={new URL('/src/images/Portada Inicio web - VM.PNG', import.meta.url).href}
              alt="Valery Miranda Cosmetóloga"
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                console.error(`Error loading logo image`);
                e.currentTarget.src = 'https://placehold.co/1200x675?text=Valery+Miranda+Cosmetóloga';
              }}
            />
            {/* Schedule button - Corner positioning for desktop, mobile-friendly for small screens */}
            <div className="absolute bottom-2 left-0 md:bottom-8 md:left-[-10px] p-0">
              <button
                onClick={scrollToServices}
                className="bg-white text-primary-accent px-3 py-1 text-xs md:px-6 md:py-3 md:text-lg hover:bg-black/90 hover:text-white transition-colors border border-[#EC8FD0] shadow-[0_0_10px_0_#EC8FD0] rounded-md"
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
                className="bg-white p-8 border border-gray-100 hover:border-primary-accent transition-all duration-300 group flex flex-col"
              >
                <div className="flex-grow mb-6">
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
                  className="w-full bg-primary text-primary-accent py-3 hover:bg-black/90 transition-colors mt-auto"
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
          <p className="text-xl font-light italic leading-relaxed mb-6 text-[#FFFFFF]">
            "Mi objetivo es crear un espacio de relax combinando servicio y calidez humana 
            para hacer sentir a cada persona especial"
          </p>
          <p className="text-lg font-light italic leading-relaxed mb-2 text-[#FFFFFF]">
            - Valery Miranda
          </p>
        </div>
      </div>

      {/* Reviews Carousel Section */}
      <div 
        className="py-16 bg-cover bg-center relative"
        style={{
          backgroundImage: `url("${new URL('/src/images/Background testimonials.jpeg', import.meta.url).href}")`
        }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              {/* Carousel Navigation */}
              <button 
                onClick={prevTestimonial}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 text-white hover:text-primary-accent transition-colors"
                aria-label="Testimonio anterior"
              >
                <ChevronLeft className="h-10 w-10" />
              </button>
              
              <button 
                onClick={nextTestimonial}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 text-white hover:text-primary-accent transition-colors"
                aria-label="Siguiente testimonio"
              >
                <ChevronRight className="h-10 w-10" />
              </button>
              
              {/* Testimonial Card */}
              <div className="bg-white p-8 mx-12">
                <div className="flex justify-center mb-4">
                  {[...Array(testimonials[currentTestimonial].stars)].map((_, i) => (
                    <Star key={i} className="h-6 w-6 text-pink-400 fill-pink-400" />
                  ))}
                </div>
                <p className="text-xl font-medium text-black mb-6 text-center">
                  {testimonials[currentTestimonial].text}
                </p>
              </div>
              
              {/* Contact Button - Centered */}
              <div className="absolute -bottom-12 left-0 right-0 z-10 w-full flex justify-center">
                <Link
                  to="/contact"
                  className="inline-flex items-center bg-primary text-primary-accent px-4 sm:px-6 py-2 text-base sm:text-lg hover:bg-white hover:text-primary transition-colors group shadow-lg"
                >
                  Contáctanos
                  <ChevronRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              
              {/* Carousel Indicators */}
              <div className="flex justify-center mt-4 space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`w-3 h-3 rounded-full ${
                      currentTestimonial === index ? 'bg-primary-accent' : 'bg-white/50'
                    }`}
                    aria-label={`Ir al testimonio ${index + 1}`}
                  />
                ))}
              </div>
            </div>
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
