import {
  Column,
  Entity,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Result } from './result.entity';
import { History } from './history.entity';


@Entity()
export class WorkPackage {
  @PrimaryGeneratedColumn()
  wp_id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  acronym: string;

  @Column({ nullable: true })
  results: string;

  @Column({ nullable: true })
  stage_id: number;

  @Column({ nullable: true })
  initiative_id: number;

  @Column({type:'text', nullable: true})
  pathway_content: string;

  @Column()
  wp_official_code: string;

  @Column({ nullable: true })
  initiative_status: string;

  @Column()
  initiative_offical_code: string;

  @OneToMany(() => Result, (result) => result.workPackage)
  wp_results: Result[];


  @OneToMany(() => History, (history) => history.work_package)
  history: History[];
}
