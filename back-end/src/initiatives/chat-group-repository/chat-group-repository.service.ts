import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  PaginateQuery,
  Paginated,
  paginate,
} from 'nestjs-paginate';
import { ChatMessage } from 'src/entities/chat-message.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ChatMessageRepositoryService {
  constructor(
    @InjectRepository(ChatMessage) private messageRepo: Repository<ChatMessage>,
  ) {}

  async addChatMessage(chatMessage: ChatMessage) {
    const response = await this.messageRepo.save(chatMessage);
    return this.messageRepo.findOne({
      where: { id: response.id },
      relations: ['user', 'replied_message', 'replied_message.user'],
    });
  }

  async updateChatMessage(id: number, chatMessage: Partial<ChatMessage>) {
    await this.messageRepo.update(id, chatMessage);
    return this.messageRepo.findOne({
      where: { id },
      relations: ['user', 'replied_message', 'replied_message.user'],
    });
  }

  async getMessagesForInitiative(
    initiative_id: number,
    // version_id: number,
    page: number,
  ): Promise<Paginated<ChatMessage>> {
    return paginate(
      {
        limit: 10,
        page,
        filter: {
          initiative_id: initiative_id.toString(),
          // version_id: version_id.toString(),
        },
        path: '',
        sortBy: [['id', 'DESC']],
      },
      this.messageRepo,
      {
        sortableColumns: ['create_date', 'id'],
        relations: ['user', 'replied_message', 'replied_message.user'],
        select: [],
        filterableColumns: {
          initiative_id: [FilterOperator.EQ],
          // version_id: [FilterOperator.EQ],
        },
      },
    );
  }

  async deleteChatMessage(id: number) {
    const record = await this.messageRepo.findOne({
      where: { id },
      relations: ['user', 'replied_message', 'replied_message.user'],
    });
    await this.messageRepo.delete(id);
    return record;
  }

  async getMessagesById(id: number) {
    return await this.messageRepo.findOne({
      where: { id },
      relations: ['user', 'replied_message', 'replied_message.user'],
    });
  }
}
