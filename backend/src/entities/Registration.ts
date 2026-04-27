import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { RegistrationStatus } from '../types';
import { User } from './User';
import { Event } from './Event';
import { TicketType } from './TicketType';

@Entity()
export class Registration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  orderNumber!: string;

  @ManyToOne(() => User, (user) => user.registrations)
  user!: User;

  @Column()
  userId!: string;

  @ManyToOne(() => Event, (event) => event.registrations)
  event!: Event;

  @Column()
  eventId!: string;

  @ManyToOne(() => TicketType, (ticketType) => ticketType.registrations)
  ticketType!: TicketType;

  @Column()
  ticketTypeId!: string;

  @Column()
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice!: number;

  @Column()
  contactName!: string;

  @Column()
  contactPhone!: string;

  @Column()
  contactEmail!: string;

  @Column({
    type: 'enum',
    enum: RegistrationStatus,
    default: RegistrationStatus.CONFIRMED
  })
  status!: RegistrationStatus;

  @Column({ nullable: true })
  checkedInAt?: Date;

  @Column({ type: 'text', nullable: true })
  qrCodeData?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
