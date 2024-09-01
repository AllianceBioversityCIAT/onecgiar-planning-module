import {
  Column,
  Entity,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Result } from './result.entity';
import { History } from './history.entity';


@Entity()
export class WorkPackage {
  @PrimaryColumn()
  wp_id: number;

  @Column()
  name: string;

  @Column()
  acronym: string;

  @Column({ nullable: true })
  results: string;

  @Column()
  stage_id: number;

  @Column()
  initiative_id: number;

  @Column({type:'text'})
  pathway_content: string;

  @Column()
  wp_official_code: string;

  @Column()
  initiative_status: string;

  @Column()
  initiative_offical_code: string;

  @OneToMany(() => Result, (result) => result.workPackage)
  wp_results: Result[];


  @OneToMany(() => History, (history) => history.work_package)
  history: History[];
}
