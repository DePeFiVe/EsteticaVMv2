/*
  # Agregar servicios de masajes

  1. Nuevos Servicios
    - Agrega nueva categoría 'masajes' con los siguientes servicios:
      - Masaje relajante (1 hora)
      - Masaje descontracturante (1 hora)
      - Maderoterapia (1 hora)
      - Bambuterapia (1 hora)
      - Drenaje linfático detox + exfoliación (1 hora)
      - Masaje con pistola de masaje (1 hora)
*/

INSERT INTO services (category, name, price, duration, description) VALUES
  -- Masajes
  ('masajes', 'Masaje relajante', 0, 60, 'Masaje relajante de cuerpo completo'),
  ('masajes', 'Masaje descontracturante', 0, 60, 'Masaje terapéutico para liberar tensiones musculares'),
  ('masajes', 'Maderoterapia', 0, 60, 'Técnica de masaje con instrumentos de madera'),
  ('masajes', 'Bambuterapia', 0, 60, 'Masaje con cañas de bambú para relajación profunda'),
  ('masajes', 'Drenaje linfático detox + exfoliación', 0, 60, 'Tratamiento completo de drenaje linfático con exfoliación'),
  ('masajes', 'Masaje con pistola de masaje', 0, 60, 'Masaje con dispositivo de percusión para alivio muscular');