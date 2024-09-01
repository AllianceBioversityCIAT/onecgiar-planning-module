import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Result } from './result.entity';
import { Initiative } from './initiative.entity';
import { Submission } from './submission.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class CrossCutting {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column('longtext', { nullable: true })
  title: string;

  @ApiProperty()
  @Column('longtext', { nullable: true })
  description: string;

  @JoinColumn({ name: 'initiative_id' })
  @ManyToOne(() => Initiative, (initiative) => initiative.submissions)
  initiative: Initiative;

  @ApiProperty()
  @Column()
  initiative_id: number;

  @ManyToOne(() => Submission, (submission) => submission.crossCutting)
  @JoinColumn({ name: 'submission_id' })
  submission: Submission;

  @ApiProperty()
  @Column({ nullable: true })
  submission_id: number;
}
