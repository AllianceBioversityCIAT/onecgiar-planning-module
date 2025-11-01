import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClarisaCountry } from 'src/entities/clarisa-country.entity';
import { PartnerCountry } from 'src/entities/Partner-country.entity';
import { WorkPackage } from 'src/entities/workPackage.entity';
import { PhasesService } from 'src/phases/phases.service';
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
    private phaseService: PhasesService,
  ) {}

  findAll() {
    return this.repo.find();
  }

  findAllValues(id: number) {
    return this.partnerCountryRepo.find({
      relations: ['organization', 'workPackage', 'initiative', 'country'],
      where: {
        phase: {
          id: id
        }
      }
    });
  }


  async findOne(data: any) {
    const { initiative_id, wp_id, partner_code,phase_id, item_id } = data;

    let workPackageObject : any = await this.workPackageRepo.findOneBy({
      wp_official_code: wp_id,
    });

    const countries = await this.partnerCountryRepo.find({
      where: {
        initiative_id: initiative_id,
        center_code: partner_code,
        phase_id: phase_id,
        result_id: item_id,
        workPackage: workPackageObject
      }
    });
    if (countries.length > 0) {
      await this.partnerCountryRepo.remove(countries);
    }
  }


  async createOrUpdate(data: any) {
    const { initiative_id, wp_official_code, partner_code,selectedCountries, result_id } = data;

    let activePhase = await this.phaseService.findActivePhase();
    let workPackageObject : any = await this.workPackageRepo.findOneBy({
      wp_official_code: wp_official_code + '-partners',
    });

    await this.partnerCountryRepo.delete({
      initiative_id,
      center_code: partner_code,
      wp_id:  workPackageObject.wp_id,
      result_id: result_id,
      phase_id: activePhase.id
    });

    const entities = selectedCountries.map((c) =>
      this.partnerCountryRepo.create({
        initiative_id,
        center_code: partner_code,
        wp_id: workPackageObject.wp_id,
        country_code: c,
        result_id: result_id,
        phase_id: activePhase.id
      }),
    );

    return this.partnerCountryRepo.save(entities);
  }
}
