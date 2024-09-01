import { Module } from '@nestjs/common';
import { VariableController } from './variable.controller';
import { VariableService } from './variable.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Variable } from 'src/entities/variable.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
        Variable,
    ]),
  ],
  controllers: [VariableController],
  providers: [VariableService]
})
export class VariableModule {}
