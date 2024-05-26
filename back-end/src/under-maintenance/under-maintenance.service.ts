import { Injectable } from '@nestjs/common';
import { underMaintenance } from 'src/entities/underMaintenance.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UnderMaintenanceService {
  constructor(
    @InjectRepository(underMaintenance)
    private underMaintenanceRepository: Repository<underMaintenance>,
  ) {}

  getUnderMaintenance() {
    return this.underMaintenanceRepository.find();
  }

  getStatus() {
    return this.underMaintenanceRepository.findOne({ where: { id: 1 } });
  }

  async changeStatus(value: any) {
    const publish = await this.underMaintenanceRepository.findOne({
      where: { id: 1 },
    });
    publish.status = value.status;
    return await this.underMaintenanceRepository.save(publish);
  }

  async editUnderMaintenance(data: any) {
    try {
      const constant = await this.underMaintenanceRepository.findOne({
        where: { id: data.id },
      });

      constant.value = data.value;
      return await this.underMaintenanceRepository.save(constant);
    } catch (error) {
      console.error(error);
    }
  }
}
