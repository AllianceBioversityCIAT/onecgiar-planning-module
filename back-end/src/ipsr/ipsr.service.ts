import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Ipsr } from 'src/entities/ipsr.entity';
import { ILike, Repository } from 'typeorm';
import { IpsrValue } from 'src/entities/ipsr-value.entity';
@Injectable()
export class IpsrService {
  constructor(
    @InjectRepository(Ipsr)
    private ipsrRepository: Repository<Ipsr>,
    @InjectRepository(IpsrValue)
    private ipsrValueRepository: Repository<IpsrValue>,
  ) {}

  async findAll(query: any = null) {
    return await this.ipsrRepository.find({
      where: {
        title: query?.title ? ILike(`%${query?.title}%`) : null, 
      }
    });
  }

  create(data: any) {
    return this.ipsrRepository.save(this.ipsrRepository.create({ ...data }));
  }
  findOne(id: number) {
    return this.ipsrRepository.findOneBy({ id });
  }

  update(id: number, data: any) {
    return this.ipsrRepository.update({ id }, { ...data });
  }
  async remove(id: number) {
    const ipsr = await this.ipsrValueRepository.find({
      where: {
        ipsr: {
          id: id
        }
      }
    });
    if(ipsr.length == 0) {
      return this.ipsrRepository.delete({ id });
    } else {
      throw new BadRequestException('The IPRS cannot be deleted, This IPSR is assigned for an initiative(s)')
    }
  }
}
