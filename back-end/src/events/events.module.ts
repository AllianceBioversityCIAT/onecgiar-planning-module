import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { SubmissionModule } from 'src/submission/submission.module';

@Module({
  imports: [SubmissionModule],

  providers: [EventsGateway],
})
export class EventsModule {}