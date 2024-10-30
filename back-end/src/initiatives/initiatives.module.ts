import { Module } from '@nestjs/common';
import { InitiativesService } from './initiatives.service';
import { InitiativesController } from './initiatives.controller';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Initiative } from 'src/entities/initiative.entity';
import { WorkPackage } from 'src/entities/workPackage.entity';
import { InitiativeRoles } from 'src/entities/initiative-roles.entity';
import { User } from 'src/entities/user.entity';
import { EmailService } from 'src/email/email.service';
import { Email } from 'src/entities/email.entity';
import { Variable } from 'src/entities/variable.entity';
import { ChatMessageRepositoryService } from './chat-group-repository/chat-group-repository.service';
import { ChatMessage } from 'src/entities/chat-message.entity';
import { UsersModule } from 'src/users/users.module';
import { WsGuard } from 'src/ws.guard';
import { ChatGateway } from './gateway';
import { Submission } from 'src/entities/submission.entity';
import { EmailModule } from 'src/email/email.module';
import { History } from 'src/entities/history.entity';
import { Result } from 'src/entities/result.entity';
import { PhasesModule } from 'src/phases/phases.module';
import { WpBudget } from 'src/entities/wp-budget.entity';
import { Organization } from 'src/entities/organization.entity';



@Module({
  imports: [
    TypeOrmModule.forFeature([
      Initiative,
      WorkPackage,
      InitiativeRoles,
      ChatMessage,
      Submission,
      User,
      Variable,
      Email,
      History,
      Result,
      WpBudget,
      Organization
    ]),
    HttpModule,
    UsersModule,
    EmailModule,
    PhasesModule
  ],
  controllers: [InitiativesController],
  providers: [
    InitiativesService,
    ChatMessageRepositoryService,
    WsGuard,
    ChatGateway,
  ],
  exports: [InitiativesService],
})
export class InitiativesModule {}
