// Cloudinary configuration for browser uploads

/**
 * Uploads an image to Cloudinary optimized for WebP format
 * @param {File} file - The file to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - The upload result with secure_url
 */
export const uploadImage = async (file: File, options: any = {}) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a FormData instance for browser-based upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Add the upload preset from environment variables
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'subida-directa';
      formData.append('upload_preset', uploadPreset);
      
      // Note: Format and quality are configured in the upload preset
      // instead of being set here to avoid issues with unsigned uploads
      
      // Add any custom options
      if (options) {
        Object.entries(options).forEach(([key, value]) => {
          // Handle arrays (like tags)
          if (Array.isArray(value)) {
            value.forEach(item => formData.append(`${key}[]`, item));
          } else {
            formData.append(key, String(value));
          }
        });
      }

      // Get the cloud name from environment variables
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) {
        return reject(new Error('Cloudinary cloud name is not configured'));
      }
      
      // Use the upload endpoint for the configured cloud name
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

      console.log('Uploading to Cloudinary:', {
        url: uploadUrl,
        preset: uploadPreset,
        fileName: file.name,
        fileSize: file.size,
        options: JSON.stringify(options)
      });

      // Perform the fetch request
      fetch(uploadUrl, {
        method: 'POST',
        body: formData
      })
        .then(response => {
          if (!response.ok) {
            console.error('Cloudinary upload failed with status:', response.status);
            return response.text().then(text => {
              throw new Error(`Upload failed with status: ${response.status}, message: ${text}`);
            });
          }
          return response.json();
        })
        .then(data => {
          console.log('Cloudinary upload successful:', data.secure_url);
          resolve({
            secure_url: data.secure_url,
            public_id: data.public_id,
            format: data.format || 'webp',
            original_filename: data.original_filename
          });
        })
        .catch(error => {
          console.error('Error uploading to Cloudinary:', error);
          reject(error);
        });
    } catch (error) {
      console.error('Error in uploadImage function:', error);
      reject(error);
    }
  });
};

/**
 * Generates a Cloudinary URL with WebP format
 * @param {string} publicId - The public ID of the image
 * @param {Object} options - Transformation options
 * @returns {string} - The optimized image URL
 */
export const getOptimizedImageUrl = (publicId: string, options: any = {}) => {
  // Default options for WebP optimization
  const defaultOptions = {
    format: 'webp',
    quality: 'auto:good',
    fetch_format: 'auto',
    dpr: 'auto',
    width: 'auto',
    loading: 'lazy',
    responsive: true
  };
  
  // Merge default options with provided options
  const transformationOptions = { ...defaultOptions, ...options };
  
  // Build the transformation string
  const transformations = Object.entries(transformationOptions)
    .map(([key, value]) => `${key}_${value}`)
    .join(',');
  
  // Construct the URL
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`;
};

/**
 * Preloads an image by creating a link preload tag in the document head
 * @param {string} imageUrl - The URL of the image to preload
 * @param {string} as - The type of content being loaded (default: 'image')
 * @param {string} type - The MIME type of the resource (optional)
 */
export const preloadImage = (imageUrl: string, as: string = 'image', type?: string) => {
  if (typeof document === 'undefined') return; // Skip during SSR
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = imageUrl;
  link.as = as;
  
  if (type) {
    link.type = type;
  }
  
  document.head.appendChild(link);
};