import axios from 'axios';

let rawUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_URL;
if (!rawUrl) {
  if (import.meta.env.DEV) {
    rawUrl = 'http://localhost:8001/api';
  } else {
    rawUrl = 'https://dev-daam-dekho.onrender.com/api';
  }
}
if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
  rawUrl = `https://${rawUrl}`;
}
if (rawUrl && !rawUrl.endsWith('/api')) {
  rawUrl = `${rawUrl.replace(/\/$/, '')}/api`;
}
const API_BASE_URL = rawUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Attach JWT token if present
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 404) {
      console.warn('Resource not found:', error.config?.url);
    } else if (error.response?.status >= 500) {
      console.error('Server error:', error.config?.url);
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.warn('Request timeout during server warm-up:', error.config?.url);
    } else if (!error.response) {
      console.warn('Network connection drop during server warm-up');
    }
    return Promise.reject(error);
  }
);

// Retry wrapper with exponential backoff for cold starts
const retryRequest = async (requestFn, maxRetries = 3) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      const isNetworkOrColdStart = 
        !error.response || 
        error.code === 'ECONNABORTED' || 
        error.code === 'ERR_NETWORK' ||
        [502, 503, 504].includes(error.response?.status);

      if (i < maxRetries - 1 && isNetworkOrColdStart) {
        const delayMs = (i + 1) * 1500;
        console.warn(`[Cold Start Handler] Retrying request (${i + 1}/${maxRetries}) after ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else if (i < maxRetries - 1 && !error.response) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        break;
      }
    }
  }
  throw lastError;
};

// BUG-07 FIX: Removed non-existent endpoints:
//   - compareProducts      → POST /products/compare  (route never existed)
//   - getComparisonProducts → GET /comparison/batch   (route never existed)
//   - getSuggestedComparisons → GET /comparison/suggest (route never existed)
//   - getPriceAnalysis     → GET /comparison/price-analysis/:id (route never existed)
//   - submitContact        → POST /contact-us  (wrong path; fixed to /contact)
export const apiEndpoints = {
  // Products
  getHomeData: () => retryRequest(() => api.get('/home')),
  getProductDetail: (id) => retryRequest(() => api.get(`/products/${id}`)),
  getProductById: (id) => retryRequest(() => api.get(`/products/${id}`)),
  searchProducts: (params = {}) => retryRequest(() => api.get('/products', { params })),

  // Categories & Filters
  getCategories: () => retryRequest(() => api.get('/categories')),
  getBrands: (params = {}) => retryRequest(() => api.get('/brands', { params })),
  getFilterOptions: (category) => retryRequest(() => api.get('/filter-options', { params: { category } })),

  // Auth
  register: (data) => retryRequest(() => api.post('/auth/register', data)),
  login: (data) => retryRequest(() => api.post('/auth/login', data)),
  getProfile: () => retryRequest(() => api.get('/user/profile')),
  updatePincode: (pincode) => retryRequest(() => api.put('/user/pincode', { pincode })),

  // Wishlist
  getWishlist: () => retryRequest(() => api.get('/user/wishlist')),
  addToWishlist: (variant_id) => retryRequest(() => api.post('/user/wishlist', { variant_id })),
  removeFromWishlist: (id) => retryRequest(() => api.delete(`/user/wishlist/${id}`)),

  // Price Alerts
  getAlerts: () => retryRequest(() => api.get('/user/alerts')),
  createAlert: (data) => retryRequest(() => api.post('/user/alerts', data)),
  deleteAlert: (id) => retryRequest(() => api.delete(`/user/alerts/${id}`)),

  // Contact — BUG-07 FIX: was '/contact-us', correct route is '/contact'
  sendContactMessage: (data) => retryRequest(() => api.post('/contact', data)),
};

export const apiService = apiEndpoints;

export default api;