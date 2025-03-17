import { ApiProperty } from '@nestjs/swagger';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
  } from 'typeorm';
import { Initiative } from './initiative.entity';

  @Entity()
  export class Archive {
    @ApiProperty()
    @PrimaryGeneratedColumn()
    id: number;
  
    @ApiProperty()
    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;
    
    @ApiProperty()  
    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @Column({ type: 'json', nullable: false })
    data: string;

    @ApiProperty()
    @Column()
    initiative_id: number;
    
    @OneToOne(() => Initiative)
    @JoinColumn({ name: 'initiative_id' })
    initiative: Initiative;

   
}
  