import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  VirtualColumn,
} from 'typeorm';
import { WorkPackage } from './workPackage.entity';
import { Organization } from './organization.entity';
import { Submission } from './submission.entity';
import { Initiative } from './initiative.entity';
import { Phase } from './phase.entity';

@Entity()
export class WpBudget {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  budget: string;

  @ManyToOne(() => WorkPackage)
  @JoinColumn({ name: 'wp_id' })
  workPackage: WorkPackage;

  @Column()
  wp_id: number;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_code' })
  organization: Organization;

  @Column()
  organization_code: string;

  @ManyToOne(() => Submission)
  @JoinColumn({ name: 'submission_id' })
  submission: Submission;

  @Column({ nullable: true })
  submission_id: number;

  @ManyToOne(() => Initiative)
  @JoinColumn({ name: 'initiative_id' })
  initiative: Initiative;

  @Column({ nullable: true })
  initiative_id: number; 

  @ManyToOne(() => Phase)
  @JoinColumn({ name: 'phase_id' })
  phase: Phase;

  @Column({ nullable: true })
  phase_id: number;
  
  @VirtualColumn({ query: (alias) => `NULL` })
  total?:number;
}
