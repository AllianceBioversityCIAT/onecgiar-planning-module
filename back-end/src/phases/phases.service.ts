import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Phase } from 'src/entities/phase.entity';
import { ILike, In, Repository } from 'typeorm';
import { PhaseInitiativeOrganization } from 'src/entities/phase-initiative-organization.entity';
import { Initiative } from 'src/entities/initiative.entity';
import { Organization } from 'src/entities/organization.entity';
import { InitiativeRoles } from 'src/entities/initiative-roles.entity';
import { Period } from 'src/entities/period.entity';
import { catchError, firstValueFrom, map } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';

@Injectable()
export class PhasesService {
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Phase) private phaseRepository: Repository<Phase>,
    @InjectRepository(PhaseInitiativeOrganization)
    private phaseInitOrgRepo: Repository<PhaseInitiativeOrganization>,
    @InjectRepository(Initiative)
    private initiativeRepository: Repository<Initiative>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(InitiativeRoles)
    private initiativeRolesRepository: Repository<InitiativeRoles>,
    @InjectRepository(Period)
    private periodRepository: Repository<Period>,
  ) {}

  create(createPhaseDto: any) {
    const { startDate, endDate, ...phaseData } = createPhaseDto;
    const newStartDate = this.fixDate(startDate);
    const newEndDate = this.fixDate(endDate);

    const newPhase = this.phaseRepository.create({
      startDate: newStartDate,
      endDate: newEndDate,
      ...phaseData,
    });
    return this.phaseRepository.save(newPhase);
  }

  findAll(query: any) {
    return this.phaseRepository.find({ 
      where: {
        name: query?.name ? ILike(`%${query?.name}%`) : null,
      },
      relations: ['previousPhase'] 
    });
  }

  findOne(id: number) {
    return this.phaseRepository.findOne({
      where: { id },
      relations: ['previousPhase'],
    });
  }

  findActivePhase() {
    return this.phaseRepository.findOne({
      where: { active: true },
      relations: ['previousPhase'],
    });
  }

  update(id: number, updatePhaseDto: any) {
    const { startDate, endDate, ...phaseData } = updatePhaseDto;
    const newStartDate = this.fixDate(startDate);
    const newEndDate = this.fixDate(endDate);

    return this.phaseRepository.update(
      { id },
      { startDate: newStartDate, endDate: newEndDate, ...phaseData },
    );
  }

  async remove(id: number) {
    const phase = await this.periodRepository.find({
      where: { 
        phase: {
          id: id
        }
      }
    });

    const acctivePhase = await this.phaseRepository.findOne({
      where: { 
        id: id
      }
    });
    if(phase.length) {
      throw new BadRequestException('This phase cannot be deleted as it’s used.');
    }else if(acctivePhase.active){
      throw new BadRequestException('This phase cannot be deleted as it’s active.');
    }
    return this.phaseRepository.delete({ id });
  }

  async activate(id: number) {
    let phase = await this.phaseRepository.findOne({
      where: {
        id: id
      },
      relations: ['periods']
    });

    if(phase.periods.length){
      await this.phaseRepository.update({}, { active: false });
      return await this.phaseRepository.update({ id }, { active: true });
    }
    else{
      throw new BadRequestException('You should add periods to the phase you need to activate');
    }
  }

  async deactivate(id: number) {
    return await this.phaseRepository.update({ id }, { active: false });
  }

  async assignOrganizations(data: any) {
    const { phase_id, initiative_id, ...organizations } = data;

    await this.phaseInitOrgRepo.delete({
      phase_id,
      initiative_id,
    });
    for (const organization_code of data.organizations) {
      const newPhaseInitOrg = await this.phaseInitOrgRepo.create({
        phase_id,
        initiative_id,
        organization_code,
      });
      await this.phaseInitOrgRepo.save(newPhaseInitOrg);
    }

    const initiativeRoles = await this.initiativeRolesRepository.find({
      where: { initiative_id },
      relations: ['organizations'],
    });

    initiativeRoles.forEach(async (initiativeRole) => {
      if (initiativeRole.organizations.length) {
        initiativeRole.organizations = initiativeRole.organizations.filter(
          (org: any) => data.organizations.includes(org.code),
        );
        await this.initiativeRolesRepository.save(initiativeRole);
      }
    });
    return true;
  }

  async fetchAssignedOrganizations(phase_id: number, initiative_id: number) {
    const data = await this.phaseInitOrgRepo.findBy({
      phase_id,
      initiative_id,
    });

    let organizationCodes = [];
    data.forEach((element) => {
      organizationCodes.push(element.organization_code);
    });

    return this.organizationRepository.findBy({ code: In(organizationCodes) });
  }

  async fetchPhaseInitiativesData(phase_id: number) {
    return this.initiativeRepository
      .createQueryBuilder('initiative')
      .leftJoin(
        PhaseInitiativeOrganization,
        'assigned_orgs',
        'assigned_orgs.initiative_id = initiative.id AND phase_id = ' +
          phase_id,
      )
      .leftJoin(
        Organization,
        'organizations',
        'organizations.code = assigned_orgs.organization_code',
      )
      .addSelect(
        'GROUP_CONCAT(organizations.name SEPARATOR ", ") AS assigned_organizations',
      )
      .groupBy('initiative.id')
      .getRawMany();
  }

  fixDate(date: any) {
    const newDate = new Date(date);
    return new Date(
      newDate.getFullYear(),
      newDate.getMonth(),
      newDate.getDate(),
      newDate.getHours(),
      newDate.getMinutes() - newDate.getTimezoneOffset(),
    ).toISOString();
  }

  async getTocPhases() {
    const tocPhases = await firstValueFrom(
      this.httpService
        .get(process.env.TOC_API + '/phases')
        .pipe(
          map((d: any) => d.data),
          catchError((error: AxiosError) => {
            throw new InternalServerErrorException();
          }),
        ),
    );
    return tocPhases
  }
}
