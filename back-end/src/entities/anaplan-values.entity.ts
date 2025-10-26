import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
  } from 'typeorm';
  import { ApiProperty } from '@nestjs/swagger';
import { Anaplan } from './anaplan.entity';
import { Organization } from './organization.entity';
import { WorkPackage } from './workPackage.entity';
import { Initiative } from './initiative.entity';
import { Phase } from './phase.entity';

  @Entity()
  export class AnaplanValues {
    @ApiProperty()
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty()
    @Column()
    value: number;
  
    @JoinColumn({ name: 'anaplan_id' })
    @ManyToOne(() => Anaplan, (anaplan) => anaplan.values)
    anaplan: Anaplan;

    @Column()
    anaplan_id: number;

    @JoinColumn({ name: 'organization_code' })
    @ManyToOne(() => Organization, (organization) => organization.anaplan_values)
    organization: Organization;

    @Column()
    organization_code: number;


    @JoinColumn({ name: 'wp_id' })
    @ManyToOne(() => WorkPackage, (workPackage) => workPackage.anaplan_values)
    workPackage: WorkPackage;

    @Column()
    wp_id: number;

    @JoinColumn({ name: 'initiative_id' })
    @ManyToOne(() => Initiative, (initiative) => initiative.anaplan_values)
    initiative: Initiative;

    @Column()
    initiative_id: number;

    @Column({ nullable: false })
    phase_id: number;

    @JoinColumn({ name: 'phase_id' })
    @ManyToOne(() => Phase, (phase) => phase.anaplan_values)
    phase: Phase;
  }  