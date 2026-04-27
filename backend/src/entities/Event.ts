import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { EventStatus } from '../types';
import { User } from './User';
import { TicketType } from './TicketType';
import { Registration } from './Registration';

@Entity()
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'timestamp' })
  startTime!: Date;

  @Column({ type: 'timestamp' })
  endTime!: Date;

  @Column()
  location!: string;

  @Column()
  maxCapacity!: number;

  @Column({ type: 'timestamp' })
  registrationDeadline!: Date;

  @Column({ nullable: true })
  coverImage?: string;

  @Column()
  category!: string;

  @Column({ type: 'simple-array', default: '' })
  tags!: string[];

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.DRAFT
  })
  status!: EventStatus;

  @ManyToOne(() => User, (user) => user.events)
  organizer!: User;

  @Column()
  organizerId!: string;

  @OneToMany(() => TicketType, (ticketType) => ticketType.event, { cascade: true })
  ticketTypes!: TicketType[];

  @OneToMany(() => Registration, (registration) => registration.event)
  registrations!: Registration[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
