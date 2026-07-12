import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_BASE });

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

export const vehiclesAPI = {
  getAll: (params) => api.get('/vehicles', { params }),
  getAvailable: () => api.get('/vehicles/available'),
  getById: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post('/vehicles', data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  delete: (id) => api.delete(`/vehicles/${id}`),
};

export const driversAPI = {
  getAll: (params) => api.get('/drivers', { params }),
  getAvailable: () => api.get('/drivers/available'),
  getById: (id) => api.get(`/drivers/${id}`),
  create: (data) => api.post('/drivers', data),
  update: (id, data) => api.put(`/drivers/${id}`, data),
  delete: (id) => api.delete(`/drivers/${id}`),
  updateStatus: (id, status) => api.patch(`/drivers/${id}/status`, { status }),
};

export const tripsAPI = {
  getAll: (params) => api.get('/trips', { params }),
  getById: (id) => api.get(`/trips/${id}`),
  create: (data) => api.post('/trips', data),
  dispatch: (id) => api.patch(`/trips/${id}/dispatch`),
  complete: (id, data) => api.patch(`/trips/${id}/complete`, data),
  cancel: (id) => api.patch(`/trips/${id}/cancel`),
  delete: (id) => api.delete(`/trips/${id}`),
};

export const maintenanceAPI = {
  getAll: (params) => api.get('/maintenance', { params }),
  create: (data) => api.post('/maintenance', data),
  close: (id, data) => api.patch(`/maintenance/${id}/close`, data),
  update: (id, data) => api.put(`/maintenance/${id}`, data),
  delete: (id) => api.delete(`/maintenance/${id}`),
};

export const financeAPI = {
  getFuelLogs: (params) => api.get('/finance/fuel', { params }),
  createFuelLog: (data) => api.post('/finance/fuel', data),
  updateFuelLog: (id, data) => api.put(`/finance/fuel/${id}`, data),
  deleteFuelLog: (id) => api.delete(`/finance/fuel/${id}`),
  getExpenses: (params) => api.get('/finance/expenses', { params }),
  createExpense: (data) => api.post('/finance/expenses', data),
  updateExpense: (id, data) => api.put(`/finance/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/finance/expenses/${id}`),
  getOperationalCost: (vehicleId) => api.get(`/finance/operational-cost/${vehicleId}`),
};

export const analyticsAPI = {
  getDashboard: () => api.get('/dashboard'),
  getAnalytics: () => api.get('/analytics'),
};

export default api;
