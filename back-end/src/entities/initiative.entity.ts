import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Submission } from './submission.entity';
import { ApiProperty } from '@nestjs/swagger';
import { InitiativeRoles } from './initiative-roles.entity';
import { IpsrValue } from './ipsr-value.entity';
import { CenterStatus } from './center-status.entity';
import { History } from './history.entity';

@Entity()
export class Initiative {
  @ApiProperty()
  @PrimaryColumn()
  id: number;

  @ApiProperty()
  @Column()
  name: string;

  @ApiProperty()
  @Column()
  active: number;

  @ApiProperty()
  @Column()
  status: string;

  @ApiProperty()
  @Column()
  stageId: number;

  @ApiProperty()
  @Column()
  short_name: string;

  @ApiProperty()
  @Column()
  description: string;

  @ApiProperty()
  @Column()
  official_code: string;

  @ApiProperty()
  @Column()
  action_area_id: string;

  @ApiProperty()
  @Column()
  action_area_description: string;

  @ApiProperty()
  @ManyToMany(() => Organization, (organization) => organization.initiatives)
  @JoinTable()
  organizations: Organization[];

  @ApiProperty()
  @OneToMany(() => Submission, (submission) => submission.initiative)
  submissions: Submission[];

  @ApiProperty()
  @OneToMany(() => Submission, (melias) => melias.initiative)
  melias: Submission[];

  @ApiProperty({ type: () => [InitiativeRoles] })
  @OneToMany(
    () => InitiativeRoles,
    (initiative_roles) => initiative_roles.initiative,
    { onUpdate: 'RESTRICT', onDelete: 'RESTRICT' },
  )
  @JoinTable()
  roles: Array<InitiativeRoles>;

  @ApiProperty({ type: () => [CenterStatus] })
  @OneToMany(() => CenterStatus, (center_status) => center_status.initiative, {
    onUpdate: 'RESTRICT',
    onDelete: 'RESTRICT',
  })
  @JoinTable()
  center_status: Array<CenterStatus>;

  @ApiProperty()
  @Column({ nullable: true })
  last_update_at: Date;
  @ApiProperty()
  @Column({ nullable: true })
  last_submitted_at: Date;

  @ApiProperty()
  @OneToMany(() => IpsrValue, (ipsrValue) => ipsrValue.initiative)
  ipsrValues: IpsrValue[];

  @ApiProperty()
  @Column({ nullable: true, default: null })
  latest_submission_id: number;

  @ApiProperty()
  @ManyToOne(() => Submission)
  @JoinColumn({ name: 'latest_submission_id' })
  latest_submission: Submission;


  @OneToMany(() => History, (history) => history.initiative)
  history: History[];

  // @ManyToMany(() => Melia, (melia) => melia.other_initiatives)
  // melia: Melia[];

  // @ApiProperty()
  // @ManyToMany(() => InitiativeMelia, (initiativeMelia) => initiativeMelia.other_initiatives)
  // initiativeMelia: InitiativeMelia[];
}
