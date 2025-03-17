import { Module } from '@nestjs/common';
import { ArchiveController } from './archive.controller';
import { ArchiveService } from './archive.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Archive } from 'src/entities/archive.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Archive
    ]),
  ],
  controllers: [ArchiveController],
  providers: [ArchiveService]
})
export class ArchiveModule {}
