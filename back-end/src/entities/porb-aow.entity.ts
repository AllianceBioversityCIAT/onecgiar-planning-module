import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Initiative } from './initiative.entity';

@Entity('porb_aow')
export class PorbAow {
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
  @Column({ type: 'uuid' })
  toc_id: string;

  @ApiProperty()
  @Column()
  aow_name: string;

  @ApiProperty()
  @Column({ nullable: true })
  aow_acrnum: string;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  toc_is_deleted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
