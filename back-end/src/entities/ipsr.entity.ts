import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { IpsrValue } from './ipsr-value.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Ipsr {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  title: string;

  @ApiProperty()
  @Column('text')
  description: string;

  @ApiProperty()
  @Column({default: false})
  need_in_description: boolean;

  @OneToMany(() => IpsrValue, (ipsrValue) => ipsrValue.ipsr)
  ipsrValues: IpsrValue[];
}
