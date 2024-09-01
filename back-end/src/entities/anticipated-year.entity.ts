// import { ApiProperty } from '@nestjs/swagger';
// import { Phase } from 'src/entities/phase.entity';
// import {
//   Column,
//   Entity,
//   ManyToOne,
//   PrimaryGeneratedColumn,
// } from 'typeorm';

// @Entity()
// export class AnticipatedYear {
//   @ApiProperty()
//   @PrimaryGeneratedColumn()
//   id: number;

//   @ApiProperty()
//   @Column()
//   month: string;

//   @ApiProperty()
//   @Column()
//   year: number;

//   @ManyToOne(() => Phase, (phase) => phase.periods)
//   phase: Phase;

// }
