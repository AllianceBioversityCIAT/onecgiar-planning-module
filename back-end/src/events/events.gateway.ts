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

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;
  planing_data: any = planing_data;
  constructor() {}

  @SubscribeMessage('setDataValue')
  changePer(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('setDataValue-' + data.id, data);
  }
  @SubscribeMessage('setDataValueForAll')
  setDataValueForAll(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('setDataValueForAll-' + data.id, data);
  }
  @SubscribeMessage('statusOfCenter')
  changeStatus(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('statusOfCenter', data);
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

  @SubscribeMessage('changeSubmissionStatus')
  changeSubmissionStatus(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    this.server.emit('changeSubmissionStatus', data);
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
