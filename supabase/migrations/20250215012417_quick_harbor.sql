/*
  # Agregar cédulas de administradores

  1. Cambios
    - Insertar nuevas cédulas de administradores
*/

INSERT INTO admins (ci) VALUES 
  ('11111111'),  -- Ejemplo de cédula de admin
  ('22222222'),  -- Ejemplo de cédula de admin
  ('33333333')   -- Ejemplo de cédula de admin
ON CONFLICT (ci) DO NOTHING;