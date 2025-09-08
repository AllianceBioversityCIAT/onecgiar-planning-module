import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
  } from 'typeorm';
  import { ApiProperty } from '@nestjs/swagger';
import { Organization } from './organization.entity';

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
    @Column()
    wp_id: string;

    @ApiProperty()
    @Column()
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
  }  