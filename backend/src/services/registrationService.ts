import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { AppDataSource } from '../config/database';
import { acquireLock, releaseLock } from '../config/redis';
import { Registration } from '../entities/Registration';
import { Event } from '../entities/Event';
import { TicketType } from '../entities/TicketType';
import { EventStatus, RegistrationStatus, RegisterForEventRequest } from '../types';

const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `EVT-${timestamp}-${random}`;
};

export class RegistrationService {
  private registrationRepository: Repository<Registration>;
  private eventRepository: Repository<Event>;
  private ticketTypeRepository: Repository<TicketType>;

  constructor() {
    this.registrationRepository = AppDataSource.getRepository(Registration);
    this.eventRepository = AppDataSource.getRepository(Event);
    this.ticketTypeRepository = AppDataSource.getRepository(TicketType);
  }

  async registerForEvent(
    userId: string,
    eventId: string,
    request: RegisterForEventRequest
  ): Promise<Registration> {
    const lockKey = `lock:event:${eventId}:ticket:${request.ticketTypeId}`;
    const lockAcquired = await acquireLock(lockKey, 30000);

    if (!lockAcquired) {
      throw new Error('Too many concurrent requests, please try again later');
    }

    try {
      const event = await this.eventRepository.findOne({
        where: { id: eventId, status: EventStatus.PUBLISHED }
      });

      if (!event) {
        throw new Error('Event not found or not published');
      }

      const now = new Date();
      if (now > event.registrationDeadline) {
        throw new Error('Registration deadline has passed');
      }

      const ticketType = await this.ticketTypeRepository.findOne({
        where: { id: request.ticketTypeId, eventId }
      });

      if (!ticketType) {
        throw new Error('Ticket type not found');
      }

      const availableQuantity = ticketType.quantity - ticketType.sold;
      if (request.quantity > availableQuantity) {
        throw new Error('Insufficient tickets available');
      }

      const totalPrice = Number(ticketType.price) * request.quantity;

      const orderNumber = generateOrderNumber();
      const qrCodeData = await QRCode.toDataURL(orderNumber);

      const registration = this.registrationRepository.create({
        orderNumber,
        userId,
        eventId,
        ticketTypeId: request.ticketTypeId,
        quantity: request.quantity,
        totalPrice,
        contactName: request.contactName,
        contactPhone: request.contactPhone,
        contactEmail: request.contactEmail,
        status: RegistrationStatus.CONFIRMED,
        qrCodeData
      });

      ticketType.sold += request.quantity;

      await this.ticketTypeRepository.save(ticketType);
      await this.registrationRepository.save(registration);

      return registration;
    } finally {
      await releaseLock(lockKey);
    }
  }

  async getById(registrationId: string, userId?: string): Promise<Registration | null> {
    const where: Record<string, unknown> = { id: registrationId };
    if (userId) {
      where.userId = userId;
    }

    return this.registrationRepository.findOne({
      where,
      relations: ['event', 'ticketType']
    });
  }

  async getByOrderNumber(orderNumber: string): Promise<Registration | null> {
    return this.registrationRepository.findOne({
      where: { orderNumber },
      relations: ['event', 'ticketType', 'user']
    });
  }

  async getUserRegistrations(userId: string): Promise<Registration[]> {
    return this.registrationRepository.find({
      where: { userId },
      relations: ['event', 'ticketType'],
      order: { createdAt: 'DESC' }
    });
  }

  async getEventRegistrations(
    eventId: string,
    options: {
      ticketTypeId?: string;
      status?: RegistrationStatus;
    } = {}
  ): Promise<Registration[]> {
    const where: Record<string, unknown> = { eventId };
    if (options.ticketTypeId) {
      where.ticketTypeId = options.ticketTypeId;
    }
    if (options.status) {
      where.status = options.status;
    }

    return this.registrationRepository.find({
      where,
      relations: ['user', 'ticketType'],
      order: { createdAt: 'DESC' }
    });
  }

  async checkIn(orderNumber: string): Promise<Registration> {
    const registration = await this.registrationRepository.findOne({
      where: { orderNumber },
      relations: ['event', 'ticketType']
    });

    if (!registration) {
      throw new Error('Registration not found');
    }

    if (registration.status === RegistrationStatus.CHECKED_IN) {
      throw new Error('Already checked in');
    }

    if (registration.status !== RegistrationStatus.CONFIRMED) {
      throw new Error('Registration is not confirmed');
    }

    registration.status = RegistrationStatus.CHECKED_IN;
    registration.checkedInAt = new Date();

    await this.registrationRepository.save(registration);

    return registration;
  }
}
