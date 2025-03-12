/*
  # Agregar servicios de uñas

  1. Nuevos Servicios
    - Agrega servicios de manicura y pedicura a la categoría 'uñas'
    - Incluye servicios básicos y premium
    - Precios y duraciones basados en servicios similares del mercado

  2. Cambios
    - Inserta nuevos servicios en la tabla services
*/

INSERT INTO services (category, name, price, duration, description) VALUES
  -- Servicios de uñas
  ('uñas', 'Manicura Express', 590, 30, 'Limado, cutículas y esmaltado básico'),
  ('uñas', 'Manicura Spa', 890, 45, 'Incluye exfoliación, masaje y esmaltado premium'),
  ('uñas', 'Pedicura Express', 790, 40, 'Limado, cutículas y esmaltado básico'),
  ('uñas', 'Pedicura Spa', 1090, 60, 'Tratamiento completo con exfoliación y masaje'),
  ('uñas', 'Esmaltado Semipermanente', 990, 45, 'Duración de 2 a 3 semanas'),
  ('uñas', 'Uñas Acrílicas', 1590, 90, 'Colocación completa de uñas acrílicas'),
  ('uñas', 'Mantenimiento Acrílicas', 990, 60, 'Mantenimiento de uñas acrílicas'),
  ('uñas', 'Nail Art', 290, 15, 'Diseños y decoración por uña');