import { Logger, OnModuleInit, Req, UseGuards } from '@nestjs/common';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { planing_data } from './defalut';
import { SubmissionService } from 'src/submission/submission.service';
import { PhasesService } from 'src/phases/phases.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;
  planing_data: any = planing_data;
  constructor(private submissionService: SubmissionService, private phaseService: PhasesService) {}

  @SubscribeMessage('setDataValue')
  changePer(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('setDataValue-' + data.id, data);
  }
  @SubscribeMessage('setDataValueForIndicator')
  setDataValueForIndicator(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('setDataValueForIndicator-' + data.id, data);
  }
  @SubscribeMessage('setDataValueForAll')
  setDataValueForAll(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('setDataValueForAll-' + data.id, data);
  }
  @SubscribeMessage('statusOfCenter')
  changeStatus(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('statusOfCenter', data);
  }

  @SubscribeMessage('validateOfCenter')
  validateCenter(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('validateOfCenter', data);
  }

  @SubscribeMessage('setDataValues')
  setDataValue(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('setDataValues-' + data.id, data);
  }

  @SubscribeMessage('setAllDataValues')
  setAllDataValues(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('setAllDataValues-' + data.id, data);
  }

  @SubscribeMessage('setDataBudget')
  setDataBudget(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('setDataBudget-' + data.id, data);
  }

  @SubscribeMessage('submissionStatus')
  submissionStatus(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('submissionStatus', data);
  }

  @SubscribeMessage('downloadReady')
  downloadReady(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('downloadReady', data);
  }

  @SubscribeMessage('isExporting')
  isExporting(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('isExporting', data);
  }

  @SubscribeMessage('markPORBAsValid')
  markPORBAsValid(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('markPORBAsValid', data);
  }

  @SubscribeMessage('setDataAnaplan')
  setDataAnaplan(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('setDataAnaplan', data);
  }



  @SubscribeMessage('changeSubmissionStatus')
  changeSubmissionStatus(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('changeSubmissionStatus', data);
  }

  @SubscribeMessage('setSelectedCountryPartner')
  setSelectedCountryPartner(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('setSelectedCountryPartner', data);
  }

  @SubscribeMessage('setSelectedCountrySummary')
  async setSelectedCountrySummary(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    const { official_code, result_id, wp } = data;
    let activePhase = await this. phaseService.findActivePhase();
    const selectedCountries = await this.submissionService.getSelectedCountry(result_id, official_code, activePhase.id)
    this.server.emit('setSelectedCountrySummary', { wp, selectedCountries, result_id });
  }

  @SubscribeMessage('setSelectedCountrySummaryRemove')
  async setSelectedCountrySummaryRemove(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    const { official_code, result_id, wp } = data;
    let activePhase = await this. phaseService.findActivePhase();
    const selectedCountries = await this.submissionService.getSelectedCountry(result_id, official_code, activePhase.id)
    this.server.emit('setSelectedCountrySummaryRemove', { wp, selectedCountries, result_id });
  }

  onModuleInit() {
    this.server?.on('connect', (socket) => {
      socket.on('disconnect', (data) => {
        console.log('disconnect');
      });
      console.log('connect and send data');
    });
  }
}
