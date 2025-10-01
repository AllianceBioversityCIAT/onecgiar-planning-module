import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClarisaCountry } from 'src/entities/clarisa-country.entity';
import { PartnerCountry } from 'src/entities/Partner-country.entity';
import { WorkPackage } from 'src/entities/workPackage.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ClarisaCountryService {
  constructor(
    @InjectRepository(ClarisaCountry)
    private repo: Repository<ClarisaCountry>,
    @InjectRepository(PartnerCountry)
    private partnerCountryRepo: Repository<PartnerCountry>,
    @InjectRepository(WorkPackage)
    private workPackageRepo: Repository<WorkPackage>,
  ) {}

  findAll() {
    return this.repo.find();
  }

  findAllValues() {
    return this.partnerCountryRepo.find({
      relations: ['organization', 'workPackage', 'initiative', 'country']
    });
  }

  async createOrUpdate(data: any) {
    const { initiative_id, wp, partner, result_id } = data;

    let workPackageObject : any = await this.workPackageRepo.findOneBy({
      wp_official_code: wp.ost_wp.wp_official_code + '-partners',
    });

    await this.partnerCountryRepo.delete({
      initiative_id,
      center_code: partner.code,
      wp_id:  workPackageObject.wp_id,
      result_id: result_id,
    });

    const entities = partner.selectedCountries.map((c) =>
      this.partnerCountryRepo.create({
        initiative_id,
        center_code: partner.code,
        wp_id: workPackageObject.wp_id,
        country_code: c.code,
        result_id: result_id,
      }),
    );

    return this.partnerCountryRepo.save(entities);
  }
}
