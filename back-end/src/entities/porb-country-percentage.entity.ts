import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Initiative } from './initiative.entity';
import { Organization } from './organization.entity';
import { PorbAow } from './porb-aow.entity';

@Entity('porb_country_percentage')
export class PorbCountryPercentage {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  program_id: number;

  @ManyToOne(() => Initiative, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'program_id' })
  program: Initiative;

  @ApiProperty()
  @Column()
  porb_aow_id: number;

  @ManyToOne(() => PorbAow, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'porb_aow_id' })
  porb_aow: PorbAow;

  @ApiProperty()
  @Column()
  center_id: number;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'center_id' })
  center: Organization;

  @ApiProperty()
  @Column({ type: 'varchar' })
  country_name: string;

  @ApiProperty()
  @Column({ type: 'float', nullable: true })
  percentage: number;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  is_manual: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
