import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Event } from './Event';
import { Registration } from './Registration';

@Entity()
export class TicketType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price!: number;

  @Column()
  quantity!: number;

  @Column({ default: 0 })
  sold!: number;

  @ManyToOne(() => Event, (event) => event.ticketTypes)
  event!: Event;

  @Column()
  eventId!: string;

  @OneToMany(() => Registration, (registration) => registration.ticketType)
  registrations!: Registration[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
