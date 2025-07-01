import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Initiative } from './initiative.entity';
import { Organization } from './organization.entity';
import { Phase } from './phase.entity';

@Entity()
export class CenterStatus {

  @JoinColumn({ name: 'initiative_id' })
  @ManyToOne(() => Initiative)
  initiative: Initiative;

  @Column({primary:true})
  initiative_id: number;

  @JoinColumn({ name: 'organization_code' })
  @ManyToOne(() => Organization)
  organization: Organization;

  @Column({primary:true})
  organization_code: string;

  @JoinColumn({ name: 'phase_id' })
  @ManyToOne(() => Phase)
  phase: Phase;

  @Column({ primary: true })
  phase_id: number;

  @Column()
  status: boolean;

  @Column({type: 'bool', default: false})
  is_valid: boolean;

}
