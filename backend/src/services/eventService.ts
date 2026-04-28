import { Repository, Like, In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { setCache, getCache, deleteCache } from '../config/redis';
import { Event } from '../entities/Event';
import { TicketType } from '../entities/TicketType';
import { EventStatus, CreateEventRequest, CreateTicketTypeRequest, UserRole } from '../types';

const HOT_EVENTS_CACHE_KEY = 'hot_events';
const HOT_EVENTS_CACHE_TTL = 300;

export class EventService {
  private eventRepository: Repository<Event>;
  private ticketTypeRepository: Repository<TicketType>;

  constructor() {
    this.eventRepository = AppDataSource.getRepository(Event);
    this.ticketTypeRepository = AppDataSource.getRepository(TicketType);
  }

  async createEvent(
    organizerId: string,
    createEventRequest: CreateEventRequest,
    ticketTypes: CreateTicketTypeRequest[]
  ): Promise<Event> {
    const event = this.eventRepository.create({
      ...createEventRequest,
      organizerId,
      status: EventStatus.DRAFT
    });

    const ticketTypeEntities = ticketTypes.map((tt) =>
      this.ticketTypeRepository.create({
        ...tt
      })
    );

    event.ticketTypes = ticketTypeEntities;

    await this.eventRepository.save(event);
    await this.invalidateCache();

    return event;
  }

  async updateEvent(
    eventId: string,
    organizerId: string,
    updates: Partial<CreateEventRequest>,
    ticketTypes?: CreateTicketTypeRequest[]
  ): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizerId },
      relations: ['ticketTypes']
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.status !== EventStatus.DRAFT) {
      throw new Error('Cannot update published event');
    }

    Object.assign(event, updates);

    if (ticketTypes) {
      await this.ticketTypeRepository.delete({ eventId });

      event.ticketTypes = ticketTypes.map((tt) =>
        this.ticketTypeRepository.create({
          ...tt,
          event
        })
      );
    }

    await this.eventRepository.save(event);
    await this.invalidateCache();

    return event;
  }

  async publishEvent(eventId: string, organizerId: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId, organizerId },
      relations: ['ticketTypes']
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.ticketTypes.length === 0) {
      throw new Error('Event must have at least one ticket type');
    }

    event.status = EventStatus.PUBLISHED;
    await this.eventRepository.save(event);
    await this.invalidateCache();

    return event;
  }

  async getById(eventId: string, includeDraft: boolean = false): Promise<Event | null> {
    const where: Record<string, unknown> = { id: eventId };
    if (!includeDraft) {
      where.status = EventStatus.PUBLISHED;
    }

    return this.eventRepository.findOne({
      where,
      relations: ['ticketTypes', 'organizer']
    });
  }

  async getOrganizerEvents(organizerId: string): Promise<Event[]> {
    return this.eventRepository.find({
      where: { organizerId },
      relations: ['ticketTypes'],
      order: { createdAt: 'DESC' }
    });
  }

  async getPublishedEvents(
    options: {
      category?: string;
      tags?: string[];
      keyword?: string;
      sortBy?: 'startTime' | 'createdAt';
      sortOrder?: 'ASC' | 'DESC';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ events: Event[]; total: number }> {
    const { category, tags, keyword, sortBy = 'startTime', sortOrder = 'ASC', limit = 20, offset = 0 } = options;

    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.ticketTypes', 'ticketType')
      .where('event.status = :status', { status: EventStatus.PUBLISHED });

    if (category) {
      queryBuilder.andWhere('event.category = :category', { category });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('event.tags && :tags', { tags });
    }

    if (keyword) {
      queryBuilder.andWhere(
        '(event.title LIKE :keyword OR event.description LIKE :keyword OR event.location LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    queryBuilder.orderBy(`event.${sortBy}`, sortOrder);

    const [events, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { events, total };
  }

  async getHotEvents(): Promise<Event[]> {
    const cached = await getCache<Event[]>(HOT_EVENTS_CACHE_KEY);
    if (cached) {
      return cached;
    }

    const events = await this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.ticketTypes', 'ticketType')
      .leftJoin('event.registrations', 'registration')
      .where('event.status = :status', { status: EventStatus.PUBLISHED })
      .andWhere('event.startTime > NOW()')
      .groupBy('event.id, ticketType.id')
      .orderBy('COUNT(registration.id)', 'DESC')
      .addOrderBy('event.startTime', 'ASC')
      .limit(10)
      .getMany();

    await setCache(HOT_EVENTS_CACHE_KEY, events, HOT_EVENTS_CACHE_TTL);

    return events;
  }

  private async invalidateCache(): Promise<void> {
    await deleteCache(HOT_EVENTS_CACHE_KEY);
  }
}
