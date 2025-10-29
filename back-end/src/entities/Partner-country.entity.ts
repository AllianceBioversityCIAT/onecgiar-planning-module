import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ClarisaCountry } from "./clarisa-country.entity";
import { WorkPackage } from "./workPackage.entity";
import { Initiative } from "./initiative.entity";
import { Organization } from "./organization.entity";
import { Phase } from "./phase.entity";

@Entity('partner_countries')
export class PartnerCountry {
  @PrimaryGeneratedColumn()
  id: number;


  @ManyToOne(() => Organization, { eager: true })
  @JoinColumn({ name: 'center_code' })
  organization: Organization;

  @Column()
  center_code: number;




  @JoinColumn({ name: 'wp_id' })
  @ManyToOne(() => WorkPackage)
  workPackage: WorkPackage;

  @Column()
  wp_id: number;


  @JoinColumn({ name: 'phase_id' })
  @ManyToOne(() => Phase)
  phase: Phase;

  @Column({ nullable: false})
  phase_id: number;
  
  @JoinColumn({ name: 'initiative_id' })
  @ManyToOne(() => Initiative)
  initiative: Initiative;

  @Column()
  initiative_id: number;

  @ManyToOne(() => ClarisaCountry, { eager: true })
  @JoinColumn({ name: 'country_code' })
  country: ClarisaCountry;
  
  @Column()
  country_code: number;

  @Column()
  result_id: number;

  // @Column()
  // group_id: string;
}
