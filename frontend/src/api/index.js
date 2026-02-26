import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/token/refresh/`, { refresh });
          localStorage.setItem('access_token', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ─── Endpoints ────────────────────────────────────────────────────────────────

export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  profile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.patch('/auth/profile/', data),
};

export const categoryAPI = {
  list: () => api.get('/categories/'),
  detail: (slug) => api.get(`/categories/${slug}/`),
};

export const productAPI = {
  list:       (params) => api.get('/products/', { params }),
  detail:     (slug)   => api.get(`/products/${slug}/`),
  featured:   ()       => api.get('/products/featured/'),
  flashDeals: ()       => api.get('/products/flash_deals/'),
  newArrivals:()       => api.get('/products/new_arrivals/'),
  reviews: (slug) => api.get(`/products/${slug}/reviews/`),
  addReview: (slug, data) => api.post(`/products/${slug}/reviews/`, data),
};

export const deliveryAPI = {
  counties: () => api.get('/counties/'),
  stations: (countySlug) => api.get('/pickup-stations/', { params: { county__slug: countySlug } }),
};

export const cartAPI = {
  get: () => api.get('/cart/'),
  add: (data) => api.post('/cart/', data),
  update: (itemId, data) => api.patch(`/cart/items/${itemId}/`, data),
  remove: (itemId) => api.delete(`/cart/items/${itemId}/`),
};

export const orderAPI = {
  list: () => api.get('/orders/'),
  create: (data) => api.post('/orders/', data),
  detail: (id) => api.get(`/orders/${id}/`),
  byNumber: (number) => api.get('/orders/by_number/', { params: { order_number: number } }),
};

export const mpesaAPI = {
  stkPush: (data) => api.post('/mpesa/stk-push/', data),
  status: (checkoutId) => api.get(`/mpesa/status/${checkoutId}/`),
  query:   (id)   => api.get(`/mpesa/query/${id}/`),  // ← add if missing
};

export const wishlistAPI = {
  list: () => api.get('/wishlist/'),
  add: (productId) => api.post('/wishlist/', { product_id: productId }),
  remove: (id) => api.delete(`/wishlist/${id}/`),
};

export const bannerAPI = {
  list: () => api.get('/banners/'),
};

export default api;