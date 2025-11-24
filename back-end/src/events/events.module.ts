import { forwardRef, Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { SubmissionModule } from 'src/submission/submission.module';
import { PhasesModule } from 'src/phases/phases.module';

@Module({
  imports: [forwardRef(() => SubmissionModule), PhasesModule],

  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
