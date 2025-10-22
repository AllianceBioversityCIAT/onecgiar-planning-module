import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { SubmissionModule } from 'src/submission/submission.module';
import { PhasesModule } from 'src/phases/phases.module';

@Module({
  imports: [SubmissionModule, PhasesModule],

  providers: [EventsGateway],
})
export class EventsModule {}