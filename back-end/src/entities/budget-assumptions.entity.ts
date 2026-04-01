import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Organization } from './organization.entity';
import { Phase } from './phase.entity';
import { Initiative } from './initiative.entity';

@Entity()
export class BudgetAssumptions {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  organization_code: number;

  @ApiProperty()
  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_code' })
  organization: Organization;

  @ApiProperty()
  @Column({ nullable: false })
  phase_id: number;

  @ApiProperty()
  @ManyToOne(() => Phase)
  @JoinColumn({ name: 'phase_id' })
  phase: Phase;

  @ApiProperty()
  @Column()
  wp_id: string;

  @ApiProperty()
  @Column({ type: 'mediumtext' })
  budget_assumptions: string;

  @ApiProperty()
  @Column()
  item_id: string;

  @ApiProperty()
  @Column()
  item_budget: string;

  @ApiProperty()
  @Column()
  type: string;

  @ApiProperty()
  @Column()
  initiative_id: number;

  @ManyToOne(() => Initiative, (initiative) => initiative, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'initiative_id' })
  initiative: Initiative;
}
