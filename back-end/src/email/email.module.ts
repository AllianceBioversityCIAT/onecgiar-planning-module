import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Email } from 'src/entities/email.entity';
import { Variable } from 'src/entities/variable.entity';
import { VariableService } from 'src/variable/variable.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Email,
      Variable
    ]),
  ],
  controllers: [EmailController],
  providers: [EmailService, VariableService],
  exports: [EmailService, VariableService]
})
export class EmailModule {}
