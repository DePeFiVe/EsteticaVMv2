/*
  # Seed services data
  
  1. Purpose
    - Populate the services table with initial data for all service categories
    
  2. Data
    - Includes all services with proper UUIDs and categories
    - Maintains consistent pricing and duration information
*/

INSERT INTO services (category, name, price, duration, description) VALUES
  -- Cejas
  ('cejas', 'Diseño y perfilado', 650, 40, 'Diseño personalizado y perfilado de cejas'),
  ('cejas', 'Laminado', 1290, 60, 'Incluye perfilado'),
  ('cejas', 'Henna o tinte', 990, 60, 'Incluye perfilado'),
  ('cejas', 'Microblading', 6990, 180, 'Técnica semipermanente para cejas perfectamente definidas'),
  ('cejas', 'Mantenimiento microblading', 0, 40, 'Sin costo a los 45 días'),
  ('cejas', 'Remoción química', 990, 30, 'Remoción segura de pigmentos'),
  
  -- Labios
  ('labios', 'BB Lips', 2990, 90, 'Tratamiento para unos labios naturalmente realzados'),
  ('labios', 'Hidra Gloss', 1990, 40, 'Hidratación profunda con efecto glossy'),
  ('labios', 'Micropigmentación', 6990, 180, 'Definición y color semipermanente'),
  ('labios', 'Retoque de micropigmentación', 0, 40, 'A los 45 días sin costo'),
  
  -- Pestañas
  ('pestañas', 'Lifting de pestañas', 1390, 90, 'Elevación y curvatura natural de tus pestañas'),
  ('pestañas', 'Extensiones pelo a pelo - Colocación inicial', 1390, 120, 'Extensiones naturales pelo a pelo'),
  ('pestañas', 'Extensiones pelo a pelo - Mantenimiento', 1190, 120, 'Mantenimiento a los 21 días'),
  ('pestañas', 'Extensiones con volumen - Colocación inicial', 1490, 120, 'Extensiones con efecto volumen'),
  ('pestañas', 'Extensiones con volumen - Mantenimiento', 1190, 120, 'Mantenimiento a los 21 días'),
  
  -- Facial
  ('facial', 'Limpieza facial profunda', 1200, 60, 'Limpieza profunda para una piel radiante'),
  ('facial', 'Peeling', 1500, 60, 'Renovación celular para una piel más joven'),
  ('facial', 'Dermaplaning', 1590, 60, 'Exfoliación mecánica para una piel suave'),
  ('facial', 'Hilos Cosmetológicos', 3990, 60, 'Tratamiento tensor no invasivo'),
  ('facial', 'BB Glow', 1990, 60, 'Tratamiento para unificar el tono de la piel'),
  ('facial', 'Aparatología facial completa', 1590, 90, 'Incluye: Dermapen, radiofrecuencia facial, punta de diamantes, espátula ultrasónica, fototerapia led y limpieza facial'),
  
  -- Packs
  ('packs', 'Lifting de pestañas + Perfilado de cejas', 1590, 90, 'Combo perfecto para realzar tu mirada'),
  ('packs', 'Lifting de pestañas + Perfilado y Laminado de cejas', 1990, 120, 'Tratamiento completo para una mirada impactante'),
  ('packs', 'Perfilado de cejas + Bozo', 850, 40, 'Combo de depilación facial'),
  ('packs', 'Limpieza facial + Perfilado de cejas + Depilación bozo', 1590, 90, 'Tratamiento facial completo'),
  ('packs', 'Extensiones de pestañas + Perfilado de cejas', 1690, 150, 'Mirada perfecta con extensiones y cejas definidas');