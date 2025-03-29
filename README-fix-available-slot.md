# Corrección para Horarios Disponibles

Este documento contiene las instrucciones para aplicar manualmente la corrección que permite crear citas en horarios marcados como disponibles (`is_available_slot = true`).

## Problema

Actualmente, la función `check_appointment_overlap` no está interpretando correctamente los horarios marcados como disponibles, lo que impide crear citas incluso en horarios que deberían estar disponibles.

## Solución

Se ha creado un script SQL que corrige la función `check_appointment_overlap` para que:

1. Permita crear citas dentro de horarios marcados como disponibles (`is_available_slot = true`)
2. Solo rechace citas que se superpongan con horarios bloqueados (`is_available_slot = false`)

## Instrucciones para aplicar la corrección

1. Inicia sesión en el panel de administración de Supabase
2. Ve a la sección "SQL Editor"
3. Crea un nuevo script o abre uno existente
4. Copia y pega el contenido del archivo `fix-available-slot-manual.sql` en el editor
5. Ejecuta el script

## Verificación

Para verificar que la corrección se ha aplicado correctamente:

1. Intenta crear una cita en un horario marcado como disponible
2. Verifica que la cita se crea correctamente
3. Verifica que las citas en horarios bloqueados siguen siendo rechazadas

## Nota

Este script modifica la función `check_appointment_overlap` que es utilizada por los triggers de las tablas `appointments` y `guest_appointments`. No es necesario modificar los triggers, solo la función.