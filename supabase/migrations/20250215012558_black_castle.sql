/*
  # Agregar cédula específica como administrador

  1. Cambios
    - Agregar la cédula 52668468 como administrador
*/

INSERT INTO admins (ci) VALUES ('52668468')
ON CONFLICT (ci) DO NOTHING;