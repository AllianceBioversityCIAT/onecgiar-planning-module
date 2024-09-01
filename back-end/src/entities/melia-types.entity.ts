import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class MeliaTypes {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ type: 'text' })
  name: string;

  @ApiProperty()
  @Column({ type: 'text' })
  description: string;

  @ApiProperty()
  @Column({ nullable: true })
  availability: string;

  // @JoinColumn()
  // @OneToMany(() => Melia, (melia) => melia.meliaType)
  // melia: Melia;

  @ApiProperty()
  @Column({ default: false })
  HideCrossCutting: boolean;
}
