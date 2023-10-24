import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Melia } from './melia.entity';

@Entity()
export class MeliaTypes {
  @PrimaryColumn()
  id: number;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  availability: string;

  @JoinColumn()
  @OneToMany(() => Melia, (melia) => melia.meliaType)
  melia: Melia;
}