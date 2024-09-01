import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from 'src/entities/organization.entity';
import { ILike, Repository } from 'typeorm';
import { catchError, firstValueFrom, map } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { Country } from 'src/entities/country.entity';
import { Partner } from 'src/entities/partner.entity';
import { Region } from 'src/entities/region.entity';
// import { Initiative } from 'src/entities/initiative.entity';
import { PhaseInitiativeOrganization } from 'src/entities/phase-initiative-organization.entity';
@Injectable()
export class OrganizationsService {
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Region)
    private regionRepository: Repository<Region>,
    @InjectRepository(Country)
    private countryRepository: Repository<Country>,
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    @InjectRepository(PhaseInitiativeOrganization)
    private PhInitOrgRepository: Repository<PhaseInitiativeOrganization>,
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto) {
    let orgExist = await this.organizationRepository.findOneBy({
      code: createOrganizationDto.code,
    });

    if (orgExist) {
      throw new BadRequestException(
        'Organization code already exist.',
      );
    }

    const newOrganization = this.organizationRepository.create({
      ...createOrganizationDto,
    });
    return this.organizationRepository.save(newOrganization);
  }

  async findAll(query: any) {
    return await this.organizationRepository.find({
      where: {
        name: query?.name ? ILike(`%${query?.name}%`) : null, 
      },
      order: {
        acronym: 'ASC'
      }
    });
  }

  findOne(code: any) {
    return this.organizationRepository.findOneBy({ code });
  }

  async update(code: any, updateOrganizationDto: UpdateOrganizationDto) {
    if (code != updateOrganizationDto.code) {
      let orgExist = await this.organizationRepository.findOneBy({
        code: updateOrganizationDto.code,
      });

      if (orgExist) {
        throw new BadRequestException('Organization code already exist.');
      }
    }

    return this.organizationRepository.update(
      { code },
      { ...updateOrganizationDto },
    );
  }

  async remove(code: any) {
    const orgUsed = await this.PhInitOrgRepository.find({
      where: {
        organization_code: code
      }
    });
    if(orgUsed.length != 0) {
      throw new BadRequestException('Organization cannot be deleted, This organization is assigned for an initiative(s)')
    } else {
      return this.organizationRepository.delete({ code });
    }    
  }

  async importRegions() {
    const regionsData = await firstValueFrom(
      this.httpService.get('https://api.clarisa.cgiar.org/api/un-regions').pipe(
        map((d: any) => d.data),
        catchError((error: AxiosError) => {
          throw new InternalServerErrorException();
        }),
      ),
    );

    for (let region of regionsData) {
      let { parentRegion } = region;
      if (parentRegion) {
        let parentEntity: any = await this.regionRepository.findOne({
          where: { um49Code: parentRegion.um49Code },
        });
        if (parentEntity == null) {
          parentEntity = await this.createRegion(parentRegion);
        }
        region.parentRegion = parentEntity;
      }
      const entity = await this.regionRepository.findOne({
        where: { um49Code: region.um49Code },
      });
      if (entity != null) {
        await this.regionRepository.update(entity.um49Code, { ...region });
      } else {
        await this.createRegion(region);
      }
    }
  }

  createRegion(data: any) {
    const newRegion = this.regionRepository.create({
      ...data,
    });
    return this.regionRepository.save(newRegion);
  }

  getRegions() {
    return this.regionRepository
      .createQueryBuilder('region')
      .where('region.parent_region_um49_code IS NOT NULL')
      .orderBy('region.name')
      .getMany();
  }

  getCountriesRegions(codes: number[]) {
    return this.regionRepository
      .createQueryBuilder('region')
      .innerJoin(Country, 'country', 'country.region_um49_code = region.um49_code')
      .where('country.code IN (:codes)', { codes: codes })
      .orderBy('region.name')
      .getMany();
  }

  async importCountries() {
    const countriesData = await firstValueFrom(
      this.httpService.get('https://api.clarisa.cgiar.org/api/countries').pipe(
        map((d: any) => d.data),
        catchError((error: AxiosError) => {
          throw new InternalServerErrorException();
        }),
      ),
    );

    for (let country of countriesData) {
      let { regionDTO, ...data } = country;
      if (regionDTO) {
        const region = await this.regionRepository.findOne({
          where: { um49Code: regionDTO.um49Code },
        });
        data.region = region;
      }
      const entity = await this.countryRepository.findOneBy({
        code: country.code,
      });
      if (entity != null) {
        this.countryRepository.update(entity.code, { ...data });
      } else {
        const newCountry = this.countryRepository.create({
          ...data,
        });
        this.countryRepository.save(newCountry);
      }
    }
  }

  getCountries() {
    return this.countryRepository.find({
      order: { name: 'ASC' },
      relations: ['region'],
    });
  }

  async importPartners() {
    const partnersData = await firstValueFrom(
      this.httpService
        .get('https://api.clarisa.cgiar.org/api/institutions')
        .pipe(
          map((d: any) => d.data),
          catchError((error: AxiosError) => {
            throw new InternalServerErrorException();
          }),
        ),
    );

    partnersData.forEach(async (partner) => {
      let { added, institutionType, countryOfficeDTO, ...data } = partner;
      const entity = await this.partnerRepository.findOneBy({
        code: partner.code,
      });
      if (entity != null) {
        this.partnerRepository.update(entity.code, { ...data });
      } else {
        const newPartner = this.partnerRepository.create({
          ...data,
        });
        this.partnerRepository.save(newPartner);
      }
    });
  }
}
