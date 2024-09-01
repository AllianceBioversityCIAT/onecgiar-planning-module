import { ApiProperty } from "@nestjs/swagger";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";
import { Initiative } from "./initiative.entity";
import { Organization } from "./organization.entity";
import { WorkPackage } from "./workPackage.entity";
import { ResultPeriodValues } from "./resultPeriodValues.entity";
import { Period } from "./period.entity";

@Entity()
export class History {
    @ApiProperty()
    @PrimaryGeneratedColumn()
    id: number; 

    @ApiProperty()
    @Column({type: 'longtext', nullable: true})
    item_name: string;

    @ApiProperty()
    @Column()
    resource_property: string;

    @ApiProperty()
    @Column({ nullable: true })
    old_value: string;

    @ApiProperty()
    @Column({ nullable: true })
    new_value: string;


    @ApiProperty()
    @Column()
    user_id: number;
  
    @ManyToOne(() => User, (user) => user.history)
    @JoinColumn({ name: 'user_id' })
    user: User;



    @ApiProperty()
    @Column()
    initiative_id: number;
  
    @ManyToOne(() => Initiative, (initiative) => initiative.history)
    @JoinColumn({ name: 'initiative_id' })
    initiative: Initiative;



    @ApiProperty()
    @Column({ nullable: true })
    organization_id: number;
  
    @ManyToOne(() => Organization, (organization) => organization.history)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;



    @ApiProperty()
    @Column({ nullable: true })
    wp_id: number;
  
    @ManyToOne(() =>  WorkPackage, (WorkPackage) => WorkPackage.history)
    @JoinColumn({ name: 'wp_id' })
    work_package:  WorkPackage;



    @ApiProperty()
    @Column({ nullable: true })
    period_id: number;
  
    @ManyToOne(() =>  Period, (Period) => Period.history)
    @JoinColumn({ name: 'period_id' })
    period:  Period;
    
    @ApiProperty()
    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;
}