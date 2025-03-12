/*
  # Galería de trabajos realizados

  1. Nueva Tabla
    - `gallery_images`
      - `id` (uuid, primary key)
      - `service_id` (uuid, referencia a services)
      - `image_url` (text, URL de la imagen)
      - `description` (text, descripción opcional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Políticas para lectura pública
    - Políticas para escritura solo por admins
*/

CREATE TABLE IF NOT EXISTS gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública
CREATE POLICY "Anyone can view gallery images"
  ON gallery_images
  FOR SELECT
  TO public
  USING (true);

-- Solo admins pueden insertar imágenes
CREATE POLICY "Admins can insert gallery images"
  ON gallery_images
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN admins a ON u.ci = a.ci
      WHERE u.id = auth.uid()
    )
  );

-- Solo admins pueden eliminar imágenes
CREATE POLICY "Admins can delete gallery images"
  ON gallery_images
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN admins a ON u.ci = a.ci
      WHERE u.id = auth.uid()
    )
  );