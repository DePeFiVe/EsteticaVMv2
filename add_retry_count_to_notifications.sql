-- Script para añadir la columna retry_count a la tabla notifications

-- Añadir la columna retry_count con valor predeterminado 0
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Añadir la columna next_retry_at para gestionar los reintentos
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- Comentario explicativo
COMMENT ON COLUMN notifications.retry_count IS 'Contador de reintentos para envío de notificaciones fallidas';
COMMENT ON COLUMN notifications.next_retry_at IS 'Fecha y hora programada para el próximo reintento';

-- Actualizar las notificaciones existentes para establecer retry_count en 0
UPDATE notifications
SET retry_count = 0
WHERE retry_count IS NULL;