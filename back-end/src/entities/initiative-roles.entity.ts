import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinTable,
  ManyToMany,
} from 'typeorm';
import { Initiative } from './initiative.entity';
import { User } from './user.entity';
import { Organization } from './organization.entity';

@Entity()
export class InitiativeRoles {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ nullable: true })
  email: string;

  @ApiProperty()
  @Column({ nullable: true })
  user_id: number;

  @ManyToOne(() => User, (user) => user.user_init_roles, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty()
  @Column()
  initiative_id: number;

  @ManyToOne(() => Initiative, (initiative) => initiative, {
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'initiative_id' })
  initiative: Initiative;

  @ApiProperty()
  @Column()
  role: string;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ApiProperty()
  @ManyToMany(() => Organization, (organization) => organization.initiatives)
  @JoinTable()
  organizations: Organization[];
}
