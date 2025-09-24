import {
    Column,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
  } from 'typeorm';
  import { ApiProperty } from '@nestjs/swagger';
import { AnaplanValues } from './anaplan-values.entity';

  @Entity()
  export class Anaplan {
    @ApiProperty()
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty()
    @Column()
    label: string;


    @OneToMany(() => AnaplanValues, (AnaplanValues) => AnaplanValues.anaplan)
    values: AnaplanValues[];
  }  