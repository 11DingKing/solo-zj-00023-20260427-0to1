import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Event } from '../entities/Event';
import { Registration } from '../entities/Registration';
import { TicketType } from '../entities/TicketType';
import { EventStatus, RegistrationStatus, UserRole } from '../types';

export interface OrganizerDashboardStats {
  totalRegistrations: number;
  totalEvents: number;
  activeEvents: number;
  events: Array<{
    id: string;
    title: string;
    totalCapacity: number;
    totalRegistrations: number;
    registrationRate: number;
    checkedInCount: number;
    checkInRate: number;
  }>;
}

export class DashboardService {
  private eventRepository: Repository<Event>;
  private registrationRepository: Repository<Registration>;
  private ticketTypeRepository: Repository<TicketType>;

  constructor() {
    this.eventRepository = AppDataSource.getRepository(Event);
    this.registrationRepository = AppDataSource.getRepository(Registration);
    this.ticketTypeRepository = AppDataSource.getRepository(TicketType);
  }

  async getOrganizerDashboardStats(organizerId: string): Promise<OrganizerDashboardStats> {
    const events = await this.eventRepository.find({
      where: { organizerId },
      relations: ['ticketTypes']
    });

    let totalRegistrations = 0;
    let totalEvents = events.length;
    let activeEvents = events.filter((e) => e.status === EventStatus.PUBLISHED).length;

    const eventStats = [];

    for (const event of events) {
      const eventRegistrations = await this.registrationRepository.find({
        where: { eventId: event.id }
      });

      const totalCapacity = event.ticketTypes.reduce((sum, tt) => sum + tt.quantity, 0);
      const eventTotalRegistrations = eventRegistrations.reduce((sum, r) => sum + r.quantity, 0);
      const checkedInCount = eventRegistrations.filter((r) => r.status === RegistrationStatus.CHECKED_IN).reduce(
        (sum, r) => sum + r.quantity,
        0
      );

      const registrationRate = totalCapacity > 0 ? (eventTotalRegistrations / totalCapacity) * 100 : 0;
      const checkInRate = eventTotalRegistrations > 0 ? (checkedInCount / eventTotalRegistrations) * 100 : 0;

      totalRegistrations += eventTotalRegistrations;

      eventStats.push({
        id: event.id,
        title: event.title,
        totalCapacity,
        totalRegistrations: eventTotalRegistrations,
        registrationRate: Math.round(registrationRate * 100) / 100,
        checkedInCount,
        checkInRate: Math.round(checkInRate * 100) / 100
      });
    }

    return {
      totalRegistrations,
      totalEvents,
      activeEvents,
      events: eventStats
    };
  }
}
