import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
// import { Melia } from './melia.entity';
import { Region } from './region.entity';

@Entity()
export class Country {
  @PrimaryGeneratedColumn()
  code: number;

  @Column()
  name: string;

  @Column()
  isoAlpha2: string;

  @Column()
  isoAlpha3: string;

  @ManyToOne(() => Region, (region) => region.countries)
  region: Region;

  // @ManyToMany(() => Melia, (melia) => melia.initiative_countries)
  // melia: Melia[];

  // @ManyToMany(() => Melia, (melia) => melia.co_initiative_countries)
  // melia_co: Melia[];
}
