import { ApiProperty } from '@nestjs/swagger';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class underMaintenance {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;
  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  value: string;

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  status: string;
}
