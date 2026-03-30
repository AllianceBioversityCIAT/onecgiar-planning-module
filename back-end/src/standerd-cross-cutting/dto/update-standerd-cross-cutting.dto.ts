import { PartialType } from '@nestjs/swagger';
import { CreateStanderdCrossCuttingDto } from './create-standerd-cross-cutting.dto';

export class UpdateStanderdCrossCuttingDto extends PartialType(CreateStanderdCrossCuttingDto) {}
