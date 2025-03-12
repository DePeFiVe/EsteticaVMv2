-- Eliminar las citas relacionadas a los servicios antiguos de uñas
DELETE FROM appointments
WHERE service_id IN (
  SELECT id FROM services
  WHERE category = 'uñas'
  AND name IN (
    'Manicura Express',
    'Manicura Spa',
    'Pedicura Express',
    'Pedicura Spa',
    'Esmaltado Semipermanente',
    'Uñas Acrílicas',
    'Mantenimiento Acrílicas',
    'Nail Art'
  )
);

-- Eliminar las citas de invitados relacionadas a los servicios antiguos de uñas
DELETE FROM guest_appointments
WHERE service_id IN (
  SELECT id FROM services
  WHERE category = 'uñas'
  AND name IN (
    'Manicura Express',
    'Manicura Spa',
    'Pedicura Express',
    'Pedicura Spa',
    'Esmaltado Semipermanente',
    'Uñas Acrílicas',
    'Mantenimiento Acrílicas',
    'Nail Art'
  )
);

-- Eliminar los servicios antiguos de uñas
DELETE FROM services
WHERE category = 'uñas'
AND name IN (
  'Manicura Express',
  'Manicura Spa',
  'Pedicura Express',
  'Pedicura Spa',
  'Esmaltado Semipermanente',
  'Uñas Acrílicas',
  'Mantenimiento Acrílicas',
  'Nail Art'
);