import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
    } else if (!error.response) {
      console.error('Network error - check your connection');
    }
    return Promise.reject(error);
  }
);

// Retry wrapper with exponential backoff
const retryRequest = async (requestFn, maxRetries = 2) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const delayMs = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
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