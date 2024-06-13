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
    const message = await this.underMaintenanceRepository.findOne({
      where: { id: 1 },
    });
    message.status = value.status;
    return await this.underMaintenanceRepository.save(message);
  }

  async editUnderMaintenance(data: any) {
    try {
      const message = await this.underMaintenanceRepository.findOne({
        where: { id: data.id },
      });

      message.value = data.value;
      return await this.underMaintenanceRepository.save(message);
    } catch (error) {
      console.error(error);
    }
  }
}
