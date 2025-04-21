// Cloudinary configuration for browser uploads

/**
 * Uploads an image to Cloudinary using unsigned upload preset
 * @param {File} file - The file to upload
 * @param {Object} options - Upload options (only allowed parameters for unsigned uploads)
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
      
      // Add only allowed options for unsigned uploads
      const allowedParams = [
        'public_id',
        'folder',
        'tags',
        'context',
        'metadata',
        'face_coordinates',
        'custom_coordinates',
        'filename_override',
        'asset_folder',
        'manifest_json',
        'manifest_transformation',
        'template',
        'template_vars',
        'regions',
        'public_id_prefix'
      ];

      if (options) {
        Object.entries(options).forEach(([key, value]) => {
          if (allowedParams.includes(key)) {
            if (Array.isArray(value)) {
              value.forEach(item => formData.append(`${key}[]`, item));
            } else {
              formData.append(key, String(value));
            }
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
        fileSize: file.size
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
            format: data.format,
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
 * Gets the Cloudinary URL for an image
 * @param {string} publicId - The public ID of the image
 * @returns {string} - The image URL
 */
export const getOptimizedImageUrl = (publicId: string) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`;
};

/**
 * Preloads an image by creating a link preload tag in the document head
 * @param {string} imageUrl - The URL of the image to preload
 * @param {string} as - The type of content being loaded (default: 'image')
 */
export const preloadImage = (imageUrl: string, as: string = 'image') => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = imageUrl;
  link.as = as;
  document.head.appendChild(link);
};