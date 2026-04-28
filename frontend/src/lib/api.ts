import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  User,
  Event,
  Registration,
  DashboardStats,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  CreateEventData,
  RegisterForEventData
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ApiError {
  message: string;
  status?: number;
  isAuthError: boolean;
}

const createApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; errors?: unknown[] }>;
    const status = axiosError.response?.status;
    
    let message: string;
    
    if (!axiosError.response) {
      message = '网络请求失败，请检查网络连接';
    } else if (status === 401) {
      message = '登录已过期，请重新登录';
    } else if (status === 403) {
      message = '您没有权限执行此操作';
    } else if (status === 404) {
      message = '请求的资源不存在';
    } else if (status === 400) {
      message = axiosError.response?.data?.message || '请求参数错误';
    } else if (status === 422) {
      message = axiosError.response?.data?.message || '数据验证失败';
    } else if (status === 500) {
      message = '服务器内部错误，请稍后重试';
    } else if (status && status >= 500) {
      message = '服务器错误，请稍后重试';
    } else {
      message = axiosError.response?.data?.message || 
               (axiosError.response?.data?.errors ? '验证失败' : '') ||
               axiosError.message ||
               '请求失败';
    }
    
    return {
      message,
      status,
      isAuthError: status === 401 || status === 403
    };
  }
  
  return {
    message: error instanceof Error ? error.message : '未知错误',
    isAuthError: false
  };
};

let onAuthError: (() => void) | null = null;

export const setAuthErrorHandler = (handler: () => void) => {
  onAuthError = handler;
};

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const apiError = createApiError(error);
        if (apiError.isAuthError && onAuthError) {
          onAuthError();
        }
        return Promise.reject(apiError);
      }
    );
  }

  setToken(token: string | null) {
    this.token = token;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.client.post('/auth/login', credentials);
    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async getHotEvents(): Promise<Event[]> {
    const response = await this.client.get('/events/hot');
    return response.data;
  }

  async getEvents(params?: {
    category?: string;
    tags?: string[];
    keyword?: string;
    sortBy?: 'startTime' | 'createdAt';
    sortOrder?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<{ events: Event[]; total: number }> {
    const response = await this.client.get('/events', {
      params: {
        ...params,
        tags: params?.tags?.join(',')
      }
    });
    return response.data;
  }

  async getEvent(id: string): Promise<Event> {
    const response = await this.client.get(`/events/${id}`);
    return response.data;
  }

  async getMyEvents(): Promise<Event[]> {
    const response = await this.client.get('/events/my');
    return response.data;
  }

  async createEvent(data: CreateEventData): Promise<Event> {
    const response = await this.client.post('/events', data);
    return response.data;
  }

  async updateEvent(id: string, data: Partial<CreateEventData>): Promise<Event> {
    const response = await this.client.put(`/events/${id}`, data);
    return response.data;
  }

  async publishEvent(id: string): Promise<Event> {
    const response = await this.client.post(`/events/${id}/publish`);
    return response.data;
  }

  async getMyRegistrations(): Promise<Registration[]> {
    const response = await this.client.get('/registrations/my');
    return response.data;
  }

  async getRegistration(id: string): Promise<Registration> {
    const response = await this.client.get(`/registrations/${id}`);
    return response.data;
  }

  async registerForEvent(eventId: string, data: RegisterForEventData): Promise<Registration> {
    const response = await this.client.post(`/registrations/event/${eventId}`, data);
    return response.data;
  }

  async getEventRegistrations(eventId: string, params?: {
    ticketTypeId?: string;
    status?: string;
  }): Promise<Registration[]> {
    const response = await this.client.get(`/registrations/event/${eventId}/list`, { params });
    return response.data;
  }

  async exportEventRegistrations(eventId: string): Promise<Blob> {
    const response = await this.client.get(`/registrations/event/${eventId}/export`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async checkIn(orderNumber: string): Promise<Registration> {
    const response = await this.client.post('/registrations/checkin', { orderNumber });
    return response.data;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.client.get('/dashboard/organizer');
    return response.data;
  }
}

export const apiClient = new ApiClient();
