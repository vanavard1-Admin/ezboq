/**
 * Image Preloader Utility
 * Preloads images to prevent slow loading and improve UX
 */

interface PreloadOptions {
  timeout?: number; // Max time to wait (ms)
  priority?: 'high' | 'low';
}

/**
 * Preload a single image
 */
export async function preloadImage(
  src: string,
  options: PreloadOptions = {}
): Promise<void> {
  const { timeout = 5000, priority = 'high' } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Set priority hint for browser
    if (priority === 'high') {
      img.loading = 'eager';
    }

    let timeoutId: number | null = null;

    // Timeout handler
    if (timeout > 0) {
      timeoutId = window.setTimeout(() => {
        console.warn(`Image preload timeout: ${src}`);
        resolve(); // Resolve anyway to prevent blocking
      }, timeout);
    }

    img.onload = () => {
      if (timeoutId) clearTimeout(timeoutId);
      resolve();
    };

    img.onerror = (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      console.error(`Failed to preload image: ${src}`, error);
      resolve(); // Resolve anyway to prevent blocking
    };

    img.src = src;
  });
}

/**
 * Preload multiple images in parallel
 */
export async function preloadImages(
  sources: string[],
  options: PreloadOptions = {}
): Promise<void> {
  const startTime = performance.now();
  
  // ⚡ Filter out already cached images
  const uncachedSources = sources.filter(src => !isImageCached(src));
  
  if (uncachedSources.length === 0) {
    console.log(`⚡ All ${sources.length} images already cached! (0ms)`);
    return;
  }
  
  if (uncachedSources.length < sources.length) {
    console.log(`⚡ ${sources.length - uncachedSources.length} images cached, loading ${uncachedSources.length} more...`);
  }
  
  try {
    const promises = uncachedSources.map((src) => preloadImage(src, options));
    await Promise.allSettled(promises);
    
    const duration = performance.now() - startTime;
    
    if (duration < 300) {
      console.log(`⚡ Lightning fast! Preloaded ${uncachedSources.length} images in ${duration.toFixed(0)}ms`);
    } else if (duration < 1000) {
      console.log(`✅ Preloaded ${uncachedSources.length} images in ${duration.toFixed(0)}ms`);
    } else {
      console.warn(`⚠️ Slow preload: ${uncachedSources.length} images took ${duration.toFixed(0)}ms (network may be slow)`);
    }
  } catch (error) {
    console.error('Error preloading images:', error);
    // Don't throw - graceful degradation
  }
}

/**
 * Preload images with progress callback
 */
export async function preloadImagesWithProgress(
  sources: string[],
  onProgress?: (loaded: number, total: number) => void,
  options: PreloadOptions = {}
): Promise<void> {
  const total = sources.length;
  let loaded = 0;

  const promises = sources.map(async (src) => {
    await preloadImage(src, options);
    loaded++;
    if (onProgress) {
      onProgress(loaded, total);
    }
  });

  await Promise.allSettled(promises);
}

/**
 * Check if image is already cached
 */
export function isImageCached(src: string): boolean {
  const img = new Image();
  img.src = src;
  return img.complete && img.naturalHeight !== 0;
}

/**
 * Preload critical assets for Login page
 */
export async function preloadLoginAssets(): Promise<void> {
  console.log('🔄 Preloading login page assets...');
  
  // Note: These imports won't work here since we can't import figma assets
  // This function should be called from the component with actual asset paths
  
  return Promise.resolve();
}
