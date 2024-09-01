import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Initiative } from './initiative.entity';
import { Ipsr } from './ipsr.entity';
import { Submission } from './submission.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class IpsrValue {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @JoinColumn({ name: 'initiative_id' })
  @ManyToOne(() => Initiative, (initiative) => initiative.ipsrValues)
  initiative: Initiative;

  @ApiProperty()
  @Column()
  ipsr_id: number;

  @JoinColumn({ name: 'ipsr_id' })
  @ManyToOne(() => Ipsr, (Ipsr) => Ipsr.ipsrValues)
  @JoinColumn()
  ipsr: Ipsr;

  @ApiProperty()
  @Column()
  initiative_id: number;

  @ApiProperty()
  @Column({ default: null })
  value: string;

  @ApiProperty()
  @Column({ default: null , type: 'longtext'})
  description: string;

  @ManyToOne(() => Submission, (submission) => submission.ipsrValues)
  @JoinColumn({ name: 'submission_id' })
  submission: Submission;

  @ApiProperty()
  @Column({ nullable: true })
  submission_id: number;
}
