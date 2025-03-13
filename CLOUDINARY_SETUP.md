# Configuración de Cloudinary para Subir Imágenes WebP

Este documento explica cómo configurar y utilizar Cloudinary para subir imágenes en formato WebP a la galería de la aplicación.

## Requisitos Previos

1. Cuenta en Cloudinary (puedes registrarte gratis en [cloudinary.com](https://cloudinary.com))
2. Obtener las credenciales de API de Cloudinary:
   - Cloud Name
   - API Key
   - API Secret

## Configuración

### 1. Configurar Variables de Entorno

Edita el archivo `.env` y completa las siguientes variables con tus credenciales de Cloudinary:

```
VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name
VITE_CLOUDINARY_API_KEY=tu_api_key
VITE_CLOUDINARY_API_SECRET=tu_api_secret
VITE_CLOUDINARY_UPLOAD_PRESET=gallery_preset
```

### 2. Crear un Upload Preset en Cloudinary

1. Inicia sesión en tu cuenta de Cloudinary
2. Ve a Settings > Upload
3. Desplázate hacia abajo hasta "Upload presets"
4. Haz clic en "Add upload preset"
5. Configura el preset con los siguientes ajustes:
   - Nombre: `gallery_preset` (o el que hayas definido en .env)
   - Signing Mode: Signed
   - Folder: gallery
   - Delivery Type: Upload
   - Format: WebP
   - Quality: Auto (recomendado para optimizar el tamaño)

## Uso

La aplicación ahora está configurada para subir imágenes a Cloudinary y convertirlas automáticamente a formato WebP. Cuando subas una imagen a través del formulario de "Agregar Imagen" en la galería, ocurrirá lo siguiente:

1. La imagen se subirá a Cloudinary
2. Cloudinary convertirá la imagen al formato WebP con calidad optimizada
3. La URL de la imagen WebP se guardará en la base de datos
4. La imagen se mostrará en la galería en formato WebP

## Beneficios del Formato WebP

- Tamaños de archivo hasta un 30% más pequeños que JPEG con la misma calidad visual
- Soporte para transparencia como PNG pero con mejor compresión
- Carga más rápida de la página web
- Menor consumo de ancho de banda para los usuarios

## Solución de Problemas

Si encuentras problemas al subir imágenes:

1. Verifica que las credenciales de Cloudinary en el archivo `.env` sean correctas
2. Asegúrate de que el upload preset exista y esté configurado correctamente
3. Revisa la consola del navegador para ver mensajes de error detallados
4. Verifica que tu cuenta de Cloudinary tenga suficientes créditos disponibles