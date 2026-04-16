import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Initiative } from './initiative.entity';
import { Organization } from './organization.entity';
import { PorbAow } from './porb-aow.entity';

@Index(['program_id', 'porb_aow_id', 'center_id'])
@Entity('porb_hlo')
export class PorbHlo {
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
  @Column({ nullable: true })
  porb_aow_id: number;

  @ManyToOne(() => PorbAow, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'porb_aow_id' })
  porb_aow: PorbAow;

  @ApiProperty()
  @Column({ type: 'uuid' })
  toc_id: string;

  @ApiProperty()
  @Column()
  center_id: number;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'center_id' })
  center: Organization;

  @ApiProperty()
  @Column({ type: 'mediumtext' })
  hlo_name: string;

  @ApiProperty()
  @Column({ type: 'mediumtext', nullable: true })
  hlo_description: string;

  @ApiProperty()
  @Column({ nullable: true })
  hlo_type: string;

  @ApiProperty()
  @Column({ type: 'mediumtext', nullable: true })
  hlo_geo: string;

  @ApiProperty()
  @Column({ nullable: true })
  hlo_target: number;

  @ApiProperty()
  @Column({ type: 'double', nullable: true })
  hlo_budget: number;

  @ApiProperty()
  @Column({ type: 'mediumtext', nullable: true })
  hlo_assumption: string;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  toc_is_deleted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'datetime', nullable: true, default: null })
  toc_updated_at: Date;

  @Column({ type: 'datetime', nullable: true, default: null })
  toc_created_at: Date;
}
