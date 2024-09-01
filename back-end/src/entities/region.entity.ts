import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Country } from './country.entity';
// import { Melia } from './melia.entity';

@Entity()
export class Region {
  @PrimaryGeneratedColumn()
  um49Code: number;

  @Column()
  name: string;

  @ManyToOne(() => Region, (region) => region.childRegions)
  parentRegion: Region;

  @OneToMany(() => Region, (region) => region.parentRegion)
  childRegions: Region[];

  @OneToMany(() => Country, (country) => country.region)
  countries: Country[];

  // @ManyToMany(() => Melia, (melia) => melia.initiative_regions)
  // melia: Melia[];

  // @ManyToMany(() => Melia, (melia) => melia.co_initiative_regions)
  // melia_co: Melia[];
}
