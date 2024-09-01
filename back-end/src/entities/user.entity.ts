import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Submission } from './submission.entity';
import { ApiProperty } from '@nestjs/swagger';
import { InitiativeRoles } from './initiative-roles.entity';
import { History } from './history.entity';
export enum userRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity()
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  email: string;

  @ApiProperty()
  @Column()
  first_name: string;

  @ApiProperty()
  @Column()
  last_name: string;

  @ApiProperty()
  @Column({ type: 'enum', enum: userRole })
  role: userRole;

  @OneToMany(() => Submission, (submission) => submission.user)
  submissions: Submission[];

  @ApiProperty()
  @Column({
      type: "varchar",
      generatedType: 'STORED',
      asExpression: `Concat(first_name,' ' ,last_name)`
    })
    full_name: string;



  @OneToMany(() => InitiativeRoles, (initiativeRoles) => initiativeRoles.user)
  user_init_roles: InitiativeRoles[];

  @OneToMany(() => History, (history) => history.user)
  history: History[];

}
