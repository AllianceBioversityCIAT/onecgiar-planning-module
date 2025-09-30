import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class ClarisaCountry {
  @PrimaryColumn()
  code: string;

  @Column()
  name: string;

  @Column()
  isoAlpha2: string;

  @Column()
  isoAlpha3: string;

  @Column({ nullable: true })
  regionName: string;

  @Column({ nullable: true })
  parentRegionName: string;

  @Column('decimal', { nullable: true })
  latitude: number;

  @Column('decimal', { nullable: true })
  longitude: number;
}
