import { Period } from 'src/entities/period.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Submission } from './submission.entity';
// import { AnticipatedYear } from './anticipated-year.entity';
import { ApiProperty } from '@nestjs/swagger';
import { BudgetAssumptions } from './budget-assumptions.entity';
import { PartnerCountry } from './Partner-country.entity';

export enum phaseStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity()
export class Phase {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  name: string;

  @ApiProperty()
  @Column()
  reportingYear: number;

  @ApiProperty()
  @Column({ type: 'uuid' })
  tocPhase: string;

  @ApiProperty()
  @Column({ type: 'timestamp', default: null })
  startDate: Date;

  @ApiProperty()
  @Column({ type: 'timestamp', default: null })
  endDate: Date;

  @ApiProperty()
  @Column({ type: 'enum', enum: phaseStatus })
  status: phaseStatus;

  @ApiProperty()
  @ManyToOne(() => Phase, (phase) => phase.childPhases, {
    onDelete: 'SET NULL',
  })
  previousPhase: Phase;

  @ApiProperty()
  @OneToMany(() => Phase, (phase) => phase.previousPhase, {
    onDelete: 'SET NULL',
  })
  childPhases: Phase[];

  @ApiProperty()
  @OneToMany(() => Period, (period) => period.phase)
  periods: Period[];

  @OneToMany(() => BudgetAssumptions, (BudgetAssumptions) => BudgetAssumptions.phase)
  Budget_assumptions: BudgetAssumptions[];

  @OneToMany(() => PartnerCountry, (partnerCountry) => partnerCountry.phase)
  partner_country: PartnerCountry[];

  @ApiProperty()
  @OneToMany(() => Submission, (submission) => submission.phase)
  submissions: Submission[];

  @ApiProperty()
  @Column({ default: false })
  active: boolean;

  @ApiProperty()
  @Column({ default: false })
  show_eoi: boolean;

}
