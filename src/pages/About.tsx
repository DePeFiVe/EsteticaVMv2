import React from 'react';
import { Heart, Award, Users } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-black mb-4">
            Sobre Nosotros
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Con más de una década de experiencia, nos dedicamos a realzar la belleza natural de cada persona que nos visita.
          </p>
        </div>

        {/* Values Section */}
        <div className="grid md:grid-cols-3 gap-12 mb-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-black">Pasión por la Belleza</h3>
            <p className="text-gray-600">
              Nos apasiona ayudar a nuestros clientes a verse y sentirse mejor cada día.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Award className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-black">Calidad Garantizada</h3>
            <p className="text-gray-600">
              Utilizamos productos de primera calidad y técnicas avanzadas para resultados excepcionales.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-black">Equipo Profesional</h3>
            <p className="text-gray-600">
              Nuestro equipo está formado por profesionales certificados y en constante capacitación.
            </p>
          </div>
        </div>

        {/* Team Section */}
        <div className="bg-white shadow-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-black">Nuestro Equipo</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'María González',
                role: 'Directora & Especialista en Microblading',
                image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
              },
              {
                name: 'Ana Silva',
                role: 'Especialista en Tratamientos Faciales',
                image: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
              },
              {
                name: 'Laura Martínez',
                role: 'Especialista en Pestañas',
                image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80'
              }
            ].map((member, index) => (
              <div key={index} className="text-center">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-48 h-48 mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-semibold mb-1 text-black">{member.name}</h3>
                <p className="text-gray-600">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;