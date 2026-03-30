import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Initiative } from './initiative.entity';
import { Organization } from './organization.entity';
import { PorbAow } from './porb-aow.entity';
import { CrossCutting } from './cross-cutting.entity';
import { StanderdCrossCutting } from './standerd-cross-cutting.entity';

@Entity('porb_cross')
export class PorbCross {
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
  @Column({ nullable: true })
  cross_cutting_id: string;

  @ManyToOne(() => CrossCutting, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'cross_cutting_id' })
  cross_cutting: CrossCutting;

  @ApiProperty()
  @Column({ nullable: true })
  standerd_cross_cutting_id: number;

  @ManyToOne(() => StanderdCrossCutting, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'standerd_cross_cutting_id' })
  standerd_cross_cutting: StanderdCrossCutting;

  @ApiProperty()
  @Column({ type: 'float', nullable: true })
  budget: number;

  @ApiProperty()
  @Column({ type: 'mediumtext', nullable: true })
  assumption: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
