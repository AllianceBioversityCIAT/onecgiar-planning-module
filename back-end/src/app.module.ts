import { Module } from '@nestjs/common';
import { EventsModule } from './events/events.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { InitiativesModule } from './initiatives/initiatives.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PhasesModule } from './phases/phases.module';
import { PeriodsModule } from './periods/periods.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SubmissionModule } from './submission/submission.module';
import { CrossCuttingModule } from './cross-cutting/cross-cutting.module';
import { ConfigModule } from '@nestjs/config';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { IpsrModule } from './ipsr/ipsr.module';
import { IpsrValueModule } from './ipsr-value/ipsr-value.module';
import { ConstantsModule } from './constants/constants.module';
import { MeliaTypeModule } from './melia-type/melia-type.module';
import { AnticipatedYearModule } from './anticipated-year/anticipated-year.module';
import { PopoverModule } from './popover/popover.module';
import { AppController } from './app.controller';
import { EmailModule } from './email/email.module';
import { VariableModule } from './variable/variable.module';
import { WsGuard } from './ws.guard';
import { UnderMaintenanceModule } from './under-maintenance/under-maintenance.module';

@Module({
  controllers:[AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
        host: process.env.DATABASE_HOST,
        port: Number(process.env.DATABASE_PORT),
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        type: 'mysql',
        synchronize: true,
        entities: [`dist/**/*.entity{.ts,.js}`],
        autoLoadEntities: true,
        namingStrategy: new SnakeNamingStrategy(),
    }),
    ScheduleModule.forRoot(),
    InitiativesModule,
    OrganizationsModule,
    PhasesModule,
    PeriodsModule,
    AuthModule,
    UsersModule,
    SubmissionModule,
    EventsModule,
    CrossCuttingModule,
    IpsrValueModule,
    ConstantsModule,
    MeliaTypeModule,
    AnticipatedYearModule,
    PopoverModule,
    EmailModule,
    VariableModule,
    UnderMaintenanceModule,
    
  ],
})
export class AppModule {}
