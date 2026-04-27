export enum UserRole {
  USER = 'user',
  ORGANIZER = 'organizer'
}

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled'
}

export enum RegistrationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  CHECKED_IN = 'checked_in'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  sold: number;
  eventId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  maxCapacity: number;
  registrationDeadline: string;
  coverImage?: string;
  category: string;
  tags: string[];
  status: EventStatus;
  organizerId: string;
  ticketTypes: TicketType[];
  createdAt: string;
  updatedAt: string;
}

export interface Registration {
  id: string;
  orderNumber: string;
  userId: string;
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  totalPrice: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  status: RegistrationStatus;
  checkedInAt?: string;
  qrCodeData?: string;
  event?: Event;
  ticketType?: TicketType;
  createdAt: string;
  updatedAt: string;
}

export interface EventStats {
  id: string;
  title: string;
  totalCapacity: number;
  totalRegistrations: number;
  registrationRate: number;
  checkedInCount: number;
  checkInRate: number;
}

export interface DashboardStats {
  totalRegistrations: number;
  totalEvents: number;
  activeEvents: number;
  events: EventStats[];
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  errors?: Array<{ path: string; msg: string }>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CreateEventData {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  maxCapacity: number;
  registrationDeadline: string;
  coverImage?: string;
  category: string;
  tags: string[];
  ticketTypes: CreateTicketTypeData[];
}

export interface CreateTicketTypeData {
  name: string;
  description?: string;
  price: number;
  quantity: number;
}

export interface RegisterForEventData {
  ticketTypeId: string;
  quantity: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}
