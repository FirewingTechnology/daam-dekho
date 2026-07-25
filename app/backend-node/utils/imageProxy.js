/**
 * Image Proxy and Fallback System
 * Handles image URL validation, proxying, and fallback images
 */

const FALLBACK_IMAGES = {
  default: 'https://via.placeholder.com/400x400?text=Image+Not+Available',
  laptop: 'https://via.placeholder.com/400x400?text=Laptop',
  mobile: 'https://via.placeholder.com/400x400?text=Mobile',
  accessory: 'https://via.placeholder.com/400x400?text=Accessory',
  electronics: 'https://via.placeholder.com/400x400?text=Electronics'
};

// Image hosting providers that block hotlinking
const BLOCKED_DOMAINS = [
  'images.unsplash.com',
  'images.pexels.com'
];

/**
 * Validate image URL
 */
export function validateImageUrl(url) {
  if (!url || typeof url !== 'string') {
    return {
      valid: false,
      reason: 'URL is empty or not a string'
    };
  }

  try {
    const urlObj = new URL(url);
    
    // Check for http/https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        valid: false,
        reason: 'Invalid protocol'
      };
    }

    // Check for blocked domains
    if (BLOCKED_DOMAINS.some(domain => urlObj.hostname.includes(domain))) {
      return {
        valid: false,
        reason: 'Domain blocks hotlinking',
        url,
        recommended: 'proxy'
      };
    }

    return {
      valid: true,
      url
    };
  } catch (e) {
    return {
      valid: false,
      reason: 'Invalid URL format'
    };
  }
}

/**
 * Get proxy URL for image
 */
export function getProxyUrl(imageUrl, proxyService = 'simple') {
  if (!imageUrl) return FALLBACK_IMAGES.default;

  const encodedUrl = encodeURIComponent(imageUrl);

  const proxies = {
    simple: `https://images.weserv.nl/?url=${encodedUrl}`,
    cors: `https://cors-anywhere.herokuapp.com/${imageUrl}`,
    imgproxy: `https://img.example.com/unsafe/400x400/${encodedUrl}`
  };

  return proxies[proxyService] || proxies.simple;
}

/**
 * Process image URLs with validation and fallback
 */
export function processImageUrls(urls, options = {}) {
  const {
    useProxy = true,
    category = 'default',
    maxUrls = 5,
    validateUrls = true
  } = options;

  if (!urls) {
    return {
      primary: FALLBACK_IMAGES[category] || FALLBACK_IMAGES.default,
      fallbacks: [],
      processed: false
    };
  }

  const urlArray = Array.isArray(urls) ? urls : [urls];
  const processed = [];
  const fallbacks = [];

  urlArray.slice(0, maxUrls).forEach((url, index) => {
    const validation = validateImageUrl(url);

    if (validation.valid) {
      processed.push({
        url,
        order: index,
        validated: true,
        fallback: false
      });
    } else if (useProxy && validation.recommended === 'proxy') {
      const proxyUrl = getProxyUrl(url);
      processed.push({
        url: proxyUrl,
        order: index,
        validated: true,
        fallback: false,
        proxied: true,
        originalUrl: url
      });
    } else {
      fallbacks.push({
        url,
        reason: validation.reason,
        fallback: true
      });
    }
  });

  // If no valid images, use fallback
  if (processed.length === 0) {
    return {
      primary: FALLBACK_IMAGES[category] || FALLBACK_IMAGES.default,
      fallbacks: [FALLBACK_IMAGES.default],
      processed: false,
      errors: fallbacks
    };
  }

  return {
    primary: processed[0].url,
    all: processed,
    fallbacks: processed.slice(1),
    processed: true,
    totalProcessed: processed.length,
    failedUrls: fallbacks
  };
}

/**
 * Get best image for display
 */
export function getBestImage(urls, options = {}) {
  const processed = processImageUrls(urls, options);
  return {
    url: processed.primary,
    isProxied: processed.all[0]?.proxied || false,
    alternatives: processed.all.slice(1).map(img => img.url),
    fallback: processed.processed === false,
    fallbackReason: processed.errors?.[0]?.reason
  };
}

/**
 * Generate fallback image based on category
 */
export function getFallbackImage(category) {
  return FALLBACK_IMAGES[category?.toLowerCase()] || FALLBACK_IMAGES.default;
}

/**
 * Check if URL should use CORS proxy
 */
export function needsCorsProxy(imageUrl) {
  try {
    const url = new URL(imageUrl);
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : null;
    
    // If no window context (backend), assume yes
    if (!currentOrigin) return true;

    return url.origin !== currentOrigin;
  } catch (e) {
    return true;
  }
}

/**
 * Format images for API response
 */
export function formatImagesForResponse(imageUrls, category = 'default') {
  const processed = processImageUrls(imageUrls, {
    category,
    useProxy: true,
    maxUrls: 10
  });

  return {
    primary: processed.primary,
    thumbnail: processed.primary,
    gallery: processed.all.map(img => ({
      url: img.url,
      proxied: img.proxied || false,
      order: img.order
    })),
    fallback: processed.primary === FALLBACK_IMAGES[category] || processed.primary === FALLBACK_IMAGES.default,
    total: processed.totalProcessed,
    errors: processed.failedUrls || []
  };
}

/**
 * Validate all images in product data
 */
export function validateProductImages(product) {
  const result = {
    valid: false,
    primaryImage: null,
    images: [],
    issues: []
  };

  if (!product.image_urls) {
    result.issues.push('No image URLs provided');
    result.primaryImage = FALLBACK_IMAGES.default;
    return result;
  }

  const urls = Array.isArray(product.image_urls) ? product.image_urls : [product.image_urls];
  
  urls.forEach((url, index) => {
    const validation = validateImageUrl(url);
    if (validation.valid) {
      if (index === 0) {
        result.primaryImage = url;
        result.valid = true;
      }
      result.images.push({
        url,
        order: index,
        valid: true
      });
    } else {
      result.issues.push(`Image ${index + 1}: ${validation.reason}`);
    }
  });

  // Use fallback if no valid primary
  if (!result.primaryImage) {
    result.primaryImage = FALLBACK_IMAGES[product.category] || FALLBACK_IMAGES.default;
  }

  return result;
}
