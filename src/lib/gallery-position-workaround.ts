// Gallery Position Workaround
// This module provides a workaround for the missing position column in gallery_images table

/**
 * Adds a virtual position property to gallery images based on their created_at timestamp
 * @param {Array} images - Array of gallery images from Supabase
 * @param {Object} options - Options for sorting
 * @param {boolean} options.descending - Whether to sort by newest first (default: true)
 * @returns {Array} - Images with added position property
 */
export function addVirtualPositionToImages(images: any[], options = { descending: true }) {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return [];
  }

  // Sort images by created_at
  const sortedImages = [...images].sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    return options.descending ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
  });

  // Add position property
  return sortedImages.map((image, index) => ({
    ...image,
    position: index + 1
  }));
}

/**
 * Example usage in a component:
 * 
 * import { supabase } from './lib/supabase';
 * import { addVirtualPositionToImages } from './lib/gallery-position-workaround';
 * 
 * async function fetchGalleryImages() {
 *   const { data, error } = await supabase
 *     .from('gallery_images')
 *     .select(`
 *       *,
 *       service:services!left (
 *         name,
 *         category
 *       )
 *     `)
 *     .order('created_at', { ascending: false });
 *   
 *   if (error) {
 *     console.error('Error fetching gallery images:', error);
 *     return [];
 *   }
 *   
 *   // Add virtual position property
 *   return addVirtualPositionToImages(data);
 * }
 */