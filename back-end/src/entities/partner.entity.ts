import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
// import { Melia } from './melia.entity';

@Entity()
export class Partner {
  @PrimaryGeneratedColumn()
  code: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  acronym: string;

  @Column({ nullable: true })
  websiteLink: string;

  // @ManyToMany(() => Melia, (melia) => melia.partners)
  // melia: Melia[];
}
