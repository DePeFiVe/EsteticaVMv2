/*
  # Add sample gallery images

  This migration adds sample images to the gallery for testing purposes.
  All images are from Unsplash and are publicly available.
*/

-- Insert sample images for various services
INSERT INTO gallery_images (service_id, image_url, description)
SELECT 
  s.id,
  CASE s.category
    WHEN 'cejas' THEN 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=800&q=80'
    WHEN 'pestañas' THEN 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=800&q=80'
    WHEN 'facial' THEN 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80'
    WHEN 'labios' THEN 'https://images.unsplash.com/photo-1588006173527-0fd5f9ae60c9?auto=format&fit=crop&w=800&q=80'
  END as image_url,
  'Ejemplo de ' || s.name as description
FROM services s
WHERE s.category IN ('cejas', 'pestañas', 'facial', 'labios')
AND NOT EXISTS (
  SELECT 1 FROM gallery_images g WHERE g.service_id = s.id
);