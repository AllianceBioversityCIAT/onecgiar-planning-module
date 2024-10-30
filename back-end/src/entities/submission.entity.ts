import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Phase } from './phase.entity';
import { Initiative } from './initiative.entity';
import { Result } from './result.entity';
// import { Melia } from './melia.entity';
import { CrossCutting } from './cross-cutting.entity';
import { IpsrValue } from './ipsr-value.entity';
import { WpBudget } from './wp-budget.entity';
// import { InitiativeMelia } from './initiative-melia.entity';
export enum SubmissionStatus {
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  PENDING = 'Pending',
  DRAFT = 'Draft'
}
@Entity()
export class Submission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'json', nullable: true })
  toc_data: string;

  @ManyToOne(() => User, (user) => user.submissions)
  user: User;

  @ManyToOne(() => Phase, (phase) => phase.submissions)
  phase: Phase;

  @Column()
  initiative_id: number;

  @ManyToOne(() => Initiative, (initiative) => initiative.submissions)
  @JoinColumn({ name: 'initiative_id' })
  initiative: Initiative;

  @OneToMany(() => Result, (result) => result.submission)
  results: Result[];

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  created_at: Date;

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.PENDING,
  })
  status: SubmissionStatus;

  @Column({ nullable: true, length: 2000 })
  status_reason: '';

  // @OneToMany(() => Melia, (melia) => melia.submission)
  // melias: Melia[];

  @OneToMany(() => CrossCutting, (crossCutting) => crossCutting.submission)
  crossCutting: CrossCutting[];

  @OneToMany(() => IpsrValue, (ipsrValue) => ipsrValue.submission)
  ipsrValues: IpsrValue[];


  @Column({ nullable: true })
  toc_original_id: string;

  @Column({ nullable: true })
  toc_version_id: string;

  @Column({ nullable: true })
  toc_version: number;

  @Column({ nullable: true })
  toc_phase_id: string;


  @OneToMany(() => WpBudget, (wp_budget) => wp_budget.submission)
  wp_budget: WpBudget[];

  // @OneToMany(
  //   () => InitiativeMelia,
  //   (initiativeMelia) => initiativeMelia.submission,
  // )
  // initiativeMelia: InitiativeMelia[];
}
