import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Initiative } from './initiative.entity';
import { Organization } from './organization.entity';
import { PorbAow } from './porb-aow.entity';
import { PorbPartner } from './porb-partner.entity';

@Index(['program_id', 'center_id'])
@Entity('porb_contracted_partners')
export class PorbContractedPartner {
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
  center_id: number;

  @ManyToOne(() => Organization, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'center_id' })
  center: Organization;

  @ApiProperty()
  @Column()
  porb_partner_id: number;

  @ManyToOne(() => PorbPartner, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'porb_partner_id' })
  porb_partner: PorbPartner;

  @ApiProperty()
  @Column()
  porb_aow_id: number;

  @ManyToOne(() => PorbAow, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'porb_aow_id' })
  porb_aow: PorbAow;

  @ApiProperty()
  @Column({ type: 'mediumtext' })
  countries: string;

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
