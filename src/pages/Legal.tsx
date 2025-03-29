import React from 'react';

const Legal = () => {
  return (
    <div className="min-h-screen py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-black mb-4">Aviso Legal</h1>
          <p className="text-xl text-gray-600">
            Información legal sobre nuestra empresa y servicios
          </p>
        </div>

        <div className="bg-white shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6 text-black">Información de la Empresa</h2>
          <div className="space-y-4">
            <p className="text-gray-700">
              <span className="font-semibold">Nombre legal:</span> MIRANDA DE VERA SHISLAYNE VALERY
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Nombre comercial:</span> Estética VM
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Dirección:</span> San José 1172, Montevideo, Uruguay
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Teléfono:</span> +598 92 636 038
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Email:</span> contacto@esteticavm.com
            </p>
          </div>
        </div>

        <div className="bg-white shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6 text-black">Términos y Condiciones</h2>
          <div className="space-y-4">
            <p className="text-gray-700">
              El presente aviso legal regula el uso del sitio web www.esteticavm.com, del que es titular MIRANDA DE VERA SHISLAYNE VALERY.
            </p>
            <p className="text-gray-700">
              La navegación por el sitio web atribuye la condición de usuario del mismo e implica la aceptación plena y sin reservas de todas y cada una de las disposiciones incluidas en este Aviso Legal, que pueden sufrir modificaciones.
            </p>
            <p className="text-gray-700">
              El usuario se obliga a hacer un uso correcto del sitio web de conformidad con las leyes, la buena fe, el orden público, los usos del tráfico y el presente Aviso Legal.
            </p>
          </div>
        </div>

        <div className="bg-white shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6 text-black">Política de Privacidad</h2>
          <div className="space-y-4">
            <p className="text-gray-700">
              En cumplimiento de la normativa vigente en materia de protección de datos personales, se informa que los datos personales que sean facilitados a través de los formularios de este sitio web serán tratados por MIRANDA DE VERA SHISLAYNE VALERY como responsable del tratamiento.
            </p>
            <p className="text-gray-700">
              La finalidad de la recogida y tratamiento de los datos personales es la gestión de los servicios solicitados por el usuario, así como el envío de comunicaciones sobre nuestros servicios.
            </p>
            <p className="text-gray-700">
              El usuario tiene derecho a acceder, rectificar y suprimir los datos, así como otros derechos, como se explica en la información adicional sobre protección de datos.
            </p>
          </div>
        </div>

        <div className="bg-white shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-black">Propiedad Intelectual e Industrial</h2>
          <div className="space-y-4">
            <p className="text-gray-700">
              Los derechos de propiedad intelectual e industrial derivados de todos los textos, imágenes, así como de los medios y formas de presentación y montaje de sus páginas pertenecen, por sí o como cesionaria, a MIRANDA DE VERA SHISLAYNE VALERY.
            </p>
            <p className="text-gray-700">
              Serán, por consiguiente, obras protegidas como propiedad intelectual por el ordenamiento jurídico uruguayo, siéndoles aplicables tanto la normativa uruguaya como internacional en este campo.
            </p>
            <p className="text-gray-700">
              Queda prohibida la reproducción, distribución, comercialización, transformación, y en general, cualquier otra forma de explotación, sin la previa autorización escrita de sus titulares.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Legal;