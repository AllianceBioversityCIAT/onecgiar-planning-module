import { forwardRef, Inject, Logger, OnModuleInit } from '@nestjs/common';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { planing_data } from './defalut';
import { SubmissionService } from 'src/submission/submission.service';
import { PhasesService } from 'src/phases/phases.service';
import { UsersService } from 'src/users/users.service';
import { verify } from 'jsonwebtoken';
import { readFileSync } from 'fs';
import { join } from 'path';

function loadAppVersion(): string {
  if (process.env.APP_BUILD_VERSION && process.env.APP_BUILD_VERSION !== 'dev') {
    return process.env.APP_BUILD_VERSION;
  }
  try {
    const versionFile = readFileSync(join(__dirname, '..', '..', '..', 'version.json'), 'utf8');
    return JSON.parse(versionFile).version || 'dev';
  } catch {
    return 'dev';
  }
}
const APP_VERSION = loadAppVersion();

interface OnlineUser {
  socketId: string;
  userId: number;
  fullName: string;
  email: string;
  sp?: string;
  initiative_id?: number;
  connectedAt: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnModuleInit, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  planing_data: any = planing_data;
  private readonly logger = new Logger(EventsGateway.name);
  private onlineUsers = new Map<string, OnlineUser>();
  constructor(
    @Inject(forwardRef(() => SubmissionService))
    private submissionService: SubmissionService,
    private phaseService: PhasesService,
    private usersService: UsersService,
  ) {}

  private getTokenFromSocket(socket: Socket): string | null {
    const headerToken =
      (socket.handshake.headers?.authorization as string) ||
      (socket.handshake.headers?.Authorization as string);
    const queryToken = socket.handshake.query?.Authorization as string;
    const rawToken = headerToken || queryToken;
    if (!rawToken) return null;
    const [scheme, token] = rawToken.split(' ');
    return token || rawToken;
  }

  private async resolveSocketUser(socket: Socket) {
    const token = this.getTokenFromSocket(socket);
    if (!token) return null;
    try {
      const decoded = verify(token, process.env.JWT_SECRET_KEY) as any;
      return await this.usersService.findOne(decoded.id);
    } catch (error) {
      this.logger.warn(`Failed to resolve socket user: ${error.message}`);
      return null;
    }
  }

  private getOnlineUsersList() {
    return Array.from(this.onlineUsers.values());
  }

  private broadcastOnlineUsers() {
    this.server.emit('onlineUsers', this.getOnlineUsersList());
  }

  @SubscribeMessage('userOnline')
  async userOnline(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
    const user = await this.resolveSocketUser(socket);
    if (!user) return;

    const onlineUser: OnlineUser = {
      socketId: socket.id,
      userId: user.id,
      fullName: `${user.first_name} ${user.last_name}`,
      email: user.email,
      sp: data?.sp,
      initiative_id: data?.initiative_id,
      connectedAt: new Date().toISOString(),
    };

    this.onlineUsers.set(socket.id, onlineUser);
    this.broadcastOnlineUsers();
    return onlineUser;
  }

  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() socket: Socket) {
    const onlineUsers = this.getOnlineUsersList();
    socket.emit('onlineUsers', onlineUsers);
    return onlineUsers;
  }

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

  handleDisconnect(socket: Socket) {
    if (this.onlineUsers.delete(socket.id)) {
      this.broadcastOnlineUsers();
    }
    this.logger.log(`Socket disconnected: ${socket.id}`);
  }

  onModuleInit() {
    this.logger.log(`App version: ${APP_VERSION}`);
    this.server?.on('connect', (socket) => {
      this.logger.log(`Socket connected: ${socket.id}`);
      socket.emit('appVersion', { version: APP_VERSION });
    });
  }
}
