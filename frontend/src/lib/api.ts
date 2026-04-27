import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
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
