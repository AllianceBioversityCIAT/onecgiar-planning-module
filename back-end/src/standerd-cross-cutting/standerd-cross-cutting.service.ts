import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StanderdCrossCutting } from 'src/entities/standerd-cross-cutting.entity';
import { CreateStanderdCrossCuttingDto } from './dto/create-standerd-cross-cutting.dto';
import { UpdateStanderdCrossCuttingDto } from './dto/update-standerd-cross-cutting.dto';

@Injectable()
export class StanderdCrossCuttingService {
  constructor(
    @InjectRepository(StanderdCrossCutting)
    private readonly standerdCrossCuttingRepository: Repository<StanderdCrossCutting>,
  ) {}

  create(createDto: CreateStanderdCrossCuttingDto) {
    const entity = this.standerdCrossCuttingRepository.create(createDto);
    return this.standerdCrossCuttingRepository.save(entity);
  }

  findAll() {
    return this.standerdCrossCuttingRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const entity = await this.standerdCrossCuttingRepository.findOne({
      where: { id },
    });
    if (!entity) {
      throw new NotFoundException(`StanderdCrossCutting with id ${id} not found`);
    }
    return entity;
  }

  async update(id: number, updateDto: UpdateStanderdCrossCuttingDto) {
    await this.findOne(id);
    return this.standerdCrossCuttingRepository.update({ id }, { ...updateDto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.standerdCrossCuttingRepository.delete({ id });
  }

  async seed() {
    const count = await this.standerdCrossCuttingRepository.count();
    if (count > 0) {
      return { message: 'Table already has data, skipping seed.' };
    }

    const seedData: Partial<StanderdCrossCutting>[] = [
      { name: 'Program Director and Associated Allocation' },
      { name: 'PMU, CGIAR Program Finance Support and associated Allocation' },
      { name: 'Area of Work Leads' },
      { name: 'Operations' },
      { name: 'Communication/Knowledge management' },
      { name: 'MELIA' },
      { name: 'Discretionary funds' },
    ];

    const entities = this.standerdCrossCuttingRepository.create(seedData);
    await this.standerdCrossCuttingRepository.save(entities);
    return { message: `Seeded ${seedData.length} standerd cross cutting items.` };
  }
}
