import {
  Column,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Result } from './result.entity';
import { Initiative } from './initiative.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Organization {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  code: string;

  @ApiProperty()
  @Column()
  name: string;

  @ApiProperty()
  @Column()
  acronym: string;

  @ManyToMany(() => Initiative, (initiative) => initiative.organizations)
  initiatives: Initiative[];

  @OneToMany(() => Result, (result) => result.organization)
  results: Result[];
}
