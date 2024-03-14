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
// import { InitiativeMelia } from './initiative-melia.entity';
export enum SubmissionStatus {
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  PENDING = 'Pending',
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

  @Column({ nullable: true })
  status_reason: '';

  // @OneToMany(() => Melia, (melia) => melia.submission)
  // melias: Melia[];

  @OneToMany(() => CrossCutting, (crossCutting) => crossCutting.submission)
  crossCutting: CrossCutting[];

  @OneToMany(() => IpsrValue, (ipsrValue) => ipsrValue.submission)
  ipsrValues: IpsrValue[];

  // @OneToMany(
  //   () => InitiativeMelia,
  //   (initiativeMelia) => initiativeMelia.submission,
  // )
  // initiativeMelia: InitiativeMelia[];
}
