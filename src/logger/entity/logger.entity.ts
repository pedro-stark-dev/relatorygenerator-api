import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from "typeorm";

export enum LoggerType {
  REQUEST = 'request',
  RESPONSE = 'response',
  ERROR = 'error',
  AUTH = 'auth',
}

@Entity('logger_entries')
@Index(['route', 'createdAt'])
@Index(['ipAddress', 'createdAt'])
@Index(['username', 'createdAt'])
export class LoggerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: LoggerType,
    default: LoggerType.REQUEST
  })
  type: LoggerType;

  @Column({ nullable: true })
  @Index()
  route: string;

  @Column({ nullable: true })
  method: string;

  @Column({ nullable: true })
  @Index()
  ipAddress: string;

  @Column({ nullable: true })
  username: string;

  @Column({ type: 'int', nullable: true })
  responseStatusCode: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'int', nullable: true })
  responseTime: number;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}