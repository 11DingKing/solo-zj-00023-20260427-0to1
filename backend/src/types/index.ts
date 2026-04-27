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

export interface JwtPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location: string;
  maxCapacity: number;
  registrationDeadline: Date;
  coverImage?: string;
  category: string;
  tags: string[];
}

export interface CreateTicketTypeRequest {
  name: string;
  description?: string;
  price: number;
  quantity: number;
}

export interface RegisterForEventRequest {
  ticketTypeId: string;
  quantity: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}
