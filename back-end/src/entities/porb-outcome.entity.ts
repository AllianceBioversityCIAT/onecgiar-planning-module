import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Initiative } from './initiative.entity';
import { PorbAow } from './porb-aow.entity';

@Entity('porb_outcome')
export class PorbOutcome {
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
  @Column({ type: 'varchar', length: 255 })
  toc_id: string;

  @ApiProperty()
  @Column({ type: 'mediumtext' })
  outcome_title: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 255, nullable: true })
  outcome_type: string;

  @ApiProperty()
  @Column({ type: 'json', nullable: true })
  outcome_indicators: Array<{ type: string; description: string; location: string; target_value: number | null }> | null;

  @ApiProperty()
  @Column({ type: 'mediumtext', nullable: true })
  outcome_geo: string;

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
