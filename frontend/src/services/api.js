import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if unauthorized
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (email, password, company_name, terms_accepted) => {
    const response = await api.post('/auth/register', { email, password, company_name, terms_accepted });
    return response.data;
  },
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
};

export const companiesAPI = {
  getMe: async () => {
    const response = await api.get('/companies/me');
    return response.data;
  },
  getQrCode: async () => {
    const response = await api.get('/companies/qrcode');
    return response.data;
  },
  regenerateQrCode: async () => {
    const response = await api.post('/companies/qrcode/regenerate');
    return response.data;
  },
  updateSettings: async (settings) => {
    const response = await api.put('/companies/settings', settings);
    return response.data;
  },
  getTelegramLink: async () => {
    const response = await api.get('/companies/telegram-link');
    return response.data;
  },
};

export const employeesAPI = {
  getAll: async () => {
    const response = await api.get('/employees');
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/employees/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
  },
  getPayroll: async () => {
    const response = await api.get('/employees/payroll');
    return response.data;
  },
};

export const checkinsAPI = {
  getAll: async () => {
    const response = await api.get('/checkins');
    return response.data;
  },
  getToday: async () => {
    const response = await api.get('/checkins/today');
    return response.data;
  },
  getSummary: async () => {
    const response = await api.get('/checkins/summary');
    return response.data;
  },
};

export const adsAPI = {
  getAll: async () => {
    const response = await api.get('/ads');
    return response.data;
  },
  create: async (ad) => {
    const response = await api.post('/ads', ad);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/ads/${id}`);
    return response.data;
  },
  toggle: async (id) => {
    const response = await api.put(`/ads/${id}/toggle`);
    return response.data;
  },
};

export const adminAPI = {
  getGlobalStats: async () => {
    const response = await api.get('/api/admin/global-stats');
    return response.data;
  },
  getCompanies: async () => {
    const response = await api.get('/api/admin/companies');
    return response.data;
  },
  getUsers: async () => {
    const response = await api.get('/api/admin/users');
    return response.data;
  },
  broadcast: async (message) => {
    const response = await api.post('/api/admin/broadcast', { message });
    return response.data;
  },
};

export const leavesAPI = {
  getAll: async () => {
    const response = await api.get('/api/leaves');
    return response.data;
  },
  updateStatus: async (requestId, status) => {
    const response = await api.put(`/api/leaves/${requestId}/status`, { status });
    return response.data;
  },
};

export const announcementsAPI = {
  getAll: async () => {
    const response = await api.get('/announcements');
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/announcements', data);
    return response.data;
  },
};

export default api;
