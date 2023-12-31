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

@Entity()
export class IpsrValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @JoinColumn({ name: 'initiative_id' })
  @ManyToOne(() => Initiative, (initiative) => initiative.ipsrValues)
  initiative: Initiative;

  @Column()
  ipsr_id: number;

  @JoinColumn({ name: 'ipsr_id' })
  @ManyToOne(() => Ipsr, (Ipsr) => Ipsr.ipsrValues)
  @JoinColumn()
  ipsr: Ipsr;

  @Column()
  initiative_id: number;

  @Column({ default: null })
  value: number;

  @ManyToOne(() => Submission, (submission) => submission.ipsrValues)
  @JoinColumn({ name: 'submission_id' })
  submission: Submission;

  @Column({ nullable: true })
  submission_id: number;
}
