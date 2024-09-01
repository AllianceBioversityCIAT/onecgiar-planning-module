import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
  ManyToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

@Entity()
export class ChatMessage {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  version_id: number;

  @ApiProperty()
  @Column()
  initiative_id: number;

  @ApiProperty()
  @CreateDateColumn()
  create_date: Date;

  @ApiProperty()
  @UpdateDateColumn()
  update_date: Date;

  @ApiProperty()
  @DeleteDateColumn()
  delete_date: Date;

  @ApiProperty()
  @Column({ type: 'text' })
  message: string;

  @ApiProperty()
  @Column({ nullable: true })
  replied_message_id: number;

  @ApiProperty()
  @OneToOne(() => ChatMessage)
  @JoinColumn({ name: 'replied_message_id' })
  replied_message: ChatMessage | null;

  @ApiProperty()
  @Column()
  user_id: number;

  @ApiProperty()
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
