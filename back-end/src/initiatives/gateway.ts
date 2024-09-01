import {
  ArgumentMetadata,
  HttpException,
  Logger,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ValidationPipeOptions,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatMessageRepositoryService } from './chat-group-repository/chat-group-repository.service';
import { User } from 'src/entities/user.entity';
import { SignedInUser } from 'src/user.decorator';
import { WsGuard } from 'src/ws.guard';
import { InitiativesService } from './initiatives.service';
import { ChatMessage } from 'src/entities/chat-message.entity';
import { Repository } from 'typeorm';
import { Submission } from 'src/entities/submission.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AddMessagesDTO,
  DeleteMessagesDTO,
  FindChatMessagesDTO,
  UpdateMessagesDTO,
} from './dto/gateway.dto';

const logger = new Logger('Node Error');

export class WSValidationPipe extends ValidationPipe {
  constructor(options?: ValidationPipeOptions) {
    super(options);
  }

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    try {
      return await super.transform(value, metadata);
    } catch (e: any) {
      if (e instanceof HttpException) {
        throw new WsException({ ...(e.getResponse() as Object), value });
      }

      throw e;
    }
  }
}
@UsePipes(WSValidationPipe)
@WebSocketGateway({
  namespace: 'chat',
  maxHttpBufferSize: 100000000000000,
  pingTimeout: 10000,
  connectTimeout: 10000,

  cors: {
    origin: '*',
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatGateway.name);
  usersResourceHoldingMap = new Map<string, any>();
  @WebSocketServer() server: Server;

  constructor(
    private chatGroupRepositoryService: ChatMessageRepositoryService,
    private initiativesService: InitiativesService,
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
  ) {}

  afterInit() {
    this.logger.log('Gateway is init');
  }

  handleDisconnect(client: Socket) {
    const result = client.disconnect();
    const userId = result['user']?.id;
    const roomId = result.request.headers.referer?.split('/')?.pop();
    if (userId && roomId)
      this.leave({ flowId: roomId }, client, result['user']);
    this.logger.log('Diagram socket disconnection');
  }

  handleConnection(client) {
    this.logger.log('Diagram socket connection', client.id);
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('add-group-chat-message')
  async addChatMessage(
    @MessageBody() data: AddMessagesDTO,
    @ConnectedSocket() client: Socket,
    @SignedInUser() user: User,
  ) {

    const isAllowed = await this.initiativesService.idUserHavePermissionToAdd(
      data.initiative_id,
      user,
    );

    if (!isAllowed) throw new WsException('Unauthorized');

    const sub = await this.submissionRepo.findOne({
      where: {
        initiative_id: data.initiative_id,
      },
      order: { created_at: 'DESC' },
      select: ['id', 'initiative_id'],
    });

    console.log(sub);

    const m = new ChatMessage();
    m.initiative_id = data.initiative_id;
    m.version_id = sub.id;
    m.message = data.message;
    m.replied_message = data.replied_message;
    m.user_id = user.id;

    const message = await this.chatGroupRepositoryService.addChatMessage(m);

    client.broadcast
      .to(this.getChatRoomId(m.initiative_id))
      .emit('message-has-been-added', message);

    return message;

  }

  @UseGuards(WsGuard)
  @SubscribeMessage('update-group-chat-message')
  async updateChatMessage(
    @MessageBody() data: UpdateMessagesDTO,
    @ConnectedSocket() client: Socket,
    @SignedInUser() user: User,
  ) {
    const isAllowed = await this.initiativesService.idUserHavePermissionToEdit(
      data.id,
      user,
    );
    if (!isAllowed) throw new WsException('Unauthorized');

    const message = await this.chatGroupRepositoryService.updateChatMessage(
      data.id,
      data,
    );
    client.broadcast
      .to(this.getChatRoomId(message.initiative_id))
      .emit('message-has-been-updated', message);

    return message;
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('get-group-chat-messages')
  async getMessages(
    @MessageBody() data: FindChatMessagesDTO,
    @ConnectedSocket() client: Socket,
    @SignedInUser() user: User,
  ) {
    const isAllowed = await this.initiativesService.idUserHavePermissionSeeChat(
      data.initiative_id,
      user,
    );
    if (!isAllowed) throw new WsException('Unauthorized');

    const message =
      await this.chatGroupRepositoryService.getMessagesForInitiative(
        data.initiative_id,
        // data.version_id,
        data.page,
      );
    return message;
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('delete-group-chat-message')
  async deleteMessages(
    @MessageBody() data: DeleteMessagesDTO,
    @ConnectedSocket() client: Socket,
    @SignedInUser() user: User,
  ) {
    const isAllowed =
      await this.initiativesService.idUserHavePermissionToDelete(
        data.message_id,
        user,
      );
    if (!isAllowed) throw new WsException('Unauthorized');

    const message = await this.chatGroupRepositoryService.deleteChatMessage(
      data.message_id,
    );
    client.broadcast
      .to(this.getChatRoomId(message.initiative_id))
      .emit('message-has-been-deleted', message);
    return message;
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('join-group-chat')
  async join(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
    @SignedInUser() user: User,
  ) {
    client['user'] = user;
    const isAllowedToJoin =
      await this.initiativesService.idUserHavePermissionToJoinChatGroup(
        data.initiative_id,
        user,
      );

    if (isAllowedToJoin) {
      await client.join(this.getChatRoomId(data.initiative_id));
      return true;
    } else return false;
  }

  @UseGuards(WsGuard)
  @SubscribeMessage('leave-group-chat')
  async leave(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
    @SignedInUser() user: User,
  ) {
    await client.leave(this.getChatRoomId(data.initiative_id));
    return true;
  }

  getChatRoomId(id: number) {
    return 'initiative-chat-' + id;
  }
}
