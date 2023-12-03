import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Initiative } from './initiative.entity';
import { MeliaTypes } from './melia-types.entity';
import { Melia } from './melia.entity';

@Entity()
export class InitiativeMelia {
  @PrimaryGeneratedColumn()
  id: number;

  @JoinColumn({ name: 'initiative_id' })
  @ManyToOne(() => Initiative)
  initiative: Initiative;

  @Column()
  initiative_id: number;

  @JoinColumn({ name: 'melia_type_id' })
  @ManyToOne(() => MeliaTypes)
  meliaType: MeliaTypes;

  @Column()
  melia_type_id: number;

  @Column({ type: 'text', nullable: true })
  methodology: string;

  @Column({ nullable: true })
  experimental: boolean;

  @Column({ type: 'text', nullable: true })
  questionnaires: string;

  @Column({ nullable: true })
  completion_year: string;

  @Column({ type: 'text', nullable: true })
  management_decisions: string;

  @ManyToMany(() => Initiative, (initiative) => initiative.initiativeMelia)
  @JoinTable()
  other_initiatives: Initiative[];

  @JoinColumn()
  @OneToMany(() => Melia, (melia) => melia.initiativeMelia)
  melia: Melia;
}