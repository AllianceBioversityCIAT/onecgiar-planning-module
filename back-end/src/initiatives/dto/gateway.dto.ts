import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { ChatMessage } from 'src/entities/chat-message.entity';

export class FindChatMessagesDTO {
  @IsNumber()
  @Min(1)
  initiative_id: number;

  @IsNumber()
  @Min(1)
  version_id: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  page: number = 0;
}

export class DeleteMessagesDTO {
  @IsNumber()
  @Min(1)
  message_id: number;
}
export class AddMessagesDTO {
  @IsNumber()
  @Min(1)
  initiative_id: number;

  @IsString()
  @MinLength(1)
  message: '<font size="2">kkk</font>';

  @IsObject()
  @IsOptional()
  replied_message: ChatMessage;
}

export class UpdateMessagesDTO {
  @IsNumber()
  @Min(1)
  id: number;

  @IsString()
  @MinLength(1)
  message: '<font size="2">kkk</font>';

  @IsObject()
  @IsOptional()
  replied_message: ChatMessage;
}
