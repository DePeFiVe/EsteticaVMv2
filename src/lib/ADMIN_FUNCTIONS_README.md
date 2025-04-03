# Funciones Administrativas para EsteticaVM

Este documento describe las funciones administrativas disponibles en el sistema que utilizan el cliente `supabaseAdmin` con la service role key para operaciones privilegiadas que requieren omitir las políticas de seguridad a nivel de fila (RLS).

## Requisitos Previos

Para que estas funciones administrativas funcionen correctamente, se deben cumplir los siguientes requisitos:

1. La variable de entorno `SUPABASE_SERVICE_ROLE_KEY` debe estar configurada en el servidor.
2. Las funciones SQL definidas en `adminSqlFunctions.sql` deben estar instaladas en la base de datos de Supabase.
3. El usuario que intenta realizar operaciones administrativas debe estar registrado en la tabla `admins`.

## Archivos Relacionados

- `supabase.ts`: Contiene la configuración del cliente `supabaseAdmin`.
- `admin.ts`: Contiene funciones para verificar si un usuario es administrador.
- `adminOperations.ts`: Contiene operaciones administrativas básicas.
- `supabaseAdmin.ts`: Contiene funciones administrativas específicas que utilizan el cliente `supabaseAdmin`.
- `adminSqlFunctions.sql`: Contiene las funciones SQL necesarias para las operaciones administrativas.

## Funciones Disponibles

### Gestión de Usuarios

#### `getAllUsers()`

Obtiene todos los usuarios registrados en el sistema.

```typescript
import { getAllUsers } from '../lib/supabaseAdmin';

async function listarUsuarios() {
  const result = await getAllUsers();
  if (result.success) {
    console.log('Usuarios:', result.data);
  } else {
    console.error('Error:', result.error);
  }
}
```

#### `updateUserMetadata(userId, metadata)`

Actualiza los metadatos de un usuario.

```typescript
import { updateUserMetadata } from '../lib/supabaseAdmin';

async function actualizarMetadatos(userId: string) {
  const result = await updateUserMetadata(userId, {
    nombre_completo: 'Juan Pérez',
    telefono: '+598 99 123 456'
  });
  
  if (result.success) {
    console.log('Metadatos actualizados correctamente');
  } else {
    console.error('Error:', result.error);
  }
}
```

#### `setUserBlockedStatus(userId, blocked)`

Bloquea o desbloquea un usuario.

```typescript
import { setUserBlockedStatus } from '../lib/supabaseAdmin';

async function bloquearUsuario(userId: string) {
  const result = await setUserBlockedStatus(userId, true);
  
  if (result.success) {
    console.log('Usuario bloqueado correctamente');
  } else {
    console.error('Error:', result.error);
  }
}

async function desbloquearUsuario(userId: string) {
  const result = await setUserBlockedStatus(userId, false);
  
  if (result.success) {
    console.log('Usuario desbloqueado correctamente');
  } else {
    console.error('Error:', result.error);
  }
}
```

### Gestión de Datos

#### `migrateData(sourceTable, targetTable, mappings)`

Realiza una migración de datos masiva entre tablas.

```typescript
import { migrateData } from '../lib/supabaseAdmin';

async function migrarDatos() {
  const result = await migrateData(
    'usuarios_antiguos',
    'usuarios_nuevos',
    {
      'id': 'user_id',
      'nombre': 'first_name',
      'apellido': 'last_name',
      'email': 'email'
    }
  );
  
  if (result.success) {
    console.log(`Migración completada. ${result.count} registros migrados.`);
  } else {
    console.error('Error:', result.error);
  }
}
```

#### `purgeData(table, condition)`

Realiza una operación de limpieza de datos en una tabla.

```typescript
import { purgeData } from '../lib/supabaseAdmin';

async function limpiarDatos() {
  // Eliminar citas canceladas con más de 1 año de antigüedad
  const result = await purgeData(
    'appointments',
    "status = 'cancelled' AND date < NOW() - INTERVAL '1 year'"
  );
  
  if (result.success) {
    console.log(`Limpieza completada. ${result.count} registros eliminados.`);
  } else {
    console.error('Error:', result.error);
  }
}
```

### Copias de Seguridad

#### `backupTable(table)`

Crea una copia de seguridad de una tabla.

```typescript
import { backupTable } from '../lib/supabaseAdmin';

async function crearCopiaSeguridad() {
  const result = await backupTable('appointments');
  
  if (result.success) {
    console.log(`Copia de seguridad creada: ${result.data.backupTable}`);
    console.log(`Registros copiados: ${result.data.count}`);
  } else {
    console.error('Error:', result.error);
  }
}
```

#### `restoreFromBackup(backupTable, targetTable, dropTarget)`

Restaura una tabla desde una copia de seguridad.

```typescript
import { restoreFromBackup } from '../lib/supabaseAdmin';

async function restaurarDesdeBackup() {
  const result = await restoreFromBackup(
    'appointments_backup_20230101_120000',
    'appointments',
    false // No eliminar la tabla destino, solo vaciarla
  );
  
  if (result.success) {
    console.log(`Restauración completada. ${result.count} registros restaurados.`);
  } else {
    console.error('Error:', result.error);
  }
}
```

## Consideraciones de Seguridad

- Estas funciones omiten las políticas de seguridad a nivel de fila (RLS), por lo que deben utilizarse con precaución.
- Solo los usuarios registrados en la tabla `admins` pueden ejecutar estas funciones.
- La clave de servicio (service role key) nunca debe exponerse en el cliente. Estas funciones deben ejecutarse únicamente en el servidor o en un entorno seguro.
- Se recomienda implementar un sistema de auditoría para registrar todas las operaciones administrativas realizadas.

## Instalación de Funciones SQL

Para instalar las funciones SQL necesarias, ejecute el archivo `adminSqlFunctions.sql` en la base de datos de Supabase. Puede hacerlo desde la interfaz de SQL de Supabase o utilizando la herramienta de línea de comandos de Supabase.

```bash
supabase db execute --file ./src/lib/adminSqlFunctions.sql
```

## Solución de Problemas

### El cliente administrativo no está disponible

Verifique que la variable de entorno `SUPABASE_SERVICE_ROLE_KEY` esté configurada correctamente en el servidor.

### Error al ejecutar funciones SQL

Verifique que las funciones SQL definidas en `adminSqlFunctions.sql` estén instaladas correctamente en la base de datos de Supabase.

### No tienes permisos para realizar esta operación

Verifique que el usuario que intenta realizar la operación esté registrado en la tabla `admins`.