import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Initiative } from './initiative.entity';
import { Country } from './country.entity';
import { Partner } from './partner.entity';
import { Region } from './region.entity';
import { InitiativeMelia } from './initiative-melia.entity';
import { Submission } from './submission.entity';

@Entity()
export class Melia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @JoinColumn({ name: 'initiative_id' })
  @ManyToOne(() => Initiative, (initiative) => initiative.submissions)
  initiative: Initiative;

  @Column()
  initiative_id: number;

  @Column()
  wp_id: string;

  @JoinColumn({ name: 'initiative_melia_id' })
  @ManyToOne(() => InitiativeMelia, (initiativeMelia) => initiativeMelia.melia)
  initiativeMelia: InitiativeMelia;

  @Column({ nullable: true })
  initiative_melia_id: number;

  // @JoinColumn({ name: 'melia_type' })
  // @ManyToOne(() => MeliaTypes, (meliaTypes) => meliaTypes.melia)
  // meliaType: MeliaTypes;

  // @Column({ nullable: true })
  // melia_type: number;

  // @Column({ type: 'text', nullable: true })
  // methodology: string;

  // @Column({ nullable: true })
  // experimental: boolean;

  // @Column({ type: 'text', nullable: true })
  // questionnaires: string;

  // @Column({ nullable: true })
  // completion_year: string;

  // @Column({ type: 'text', nullable: true })
  // management_decisions: string;

  @ManyToMany(() => Partner, (partner) => partner.melia)
  @JoinTable()
  partners: Partner[];

  // @ManyToMany(() => Initiative, (initiative) => initiative.melia)
  // @JoinTable()
  // other_initiatives: Initiative[];

  @Column({ type: 'json', nullable: true })
  contribution_results: string;

  @Column({ nullable: true })
  geo_scope: string;

  @ManyToMany(() => Region, (region) => region.melia)
  @JoinTable()
  initiative_regions: Region[];

  @ManyToMany(() => Region, (region) => region.melia_co)
  @JoinTable()
  co_initiative_regions: Region[];

  @ManyToMany(() => Country, (country) => country.melia)
  @JoinTable()
  initiative_countries: Country[];

  @ManyToMany(() => Country, (country) => country.melia_co)
  @JoinTable()
  co_initiative_countries: Country[];

  @ManyToOne(() => Submission, (submission) => submission.melias)
  @JoinColumn({ name: 'submission_id' })
  submission: Submission;

  @Column({ nullable: true })
  submission_id: number;
}
