import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Like, Not, Repository } from 'typeorm';
import * as XLSX from 'xlsx-js-style';
import { join } from 'path';
import { createReadStream, unlink } from 'fs';
import * as archiver from 'archiver';
import { Response } from 'express';
import { PorbAow } from 'src/entities/porb-aow.entity';
import { PorbHlo } from 'src/entities/porb-hlo.entity';
import { PorbPartner } from 'src/entities/porb-partner.entity';
import { PorbBilateral } from 'src/entities/porb-bilateral.entity';
import { PorbMelia } from 'src/entities/porb-melia.entity';
import { PorbContractedPartner } from 'src/entities/porb-contracted-partner.entity';
import { ClarisaCountry } from 'src/entities/clarisa-country.entity';
import { PorbAnaplan } from 'src/entities/porb-anaplan.entity';
import { Anaplan } from 'src/entities/anaplan.entity';
import { AnaplanValues } from 'src/entities/anaplan-values.entity';
import { WorkPackage } from 'src/entities/workPackage.entity';
import { CrossCutting } from 'src/entities/cross-cutting.entity';
import { PorbCross } from 'src/entities/porb-cross.entity';
import { PorbCountryPercentage } from 'src/entities/porb-country-percentage.entity';
import { CenterStatus } from 'src/entities/center-status.entity';
import { Organization } from 'src/entities/organization.entity';
import { Submission, SubmissionStatus } from 'src/entities/submission.entity';
import { User, userRole } from 'src/entities/user.entity';
import { History } from 'src/entities/history.entity';
import { Initiative } from 'src/entities/initiative.entity';
import { Result } from 'src/entities/result.entity';
import { BudgetAssumptions } from 'src/entities/budget-assumptions.entity';
import { PartnerCountry } from 'src/entities/Partner-country.entity';
import { StanderdCrossCutting } from 'src/entities/standerd-cross-cutting.entity';
import { Partner } from 'src/entities/partner.entity';
import { Constants } from 'src/entities/constants.entity';
import { PorbSynergy } from 'src/entities/porb-synergy.entity';
import { PorbOutcome } from 'src/entities/porb-outcome.entity';
import { PorbLocationBenefit } from 'src/entities/porb-location-benefit.entity';
import { Region } from 'src/entities/region.entity';
import { catchError, firstValueFrom, map } from 'rxjs';
import { AxiosError } from 'axios';
import { InitiativesService } from 'src/initiatives/initiatives.service';
import { PhasesService } from 'src/phases/phases.service';
import { HttpService } from '@nestjs/axios';
import { SubmissionService } from 'src/submission/submission.service';
import { EmailService } from 'src/email/email.service';
import { INITIATIVE_ROLES, LEAD_ROLES, isLeadRole } from '../shared/roles';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';
import { EventsGateway } from 'src/events/events.gateway';

@Injectable()
export class PorbService {
  constructor(
    @InjectRepository(PorbAow)
    private readonly porbAowRepository: Repository<PorbAow>,
    @InjectRepository(PorbHlo)
    private readonly porbHloRepository: Repository<PorbHlo>,
    @InjectRepository(PorbPartner)
    private readonly porbPartnerRepository: Repository<PorbPartner>,
    @InjectRepository(PorbContractedPartner)
    private readonly porbContractedPartnerRepository: Repository<PorbContractedPartner>,
    @InjectRepository(ClarisaCountry)
    private readonly clarisaCountryRepository: Repository<ClarisaCountry>,
    @InjectRepository(PorbBilateral)
    private readonly porbBilateralRepository: Repository<PorbBilateral>,
    @InjectRepository(PorbMelia)
    private readonly porbMeliaRepository: Repository<PorbMelia>,
    @InjectRepository(PorbAnaplan)
    private readonly porbAnaplanRepository: Repository<PorbAnaplan>,
    @InjectRepository(Anaplan)
    private readonly anaplanRepository: Repository<Anaplan>,
    @InjectRepository(AnaplanValues)
    private readonly anaplanValuesRepository: Repository<AnaplanValues>,
    @InjectRepository(WorkPackage)
    private readonly workPackageRepository: Repository<WorkPackage>,
    @InjectRepository(CrossCutting)
    private readonly crossCuttingRepository: Repository<CrossCutting>,
    @InjectRepository(PorbCross)
    private readonly porbCrossRepository: Repository<PorbCross>,
    @InjectRepository(PorbCountryPercentage)
    private readonly porbCountryPercentageRepository: Repository<PorbCountryPercentage>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(History)
    private readonly historyRepository: Repository<History>,
    @InjectRepository(Initiative)
    private readonly initiativeRepository: Repository<Initiative>,
    @InjectRepository(CenterStatus)
    private readonly centerStatusRepo: Repository<CenterStatus>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(Result)
    private readonly resultRepository: Repository<Result>,
    @InjectRepository(BudgetAssumptions)
    private readonly budgetAssumptionsRepository: Repository<BudgetAssumptions>,
    @InjectRepository(PartnerCountry)
    private readonly partnerCountryRepository: Repository<PartnerCountry>,
    @InjectRepository(StanderdCrossCutting)
    private readonly standerdCrossCuttingRepository: Repository<StanderdCrossCutting>,
    @InjectRepository(Partner)
    private readonly partnerRepository: Repository<Partner>,
    @InjectRepository(Constants)
    private readonly constantsRepository: Repository<Constants>,
    @InjectRepository(PorbSynergy)
    private porbSynergyRepository: Repository<PorbSynergy>,
    @InjectRepository(PorbOutcome)
    private porbOutcomeRepository: Repository<PorbOutcome>,
    @InjectRepository(PorbLocationBenefit)
    private readonly porbLocationBenefitRepository: Repository<PorbLocationBenefit>,
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
    private readonly initService: InitiativesService,
    private readonly phasesService: PhasesService,
    private readonly httpService: HttpService,
    private readonly submissionService: SubmissionService,
    private readonly emailService: EmailService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  private readonly cronLogger = new Logger('TocCronJob');
  private tocCronRunning = false;
  private static readonly TOC_AUTO_SYNC_LABEL = 'toc_auto_sync';

  async isTocAutoSyncEnabled(): Promise<boolean> {
    const row = await this.constantsRepository.findOne({
      where: { label: PorbService.TOC_AUTO_SYNC_LABEL },
    });
    // Default to true if no row exists yet
    return !row || row.value === 'true';
  }

  async setTocAutoSync(enabled: boolean): Promise<{ enabled: boolean }> {
    let row = await this.constantsRepository.findOne({
      where: { label: PorbService.TOC_AUTO_SYNC_LABEL },
    });
    if (row) {
      row.value = String(enabled);
      await this.constantsRepository.save(row);
    } else {
      row = this.constantsRepository.create({
        label: PorbService.TOC_AUTO_SYNC_LABEL,
        value: String(enabled),
      });
      await this.constantsRepository.save(row);
    }
    this.cronLogger.log(`TOC auto-sync ${enabled ? 'enabled' : 'disabled'}`);
    return { enabled };
  }

  @Cron('*/10 * * * * *')
  async checkTocUpdates() {
    if (this.tocCronRunning) return;
    const autoSyncEnabled = await this.isTocAutoSyncEnabled();
    if (!autoSyncEnabled) return;
    this.tocCronRunning = true;

    try {
      const tocUpdates = await firstValueFrom(
        this.httpService
          .get(`${process.env.TOC_API}/toc/last-updates`)
          .pipe(map((res) => res.data)),
      );

      if (!Array.isArray(tocUpdates)) return;

      const initiatives = await this.initiativeRepository.find({
        where: { archived: false },
      });

      // Map official_code (action_area_id) to initiative
      const initByCode = new Map<string, Initiative>();
      for (const init of initiatives) {
        const code = init.action_area_id || init.official_code;
        if (code) initByCode.set(code, init);
      }

      for (const tocEntry of tocUpdates) {
        const tocCounter = Number(tocEntry.last_update) || 0;
        if (tocCounter === 0) continue;

        // Match by title or id against our initiatives
        const init = this.matchTocToInitiative(tocEntry, initByCode, initiatives);
        if (!init) continue;

        const ourCounter = Number(init.toc_last_update) || 0;
        if (tocCounter <= ourCounter) continue;

        this.cronLogger.log(
          `TOC update detected for ${init.official_code} (${init.name}): ${ourCounter} → ${tocCounter}. Harvesting...`,
        );

        try {
          this.eventsGateway.server.emit('tocHarvestStarted', {
            program_id: init.id,
            official_code: init.official_code,
          });
          await this.importTocToPorbTables(init.id, init.official_code);
          await this.initiativeRepository.update(init.id, {
            toc_last_update: tocCounter,
          });
          this.eventsGateway.server.emit('tocHarvestCompleted', {
            program_id: init.id,
            official_code: init.official_code,
          });
          this.cronLogger.log(
            `Harvest complete for ${init.official_code}. Counter updated to ${tocCounter}.`,
          );
        } catch (err) {
          this.eventsGateway.server.emit('tocHarvestCompleted', {
            program_id: init.id,
            official_code: init.official_code,
            error: true,
          });
          this.cronLogger.error(
            `Harvest failed for ${init.official_code}: ${err?.message || err}`,
          );
        }
      }
    } catch (err) {
      this.cronLogger.error(
        `TOC last-updates check failed: ${err?.message || err}`,
      );
    } finally {
      this.tocCronRunning = false;
    }
  }

  private matchTocToInitiative(
    tocEntry: { id: string; title: string },
    initByCode: Map<string, Initiative>,
    initiatives: Initiative[],
  ): Initiative | null {
    // Try matching by action_area_id or official_code against TOC id
    for (const [, init] of initByCode) {
      if (init.action_area_id === tocEntry.id) return init;
    }
    // Fallback: match by name
    return initiatives.find(
      (i) => i.name?.toLowerCase().trim() === tocEntry.title?.toLowerCase().trim(),
    ) || null;
  }

  async getTocLastUpdates() {
    const tocUpdates = await firstValueFrom(
      this.httpService
        .get(`${process.env.TOC_API}/toc/last-updates`)
        .pipe(map((res) => res.data)),
    );

    const initiatives = await this.initiativeRepository.find({
      where: { archived: false },
      select: ['id', 'name', 'official_code', 'action_area_id', 'toc_last_update'],
    });

    return {
      tocUpdates,
      initiatives: initiatives.map((i) => ({
        id: i.id,
        name: i.name,
        official_code: i.official_code,
        action_area_id: i.action_area_id,
        our_counter: i.toc_last_update || 0,
      })),
    };
  }

  async getAows(program_id: number) {
    return this.porbAowRepository
      .createQueryBuilder('aow')
      .where('aow.program_id = :program_id', { program_id })
      .andWhere('(aow.toc_is_deleted = :isDeleted OR aow.toc_is_deleted IS NULL)', {
        isDeleted: false,
      })
      .orderBy('aow.aow_acrnum', 'ASC')
      .addOrderBy('aow.aow_name', 'ASC')
      .getMany();
  }

  getHlos(program_id: number, porb_aow_id?: number, center_id?: number) {
    const where: any = { program_id };
    if (porb_aow_id != null) where.porb_aow_id = porb_aow_id;
    if (center_id != null) where.center_id = center_id;

    return this.porbHloRepository.find({
      where,
      order: { id: 'ASC' },
    });
  }

  async getPartners(program_id: number, porb_aow_id?: number, center_id?: number) {
    const where: any = { program_id };
    if (porb_aow_id != null) where.porb_aow_id = porb_aow_id;

    const partners = await this.porbPartnerRepository.find({
      where,
      order: { id: 'ASC' },
    });

    if (!partners.length) {
      return partners;
    }

    const partnerIds = partners.map((p) => p.id);
    const contractedWhere: any = {
      program_id,
      porb_partner_id: In(partnerIds),
    };
    if (center_id != null) {
      contractedWhere.center_id = center_id;
    }
    const contractedRows = await this.porbContractedPartnerRepository.find({
      where: contractedWhere,
      order: { id: 'DESC' },
    });
    // Build a map of (porb_partner_id -> representative contracted row) for the
    // response shape, which is one entry per partner. When center_id is not
    // provided, multiple centers' rows collide on this key — pick the highest
    // budget as the representative. This is purely in-memory; do NOT delete
    // the losing rows, as they are legitimate per-center records. Use the
    // admin endpoint POST /porb/dedup-contracted-partners to clean up true
    // (partner_id, center_id) duplicates.
    const contractedMap = new Map<number, PorbContractedPartner>();
    for (const row of contractedRows) {
      const existing = contractedMap.get(row.porb_partner_id);
      if (!existing) {
        contractedMap.set(row.porb_partner_id, row);
        continue;
      }
      const existingBudget = Number(existing.budget) || 0;
      const rowBudget = Number(row.budget) || 0;
      if (rowBudget > existingBudget) {
        contractedMap.set(row.porb_partner_id, row);
      }
    }

    const countryCodes = [
      ...new Set(
        contractedRows.flatMap((row) => this.parseCountryCodes(row.countries)),
      ),
    ];
    const countries = countryCodes.length
      ? await this.clarisaCountryRepository.find({ where: { code: In(countryCodes) } })
      : [];
    const countryMap = new Map<number, ClarisaCountry>();
    countries.forEach((country) => countryMap.set(Number(country.code), country));

    return partners.map((partner) => {
      const contracted = contractedMap.get(partner.id);
      const selectedCountryCodes = contracted ? this.parseCountryCodes(contracted.countries) : [];
      const countryNames = selectedCountryCodes
        .map((code) => countryMap.get(code)?.name)
        .filter(Boolean);
      return {
        ...partner,
        partner_is_contracted: contracted ? '1' : '0',
        partner_geo: countryNames.length ? countryNames.join(', '):null,
        partner_country_codes: selectedCountryCodes,
        partner_budget: contracted?.budget ?? null,
        partner_assumption: contracted?.assumption ?? '',
      };
    });
  }

  async createUnknownPartner(data: {
    program_id: number;
    porb_aow_id: number;
    center_id: number;
  }, reqUser?: { id: number }, emitterSocketId?: string) {
    await this.assertNotLocked(data.program_id);
    const existingCount = await this.porbPartnerRepository.count({
      where: {
        program_id: data.program_id,
        porb_aow_id: data.porb_aow_id,
        is_unknown: true,
      },
    });

    const name = `Unknown Partner ${existingCount + 1}`;

    const { randomUUID } = await import('crypto');
    const partner = await this.porbPartnerRepository.save({
      program_id: data.program_id,
      porb_aow_id: data.porb_aow_id,
      toc_id: randomUUID(),
      partner_name: name,
      partner_outputs: '',
      toc_is_deleted: false,
      is_unknown: true,
    });

    await this.logHistory({
      initiative_id: data.program_id,
      user_id: reqUser?.id,
      item_name: name,
      resource_property: 'Add Unknown Partner',
      organization_id: data.center_id,
    });

    this.emitPorbBudgetChanged({
      program_id: data.program_id,
      center_id: data.center_id,
      aow_id: data.porb_aow_id,
      section: 'partner',
      type: 'add',
      emitter_socket_id: emitterSocketId,
    });

    return {
      ...partner,
      partner_is_contracted: '0',
      partner_geo: null,
      partner_country_codes: [],
      partner_budget: null,
      partner_assumption: '',
    };
  }

  async searchClarisaPartners(query: string) {
    return this.partnerRepository.find({
      where: { name: Like(`%${query}%`) },
      take: 20,
      select: ['code', 'name', 'acronym'],
    });
  }

  async resolveUnknownPartner(id: number, clarisa_partner_code: number, reqUser?: { id: number }, emitterSocketId?: string) {
    const partner = await this.porbPartnerRepository.findOne({ where: { id } });
    if (!partner) throw new NotFoundException('Partner not found');
    await this.assertNotLocked(partner.program_id);
    if (!partner.is_unknown)
      throw new BadRequestException('Partner is not unknown');

    const clarisaPartner = await this.partnerRepository.findOne({
      where: { code: clarisa_partner_code },
    });
    if (!clarisaPartner)
      throw new NotFoundException('CLARISA partner not found');

    const oldName = partner.partner_name;
    partner.partner_name = clarisaPartner.name;
    partner.is_unknown = false;
    await this.porbPartnerRepository.save(partner);

    await this.logHistory({
      initiative_id: partner.program_id,
      user_id: reqUser?.id,
      item_name: clarisaPartner.name,
      resource_property: 'Resolve Unknown Partner',
      old_value: oldName,
      new_value: clarisaPartner.name,
    });

    this.emitPorbBudgetChanged({
      program_id: partner.program_id,
      aow_id: partner.porb_aow_id,
      section: 'partner',
      type: 'update',
      emitter_socket_id: emitterSocketId,
    });

    return partner;
  }

  async deleteUnknownPartner(id: number, reqUser?: { id: number }, emitterSocketId?: string) {
    const partner = await this.porbPartnerRepository.findOne({ where: { id } });
    if (!partner) throw new NotFoundException('Partner not found');
    await this.assertNotLocked(partner.program_id);
    if (!partner.is_unknown && !partner.toc_is_deleted)
      throw new BadRequestException('Can only delete unknown or TOC-deleted partners');

    const { program_id, porb_aow_id, partner_name } = partner;

    if (partner.toc_is_deleted) {
      await this.porbContractedPartnerRepository.delete({ porb_partner_id: id });
    }
    await this.porbPartnerRepository.remove(partner);

    await this.logHistory({
      initiative_id: program_id,
      user_id: reqUser?.id,
      item_name: partner_name,
      resource_property: 'Delete Partner',
    });

    this.emitPorbBudgetChanged({
      program_id,
      aow_id: porb_aow_id,
      section: 'partner',
      type: 'delete',
      emitter_socket_id: emitterSocketId,
    });

    return { deleted: true };
  }

  async deleteTocDeletedHlo(id: number, reqUser?: { id: number }, emitterSocketId?: string) {
    const row = await this.porbHloRepository.findOneBy({ id });
    if (!row) throw new NotFoundException('HLO not found');
    await this.assertNotLocked(row.program_id);
    if (!row.toc_is_deleted)
      throw new BadRequestException('Can only delete items removed from TOC');

    const { program_id, center_id, porb_aow_id, hlo_name } = row;
    await this.porbHloRepository.remove(row);

    await this.logHistory({
      initiative_id: program_id,
      user_id: reqUser?.id,
      item_name: hlo_name,
      resource_property: 'Delete TOC-Deleted HLO',
      organization_id: center_id,
    });

    this.emitPorbBudgetChanged({
      program_id,
      center_id,
      aow_id: porb_aow_id,
      section: 'hlo',
      type: 'delete',
      emitter_socket_id: emitterSocketId,
    });

    return { deleted: true };
  }

  async deleteTocDeletedMelia(id: number, reqUser?: { id: number }, emitterSocketId?: string) {
    const row = await this.porbMeliaRepository.findOneBy({ id });
    if (!row) throw new NotFoundException('MELIA not found');
    await this.assertNotLocked(row.program_id);
    if (!row.toc_is_deleted)
      throw new BadRequestException('Can only delete items removed from TOC');

    const { program_id, center_id, porb_aow_id, melia_name } = row;
    await this.porbMeliaRepository.remove(row);

    await this.logHistory({
      initiative_id: program_id,
      user_id: reqUser?.id,
      item_name: melia_name,
      resource_property: 'Delete TOC-Deleted MELIA',
      organization_id: center_id,
    });

    this.emitPorbBudgetChanged({
      program_id,
      center_id,
      aow_id: porb_aow_id,
      section: 'melia',
      type: 'delete',
      emitter_socket_id: emitterSocketId,
    });

    return { deleted: true };
  }

  async deleteTocDeletedBilateral(id: number, reqUser?: { id: number }, emitterSocketId?: string) {
    const row = await this.porbBilateralRepository.findOneBy({ id });
    if (!row) throw new NotFoundException('Bilateral not found');
    await this.assertNotLocked(row.program_id);
    if (!row.toc_is_deleted)
      throw new BadRequestException('Can only delete items removed from TOC');

    const { program_id, center_id, bilateral_name } = row;
    await this.porbBilateralRepository.remove(row);

    await this.logHistory({
      initiative_id: program_id,
      user_id: reqUser?.id,
      item_name: bilateral_name,
      resource_property: 'Delete TOC-Deleted Bilateral',
      organization_id: center_id,
    });

    this.emitPorbBudgetChanged({
      program_id,
      center_id,
      aow_id: null,
      section: 'bilateral',
      type: 'delete',
      emitter_socket_id: emitterSocketId,
    });

    return { deleted: true };
  }

  async getBilaterals(program_id: number, _porb_aow_id?: number, center_id?: number, excludeZero = false) {
    const where: any = { program_id };
    // W3/Bilateral is now center-level — porb_aow_id is ignored
    if (center_id != null) where.center_id = center_id;

    const allRows = await this.porbBilateralRepository.find({
      where,
      relations: ['center'],
      order: { bilateral_name: 'ASC', id: 'ASC' },
    });

    // Dedup by (toc_id, center_id) — keep the row with budget, sum if both have budget
    const dedupMap = new Map<string, PorbBilateral>();
    const duplicateIds: number[] = [];
    for (const row of allRows) {
      const key = `${row.toc_id}::${row.center_id}`;
      if (dedupMap.has(key)) {
        const existing = dedupMap.get(key);
        existing.bilateral_budget = (Number(existing.bilateral_budget) || 0) + (Number(row.bilateral_budget) || 0);
        if (!existing.bilateral_assumption && row.bilateral_assumption) {
          existing.bilateral_assumption = row.bilateral_assumption;
        }
        if (!existing.bilateral_outputs && row.bilateral_outputs) {
          existing.bilateral_outputs = row.bilateral_outputs;
        }
        duplicateIds.push(row.id);
      } else {
        dedupMap.set(key, row);
      }
    }

    // Clean up duplicates in the background
    if (duplicateIds.length) {
      const kept = [...dedupMap.values()];
      Promise.all([
        ...kept.map(r => this.porbBilateralRepository.update(r.id, {
          bilateral_budget: r.bilateral_budget,
          bilateral_assumption: r.bilateral_assumption,
          bilateral_outputs: r.bilateral_outputs,
        })),
        this.porbBilateralRepository.delete(duplicateIds),
      ]).catch(err => console.error('Bilateral dedup cleanup failed:', err));
    }

    let rows = [...dedupMap.values()];
    if (excludeZero) {
      rows = rows.filter(r => Number(r.bilateral_budget) !== 0);
    }

    return rows.map(row => ({
      ...row,
      center_name: (row as any).center?.name || '',
    }));
  }

  getMelia(program_id: number, porb_aow_id?: number, center_id?: number) {
    const where: any = { program_id };
    if (porb_aow_id != null) where.porb_aow_id = porb_aow_id;
    if (center_id != null) where.center_id = center_id;

    return this.porbMeliaRepository.find({
      where,
      order: { id: 'ASC' },
    });
  }

  async getConsolidation(program_id: number, porb_aow_id?: number, center_id?: number) {
    if (porb_aow_id == null || center_id == null) {
      return {
        indicators: [],
        summary: {
          poolHlo: 0,
          crossCutting: 0,
          partners: 0,
          melia: 0,
          pooledTotal: 0,
          consolidatedTotal: 0,
          anaplan: 0,
        },
      };
    }

    const [hlos, partners, contractedPartners, meliaRows, anaplanRows, crossRows] = await Promise.all([
      this.porbHloRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
      this.porbPartnerRepository.find({
        where: { program_id, porb_aow_id },
      }),
      this.porbContractedPartnerRepository.find({
        where: { program_id, center_id },
      }),
      this.porbMeliaRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
      this.porbAnaplanRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
      this.porbCrossRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
    ]);

    const partnerIds = new Set(partners.map((row) => row.id));
    // Deduplicate contracted rows: keep one per porb_partner_id
    const seenPartnerIds = new Set<number>();
    const relevantContracted = contractedPartners
      .filter((row) => partnerIds.has(row.porb_partner_id))
      .filter((row) => {
        if (seenPartnerIds.has(row.porb_partner_id)) return false;
        seenPartnerIds.add(row.porb_partner_id);
        return true;
      });

    const indicatorsSummary = {
      innovationTarget: 0,
      innovationBudget: 0,
      knowledgeTarget: 0,
      knowledgeBudget: 0,
      capacityTarget: 0,
      capacityBudget: 0,
      othersTarget: 0,
      othersBudget: 0,
    };

    hlos.forEach((row) => {
      const type = String(row?.hlo_type || '').toLowerCase();
      const target = Number(row?.hlo_target) || 0;
      const budget = Number(row?.hlo_budget) || 0;
      if (type.includes('innovation')) {
        indicatorsSummary.innovationTarget += target;
        indicatorsSummary.innovationBudget += budget;
        return;
      }
      if (type.includes('knowledge')) {
        indicatorsSummary.knowledgeTarget += target;
        indicatorsSummary.knowledgeBudget += budget;
        return;
      }
      if (type.includes('capacity')) {
        indicatorsSummary.capacityTarget += target;
        indicatorsSummary.capacityBudget += budget;
        return;
      }
      indicatorsSummary.othersTarget += target;
      indicatorsSummary.othersBudget += budget;
    });

    const poolHlo = hlos.reduce((sum, row) => sum + (Number(row?.hlo_budget) || 0), 0);
    const partnersTotal = relevantContracted.reduce(
      (sum, row) => sum + (Number(row?.budget) || 0),
      0,
    );
    const melia = meliaRows.reduce((sum, row) => sum + (Number(row?.melia_budget) || 0), 0);
    const anaplan = anaplanRows.reduce((sum, row) => sum + (Number(row?.budget) || 0), 0);
    const crossCutting = crossRows.reduce((sum, row) => sum + (Number(row?.budget) || 0), 0);
    const pooledTotal = poolHlo + crossCutting;
    const consolidatedTotal = pooledTotal;

    // Count country percentage rows: HLO-derived + manual (non-overlapping)
    const hloCountrySet = new Set<string>();
    for (const hlo of hlos) {
      if (!hlo.hlo_geo) continue;
      for (const c of hlo.hlo_geo.split(', ')) {
        const trimmed = c.trim();
        if (trimmed) hloCountrySet.add(trimmed);
      }
    }
    const manualCountryCount = await this.porbCountryPercentageRepository
      .createQueryBuilder('cp')
      .where('cp.program_id = :program_id', { program_id })
      .andWhere('cp.porb_aow_id = :porb_aow_id', { porb_aow_id })
      .andWhere('cp.center_id = :center_id', { center_id })
      .andWhere('cp.is_manual = :isManual', { isManual: true })
      .andWhere('cp.country_name NOT IN (:...hloCountries)', {
        hloCountries: hloCountrySet.size > 0 ? Array.from(hloCountrySet) : [''],
      })
      .getCount();
    const countryPercentageCount = hloCountrySet.size + manualCountryCount;

    // Count location benefit rows: outcome-derived + manual (non-overlapping)
    const outcomes = await this.porbOutcomeRepository.find({
      where: { program_id, porb_aow_id, toc_is_deleted: false },
    });
    const outcomeLocationSet = new Set<string>();
    for (const o of outcomes) {
      if (!o.outcome_geo) continue;
      const parsed = this.parseOutcomeGeo(o.outcome_geo);
      for (const loc of parsed) {
        outcomeLocationSet.add(`${loc.type}::${loc.name}`);
      }
    }
    const manualLocationCount = await this.porbLocationBenefitRepository
      .createQueryBuilder('lb')
      .where('lb.program_id = :program_id', { program_id })
      .andWhere('lb.porb_aow_id = :porb_aow_id', { porb_aow_id })
      .andWhere('lb.center_id = :center_id', { center_id })
      .andWhere('lb.is_manual = :isManual', { isManual: true })
      .getCount();
    const locationBenefitCount = outcomeLocationSet.size + manualLocationCount;

    return {
      indicators: [
        {
          title: 'Innovation Development',
          target: indicatorsSummary.innovationTarget,
          budget: indicatorsSummary.innovationBudget,
        },
        {
          title: 'Knowledge Product',
          target: indicatorsSummary.knowledgeTarget,
          budget: indicatorsSummary.knowledgeBudget,
        },
        {
          title: 'Capacity Sharing',
          target: indicatorsSummary.capacityTarget,
          budget: indicatorsSummary.capacityBudget,
        },
        {
          title: 'Others Outputs',
          target: indicatorsSummary.othersTarget,
          budget: indicatorsSummary.othersBudget,
        },
      ],
      summary: {
        poolHlo,
        crossCutting,
        partners: partnersTotal,
        melia,
        pooledTotal,
        consolidatedTotal,
        anaplan,
      },
      rowCounts: {
        hlo: hlos.length,
        partners: partners.length,
        melia: meliaRows.length,
        anaplan: anaplanRows.length,
        cross: crossRows.length,
        countryPercentage: countryPercentageCount,
        locationBenefit: locationBenefitCount,
      },
    };
  }

  async getSummaryConsolidation(program_id: number, center_id?: number) {
    const aows = await this.porbAowRepository
      .createQueryBuilder('aow')
      .where('aow.program_id = :program_id', { program_id })
      .andWhere('(aow.toc_is_deleted = :isDeleted OR aow.toc_is_deleted IS NULL)', {
        isDeleted: false,
      })
      .orderBy('aow.aow_acrnum', 'ASC')
      .addOrderBy('aow.aow_name', 'ASC')
      .getMany();

    if (!aows.length) {
      return { rows: [], totals: {} };
    }

    const aowIds = aows.map((a) => a.id);

    // Bulk-load all data for this program, optionally filtered by center
    const hloWhere: any = { program_id, porb_aow_id: In(aowIds) };
    const partnerWhere: any = { program_id, porb_aow_id: In(aowIds) };
    const meliaWhere: any = { program_id, porb_aow_id: In(aowIds) };
    const anaplanWhere: any = { program_id, porb_aow_id: In(aowIds) };
    const crossWhere: any = { program_id, porb_aow_id: In(aowIds) };
    const contractedWhere: any = { program_id, porb_aow_id: In(aowIds) };

    if (center_id != null) {
      hloWhere.center_id = center_id;
      meliaWhere.center_id = center_id;
      anaplanWhere.center_id = center_id;
      crossWhere.center_id = center_id;
      contractedWhere.center_id = center_id;
      // porb_partner has no center_id — filtering is done via contracted partners
    }

    const [allHlos, allPartners, allMelia, allAnaplan, allCross, allContractedPartners] = await Promise.all([
      this.porbHloRepository.find({ where: hloWhere }),
      this.porbPartnerRepository.find({ where: partnerWhere }),
      this.porbMeliaRepository.find({ where: meliaWhere }),
      this.porbAnaplanRepository.find({ where: anaplanWhere }),
      this.porbCrossRepository.find({ where: crossWhere }),
      this.porbContractedPartnerRepository.find({ where: contractedWhere }),
    ]);

    // Group HLOs by porb_aow_id
    const hlosByAow = new Map<number, typeof allHlos>();
    for (const row of allHlos) {
      const list = hlosByAow.get(row.porb_aow_id) || [];
      list.push(row);
      hlosByAow.set(row.porb_aow_id, list);
    }

    // Group partners by porb_aow_id
    const partnersByAow = new Map<number, typeof allPartners>();
    for (const row of allPartners) {
      const list = partnersByAow.get(row.porb_aow_id) || [];
      list.push(row);
      partnersByAow.set(row.porb_aow_id, list);
    }

    // Group melia by porb_aow_id
    const meliaByAow = new Map<number, typeof allMelia>();
    for (const row of allMelia) {
      const list = meliaByAow.get(row.porb_aow_id) || [];
      list.push(row);
      meliaByAow.set(row.porb_aow_id, list);
    }

    // Group anaplan by porb_aow_id
    const anaplanByAow = new Map<number, typeof allAnaplan>();
    for (const row of allAnaplan) {
      const list = anaplanByAow.get(row.porb_aow_id) || [];
      list.push(row);
      anaplanByAow.set(row.porb_aow_id, list);
    }

    // Group cross-cutting by porb_aow_id
    const crossByAow = new Map<number, typeof allCross>();
    for (const row of allCross) {
      const list = crossByAow.get(row.porb_aow_id) || [];
      list.push(row);
      crossByAow.set(row.porb_aow_id, list);
    }

    // Group contracted partners by porb_aow_id
    const contractedByAow = new Map<number, typeof allContractedPartners>();
    for (const row of allContractedPartners) {
      const list = contractedByAow.get(row.porb_aow_id) || [];
      list.push(row);
      contractedByAow.set(row.porb_aow_id, list);
    }

    const totals = {
      innovationTarget: 0, innovationBudget: 0,
      knowledgeTarget: 0, knowledgeBudget: 0,
      capacityTarget: 0, capacityBudget: 0,
      othersTarget: 0, othersBudget: 0,
      partnerBudget: 0, meliaBudget: 0, crossBudget: 0,
      totalPooledFunding: 0,
      anaplanBudget: 0, consolidatedTotal: 0,
    };

    const rows = aows.map((aow) => {
      const hlos = hlosByAow.get(aow.id) || [];
      const partners = partnersByAow.get(aow.id) || [];
      const meliaRows = meliaByAow.get(aow.id) || [];

      // Classify HLOs by type
      const ind = {
        innovationTarget: 0, innovationBudget: 0,
        knowledgeTarget: 0, knowledgeBudget: 0,
        capacityTarget: 0, capacityBudget: 0,
        othersTarget: 0, othersBudget: 0,
      };
      for (const row of hlos) {
        const type = String(row?.hlo_type || '').toLowerCase();
        const target = Number(row?.hlo_target) || 0;
        const budget = Number(row?.hlo_budget) || 0;
        if (type.includes('innovation')) {
          ind.innovationTarget += target;
          ind.innovationBudget += budget;
        } else if (type.includes('knowledge')) {
          ind.knowledgeTarget += target;
          ind.knowledgeBudget += budget;
        } else if (type.includes('capacity')) {
          ind.capacityTarget += target;
          ind.capacityBudget += budget;
        } else {
          ind.othersTarget += target;
          ind.othersBudget += budget;
        }
      }

      // Partner budget: sum from contracted partners
      const contractedRows = contractedByAow.get(aow.id) || [];
      const partnerBudget = contractedRows.reduce((sum, cp) => sum + (Number(cp?.budget) || 0), 0);

      const meliaBudget = meliaRows.reduce((sum, r) => sum + (Number(r?.melia_budget) || 0), 0);
      const anaplanRows = anaplanByAow.get(aow.id) || [];
      const anaplanBudget = anaplanRows.reduce((sum, r) => sum + (Number(r?.budget) || 0), 0);
      const crossRows = crossByAow.get(aow.id) || [];
      const crossBudget = crossRows.reduce((sum, r) => sum + (Number(r?.budget) || 0), 0);
      const totalPooledFunding =
        ind.innovationBudget + ind.knowledgeBudget + ind.capacityBudget +
        ind.othersBudget + crossBudget;
      const consolidatedTotal = totalPooledFunding;

      // Accumulate totals
      totals.innovationTarget += ind.innovationTarget;
      totals.innovationBudget += ind.innovationBudget;
      totals.knowledgeTarget += ind.knowledgeTarget;
      totals.knowledgeBudget += ind.knowledgeBudget;
      totals.capacityTarget += ind.capacityTarget;
      totals.capacityBudget += ind.capacityBudget;
      totals.othersTarget += ind.othersTarget;
      totals.othersBudget += ind.othersBudget;
      totals.partnerBudget += partnerBudget;
      totals.meliaBudget += meliaBudget;
      totals.crossBudget += crossBudget;
      totals.totalPooledFunding += totalPooledFunding;
      totals.anaplanBudget += anaplanBudget;
      totals.consolidatedTotal += consolidatedTotal;

      return {
        aowId: aow.id,
        aowCode: aow.aow_acrnum || '',
        aowName: aow.aow_name || '',
        ...ind,
        partnerBudget,
        meliaBudget,
        crossBudget,
        totalPooledFunding,
        anaplanBudget,
        consolidatedTotal,
      };
    });

    return { rows, totals };
  }

  async getValidation(program_id: number, porb_aow_id?: number, center_id?: number) {
    const sectionNames = [
      'Pool funding HLO',
      'Partners',
      'MELIA Study',
      'Anaplan',
      'Cross Cutting',
      'Countries of Implementation',
      'Location of Benefit',
    ];
    const emptyResult: Record<string, { hasError: boolean; message: string; partnerMismatch?: boolean; pooledMismatch?: boolean }> = {};
    sectionNames.forEach((name) => {
      emptyResult[name] = { hasError: false, message: '' };
    });

    if (porb_aow_id == null || center_id == null) {
      return emptyResult;
    }

    const [
      hlos,
      partners,
      contractedRows,
      meliaRows,
      crossRows,
      selectedAow,
      countryPctRows,
      locationBenefitRows,
      outcomesForAow,
    ] = await Promise.all([
      this.porbHloRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
      this.porbPartnerRepository.find({
        where: { program_id, porb_aow_id },
      }),
      this.porbContractedPartnerRepository.find({
        where: { program_id, center_id },
      }),
      this.porbMeliaRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
      this.porbCrossRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
      this.porbAowRepository.findOne({ where: { id: porb_aow_id } }),
      this.porbCountryPercentageRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
      this.porbLocationBenefitRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
      this.porbOutcomeRepository.find({
        where: { program_id, porb_aow_id, toc_is_deleted: false },
      }),
    ]);

    const hasAssumption = (value: any) => String(value ?? '').trim().length > 0;
    const parseBudget = (value: any): number => {
      const normalized = String(value ?? '').replace(/,/g, '').trim();
      if (!normalized) return 0;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const poolMissing = hlos.filter(
      (row) => parseBudget(row?.hlo_budget) > 0 && !hasAssumption(row?.hlo_assumption),
    ).length;
    // Rule 14: TOC-deleted rows with non-zero budget
    const poolDeletedWithBudget = hlos.filter(
      (row) => row?.toc_is_deleted && parseBudget(row?.hlo_budget) > 0,
    ).length;
    const poolMessages: string[] = [];
    if (poolMissing > 0) {
      poolMessages.push(`${poolMissing} row(s) have budget but missing assumption.`);
    }
    if (poolDeletedWithBudget > 0) {
      poolMessages.push(
        `${poolDeletedWithBudget} row(s) deleted from TOC still have budget. Please remove the row or clear its budget.`,
      );
    }
    emptyResult['Pool funding HLO'] = {
      hasError: poolMessages.length > 0,
      message: poolMessages.join(' '),
    };

    const partnerIds = new Set(partners.map((row) => row.id));
    const relevantContracted = contractedRows.filter((row) => partnerIds.has(row.porb_partner_id));
    const partnerById = new Map<number, PorbPartner>();
    partners.forEach((row) => partnerById.set(row.id, row));

    let partnerBudgetMissingAssumption = 0;
    let contractedMissingBudgetOrAssumption = 0;
    for (const contracted of relevantContracted) {
      const budget = parseBudget(contracted?.budget);
      const assumption = contracted?.assumption;

      if (budget > 0 && !hasAssumption(assumption)) {
        partnerBudgetMissingAssumption += 1;
      }
      if (budget <= 0 || !hasAssumption(assumption)) {
        contractedMissingBudgetOrAssumption += 1;
      }
    }
    const partnerMessages: string[] = [];
    if (partnerBudgetMissingAssumption > 0) {
      partnerMessages.push(
        `${partnerBudgetMissingAssumption} row(s) have budget but missing assumption.`,
      );
    }
    if (contractedMissingBudgetOrAssumption > 0) {
      partnerMessages.push(
        `${contractedMissingBudgetOrAssumption} contracted partner row(s) must include both budget and assumption.`,
      );
    }
    // Rule 14: TOC-deleted partners with non-zero contracted budget
    const partnerDeletedWithBudget = relevantContracted.filter((contracted) => {
      const parent = partnerById.get(contracted?.porb_partner_id);
      return parent?.toc_is_deleted && parseBudget(contracted?.budget) > 0;
    }).length;
    if (partnerDeletedWithBudget > 0) {
      partnerMessages.push(
        `${partnerDeletedWithBudget} row(s) deleted from TOC still have budget. Please remove the row or clear its budget.`,
      );
    }
    emptyResult['Partners'] = {
      hasError: partnerMessages.length > 0,
      message: partnerMessages.join(' '),
    };

    const meliaMissing = meliaRows.filter(
      (row) => parseBudget(row?.melia_budget) > 0 && !hasAssumption(row?.melia_assumption),
    ).length;
    // Rule 14: TOC-deleted rows with non-zero budget
    const meliaDeletedWithBudget = meliaRows.filter(
      (row) => row?.toc_is_deleted && parseBudget(row?.melia_budget) > 0,
    ).length;
    const meliaMessages: string[] = [];
    if (meliaMissing > 0) {
      meliaMessages.push(`${meliaMissing} row(s) have budget but missing assumption.`);
    }
    if (meliaDeletedWithBudget > 0) {
      meliaMessages.push(
        `${meliaDeletedWithBudget} row(s) deleted from TOC still have budget. Please remove the row or clear its budget.`,
      );
    }
    emptyResult['MELIA Study'] = {
      hasError: meliaMessages.length > 0,
      message: meliaMessages.join(' '),
    };

    // --- Anaplan validation (Rules 12 & 13) ---
    const [anaplanRows, anaplanAccounts] = await Promise.all([
      this.porbAnaplanRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
      this.anaplanRepository.find(),
    ]);
    const anaplanLabelById = new Map<number, string>();
    for (const acct of anaplanAccounts) {
      anaplanLabelById.set(acct.id, acct.label);
    }

    const anaplanMessages: string[] = [];

    // Rule 12: Partners total vs Anaplan "Collaborators non-CGIAR Centers"
    const partnerBudgetTotal = relevantContracted.reduce(
      (sum, row) => sum + parseBudget(row?.budget),
      0,
    );
    const collaboratorsRow = anaplanRows.find(
      (row) =>
        (anaplanLabelById.get(row.anaplan_id) || '').trim().toLowerCase() ===
        'collaborators non-cgiar centers',
    );
    const collaboratorsBudget = parseBudget(collaboratorsRow?.budget);
    if (partnerBudgetTotal !== collaboratorsBudget) {
      anaplanMessages.push(
        'Budget does not match the amount included in the Partners section of the PORB.',
      );
    }

    // Rule 13: Total Anaplan vs HLO + Cross-Cutting (if AOW00)
    const isCrossAow =
      String(selectedAow?.aow_acrnum || '')
        .trim()
        .toUpperCase() === 'AOW00';
    const totalAnaplan = anaplanRows.reduce(
      (sum, row) => sum + parseBudget(row?.budget),
      0,
    );
    const totalHlo = hlos.reduce(
      (sum, row) => sum + parseBudget(row?.hlo_budget),
      0,
    );
    const totalCross = isCrossAow
      ? crossRows.reduce((sum, row) => sum + parseBudget(row?.budget), 0)
      : 0;
    if (totalAnaplan !== totalHlo + totalCross) {
      anaplanMessages.push(
        'Budget does not match the amount included in the AOW section of the PORB.',
      );
    }

    emptyResult['Anaplan'] = {
      hasError: anaplanMessages.length > 0,
      message: anaplanMessages.join(' '),
      partnerMismatch: partnerBudgetTotal !== collaboratorsBudget,
      pooledMismatch: totalAnaplan !== totalHlo + totalCross,
    };
    const crossMissing = crossRows.filter(
      (row) => parseBudget(row?.budget) > 0 && !hasAssumption(row?.assumption),
    ).length;
    emptyResult['Cross Cutting'] = {
      hasError: isCrossAow && crossMissing > 0,
      message:
        isCrossAow && crossMissing > 0
          ? `${crossMissing} row(s) have budget but missing assumption.`
          : '',
    };

    // Rule 15: Countries of Implementation — total % per (center, AOW) must equal 0 or 100.
    // Mirror getCountryPercentage's "live row" filter so orphan rows (hidden in UI) don't
    // produce phantom errors users can't see/fix.
    const liveCountries = new Set<string>();
    for (const hlo of hlos) {
      if (!hlo?.hlo_geo) continue;
      for (const c of hlo.hlo_geo.split(', ')) {
        const trimmed = c.trim();
        if (trimmed) liveCountries.add(trimmed);
      }
    }
    const liveCountryPctTotal = countryPctRows
      .filter((r) => r.is_manual || liveCountries.has(r.country_name))
      .reduce((sum, r) => sum + (Number(r.percentage) || 0), 0);
    const countryPctRounded = Math.round(liveCountryPctTotal * 100) / 100;
    emptyResult['Countries of Implementation'] = {
      hasError: countryPctRounded !== 0 && countryPctRounded !== 100,
      message:
        countryPctRounded !== 0 && countryPctRounded !== 100
          ? `Total percentage must be exactly 100% (or 0% if not used). Current total: ${countryPctRounded}%.`
          : '',
    };

    // Rule 16: Location of Benefit — same rule.
    const liveLocationKeys = new Set<string>();
    for (const outcome of outcomesForAow) {
      if (!outcome?.outcome_geo) continue;
      for (const loc of this.parseOutcomeGeo(outcome.outcome_geo)) {
        liveLocationKeys.add(`${loc.type}::${loc.name}`);
      }
    }
    const liveLocationPctTotal = locationBenefitRows
      .filter(
        (r) => r.is_manual || liveLocationKeys.has(`${r.location_type}::${r.location_name}`),
      )
      .reduce((sum, r) => sum + (Number(r.percentage) || 0), 0);
    const locationPctRounded = Math.round(liveLocationPctTotal * 100) / 100;
    emptyResult['Location of Benefit'] = {
      hasError: locationPctRounded !== 0 && locationPctRounded !== 100,
      message:
        locationPctRounded !== 0 && locationPctRounded !== 100
          ? `Total percentage must be exactly 100% (or 0% if not used). Current total: ${locationPctRounded}%.`
          : '',
    };

    return emptyResult;
  }

  async getValidationSummary(program_id: number, center_id?: number) {
    const centerErrorCodes = new Set<string>();
    const w3CenterErrorCodes = new Set<string>();
    const aowErrorIds = new Set<number>();
    const includeAowForCenter = center_id != null;

    const [
      hlos,
      bilaterals,
      melias,
      partners,
      contractedRows,
      crossRows,
      anaplanRows,
      anaplanAccounts,
      aows,
      countryPctRows,
      locationBenefitRows,
      outcomes,
    ] = await Promise.all([
      this.porbHloRepository.find({ where: { program_id } }),
      this.porbBilateralRepository.find({ where: { program_id } }),
      this.porbMeliaRepository.find({ where: { program_id } }),
      this.porbPartnerRepository.find({ where: { program_id } }),
      this.porbContractedPartnerRepository.find({ where: { program_id } }),
      this.porbCrossRepository.find({ where: { program_id } }),
      this.porbAnaplanRepository.find({ where: { program_id } }),
      this.anaplanRepository.find(),
      this.porbAowRepository.find({ where: { program_id } }),
      this.porbCountryPercentageRepository.find({ where: { program_id } }),
      this.porbLocationBenefitRepository.find({ where: { program_id } }),
      this.porbOutcomeRepository.find({ where: { program_id, toc_is_deleted: false } }),
    ]);

    const hasAssumption = (value: any) => String(value ?? '').trim().length > 0;
    const parseBudget = (value: any): number => {
      const normalized = String(value ?? '').replace(/,/g, '').trim();
      if (!normalized) return 0;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const pushError = (rowCenterId: any, rowAowId: any) => {
      if (rowCenterId != null) {
        centerErrorCodes.add(String(rowCenterId));
      }
      if (rowAowId != null && (!includeAowForCenter || Number(rowCenterId) === Number(center_id))) {
        aowErrorIds.add(Number(rowAowId));
      }
    };

    for (const row of hlos) {
      if (row?.toc_is_deleted) continue;
      if (parseBudget(row?.hlo_budget) > 0 && !hasAssumption(row?.hlo_assumption)) {
        pushError(row?.center_id, row?.porb_aow_id);
      }
    }

    for (const row of bilaterals) {
      if (row?.toc_is_deleted) continue;
      if (parseBudget(row?.bilateral_budget) > 0 && !hasAssumption(row?.bilateral_assumption)) {
        // W3/Bilateral is center-level — only flag the center, not any AOW
        if (row?.center_id != null) {
          centerErrorCodes.add(String(row.center_id));
          w3CenterErrorCodes.add(String(row.center_id));
        }
      }
    }

    for (const row of melias) {
      if (row?.toc_is_deleted) continue;
      if (parseBudget(row?.melia_budget) > 0 && !hasAssumption(row?.melia_assumption)) {
        pushError(row?.center_id, row?.porb_aow_id);
      }
    }

    for (const row of crossRows) {
      if (parseBudget(row?.budget) > 0 && !hasAssumption(row?.assumption)) {
        pushError(row?.center_id, row?.porb_aow_id);
      }
    }

    const partnerById = new Map<number, PorbPartner>();
    const allPartnerById = new Map<number, PorbPartner>();
    for (const partner of partners) {
      allPartnerById.set(partner.id, partner);
      if (partner?.toc_is_deleted) continue;
      partnerById.set(partner.id, partner);
    }

    for (const contracted of contractedRows) {
      const partner = partnerById.get(contracted?.porb_partner_id);
      if (!partner) continue;
      const budget = parseBudget(contracted?.budget);
      const hasContractedAssumption = hasAssumption(contracted?.assumption);
      if (budget > 0 && !hasContractedAssumption) {
        pushError(contracted?.center_id, partner?.porb_aow_id);
        continue;
      }
      if (budget <= 0 || !hasContractedAssumption) {
        pushError(contracted?.center_id, partner?.porb_aow_id);
      }
    }

    // Rule 14: TOC-deleted rows with non-zero budget
    for (const hlo of hlos) {
      if (hlo?.toc_is_deleted && parseBudget(hlo?.hlo_budget) > 0) {
        pushError(hlo?.center_id, hlo?.porb_aow_id);
      }
    }
    for (const row of bilaterals) {
      if (row?.toc_is_deleted && parseBudget(row?.bilateral_budget) > 0) {
        if (row?.center_id != null) {
          centerErrorCodes.add(String(row.center_id));
          w3CenterErrorCodes.add(String(row.center_id));
        }
      }
    }
    for (const row of melias) {
      if (row?.toc_is_deleted && parseBudget(row?.melia_budget) > 0) {
        pushError(row?.center_id, row?.porb_aow_id);
      }
    }
    for (const contracted of contractedRows) {
      const partner = allPartnerById.get(contracted?.porb_partner_id);
      if (partner?.toc_is_deleted && parseBudget(contracted?.budget) > 0) {
        pushError(contracted?.center_id, partner?.porb_aow_id);
      }
    }

    // --- Rules 12 & 13: Anaplan cross-checks ---
    const anaplanLabelById = new Map<number, string>();
    for (const acct of anaplanAccounts) {
      anaplanLabelById.set(acct.id, acct.label);
    }
    const aowCodeById = new Map<number, string>();
    for (const aow of aows) {
      aowCodeById.set(aow.id, String(aow.aow_acrnum || '').trim().toUpperCase());
    }

    // Build partner-id → aow-id lookup
    const partnerAowMap = new Map<number, number>();
    for (const p of partners) {
      if (!p?.toc_is_deleted) {
        partnerAowMap.set(p.id, p.porb_aow_id);
      }
    }

    // Collect all unique (center_id, porb_aow_id) combinations
    const combos = new Set<string>();
    for (const row of anaplanRows) {
      if (row?.center_id != null && row?.porb_aow_id != null) {
        combos.add(`${row.center_id}::${row.porb_aow_id}`);
      }
    }
    for (const row of hlos) {
      if (row?.center_id != null && row?.porb_aow_id != null) {
        combos.add(`${row.center_id}::${row.porb_aow_id}`);
      }
    }
    for (const row of crossRows) {
      if (row?.center_id != null && row?.porb_aow_id != null) {
        combos.add(`${row.center_id}::${row.porb_aow_id}`);
      }
    }

    for (const combo of combos) {
      const [cIdStr, aowIdStr] = combo.split('::');
      const cId = Number(cIdStr);
      const aowId = Number(aowIdStr);
      const isCrossAow = aowCodeById.get(aowId) === 'AOW00';

      // Rule 12: Partners total vs Anaplan "Collaborators non-CGIAR Centers"
      const partnerIdsForAow = new Set<number>();
      for (const p of partners) {
        if (!p?.toc_is_deleted && p.porb_aow_id === aowId) {
          partnerIdsForAow.add(p.id);
        }
      }
      const partnerBudgetTotal = contractedRows
        .filter((row) => row.center_id === cId && partnerIdsForAow.has(row.porb_partner_id))
        .reduce((sum, row) => sum + parseBudget(row?.budget), 0);
      const collaboratorsRow = anaplanRows.find(
        (row) =>
          row.center_id === cId &&
          row.porb_aow_id === aowId &&
          (anaplanLabelById.get(row.anaplan_id) || '').trim().toLowerCase() === 'collaborators non-cgiar centers',
      );
      const collaboratorsBudget = parseBudget(collaboratorsRow?.budget);
      if (partnerBudgetTotal !== collaboratorsBudget) {
        pushError(cId, aowId);
      }

      // Rule 13: Total Anaplan vs HLO + Cross-Cutting (if AOW00)
      const totalAnaplan = anaplanRows
        .filter((row) => row.center_id === cId && row.porb_aow_id === aowId)
        .reduce((sum, row) => sum + parseBudget(row?.budget), 0);
      const totalHlo = hlos
        .filter((row) => row.center_id === cId && row.porb_aow_id === aowId)
        .reduce((sum, row) => sum + parseBudget(row?.hlo_budget), 0);
      const totalCross = isCrossAow
        ? crossRows
            .filter((row) => row.center_id === cId && row.porb_aow_id === aowId)
            .reduce((sum, row) => sum + parseBudget(row?.budget), 0)
        : 0;
      if (totalAnaplan !== totalHlo + totalCross) {
        pushError(cId, aowId);
      }
    }

    // --- Rule 15: Country of Implementation percentage total per (center, AOW) must be 0 or 100 ---
    // Mirror getCountryPercentage's "live row" filter: HLO-derived (country in current
    // hlo_geo for that center+AOW) or is_manual. Orphan rows are hidden in the UI, so
    // counting them would surface phantom errors users can't see/fix.
    const liveCountriesByCenterAow = new Map<string, Set<string>>();
    for (const hlo of hlos) {
      if (!hlo?.hlo_geo || hlo.center_id == null || hlo.porb_aow_id == null) continue;
      const key = `${hlo.center_id}::${hlo.porb_aow_id}`;
      let set = liveCountriesByCenterAow.get(key);
      if (!set) {
        set = new Set<string>();
        liveCountriesByCenterAow.set(key, set);
      }
      for (const c of hlo.hlo_geo.split(', ')) {
        const trimmed = c.trim();
        if (trimmed) set.add(trimmed);
      }
    }
    const countryPctByCombo = new Map<string, number>();
    for (const row of countryPctRows) {
      if (row.center_id == null || row.porb_aow_id == null) continue;
      const key = `${row.center_id}::${row.porb_aow_id}`;
      const isLive =
        row.is_manual ||
        liveCountriesByCenterAow.get(key)?.has(row.country_name);
      if (!isLive) continue;
      countryPctByCombo.set(key, (countryPctByCombo.get(key) ?? 0) + (Number(row.percentage) || 0));
    }
    for (const [key, total] of countryPctByCombo) {
      // 0 is fine (nothing entered); anything else must equal 100.
      // Rounded to 2 decimals to match the "1.0-2" UI display.
      const rounded = Math.round(total * 100) / 100;
      if (rounded !== 0 && rounded !== 100) {
        const [cIdStr, aowIdStr] = key.split('::');
        pushError(Number(cIdStr), Number(aowIdStr));
      }
    }

    // --- Rule 16: Location of Benefit percentage total per (center, AOW) must be 0 or 100 ---
    // Mirror getLocationBenefit's "live row" filter: derived from a non-deleted outcome's
    // outcome_geo for the same (program, aow), or is_manual. Outcomes are not center-scoped,
    // so the live key set is per AOW only.
    const liveLocationsByAow = new Map<number, Set<string>>();
    for (const outcome of outcomes) {
      if (!outcome?.outcome_geo || outcome.porb_aow_id == null) continue;
      let set = liveLocationsByAow.get(outcome.porb_aow_id);
      if (!set) {
        set = new Set<string>();
        liveLocationsByAow.set(outcome.porb_aow_id, set);
      }
      for (const loc of this.parseOutcomeGeo(outcome.outcome_geo)) {
        set.add(`${loc.type}::${loc.name}`);
      }
    }
    const locationPctByCombo = new Map<string, number>();
    for (const row of locationBenefitRows) {
      if (row.center_id == null || row.porb_aow_id == null) continue;
      const key = `${row.center_id}::${row.porb_aow_id}`;
      const isLive =
        row.is_manual ||
        liveLocationsByAow.get(row.porb_aow_id)?.has(`${row.location_type}::${row.location_name}`);
      if (!isLive) continue;
      locationPctByCombo.set(key, (locationPctByCombo.get(key) ?? 0) + (Number(row.percentage) || 0));
    }
    for (const [key, total] of locationPctByCombo) {
      const rounded = Math.round(total * 100) / 100;
      if (rounded !== 0 && rounded !== 100) {
        const [cIdStr, aowIdStr] = key.split('::');
        pushError(Number(cIdStr), Number(aowIdStr));
      }
    }

    return {
      center_error_codes: Array.from(centerErrorCodes),
      aow_error_ids: Array.from(aowErrorIds),
      w3_center_error_codes: Array.from(w3CenterErrorCodes),
    };
  }

  async getAnaplan(program_id: number, porb_aow_id?: number, center_id?: number) {
    if (porb_aow_id == null || center_id == null) {
      return [];
    }

    const [anaplanAccounts, aow, activePhase] = await Promise.all([
      this.anaplanRepository.find({ order: { label: 'ASC' } }),
      this.porbAowRepository.findOne({ where: { id: porb_aow_id } }),
      this.phasesService.findActivePhase(),
    ]);

    if (!anaplanAccounts.length) {
      return [];
    }

    const savedRows = await this.porbAnaplanRepository.find({
      where: { program_id, porb_aow_id, center_id },
    });
    const savedMap = new Map<number, PorbAnaplan>();
    savedRows.forEach((row) => savedMap.set(row.anaplan_id, row));

    const wpCode = String(aow?.aow_acrnum || '').trim();
    let wpId: number | null = null;
    if (wpCode) {
      const wp = await this.workPackageRepository.findOne({
        where: { initiative_id: program_id, wp_official_code: wpCode },
      });
      wpId = wp?.wp_id ?? null;
    }

    const anaplanIds = anaplanAccounts.map((item) => item.id);
    const where: any = {
      initiative_id: program_id,
      organization_code: center_id,
      anaplan_id: In(anaplanIds),
      submission_id: null,
    };
    if (activePhase?.id != null) {
      where.phase_id = activePhase.id;
    }
    if (wpId != null) {
      where.wp_id = wpId;
    }

    const sourceValues = await this.anaplanValuesRepository.find({ where });
    const sourceMap = new Map<number, number>();
    sourceValues.forEach((item) => sourceMap.set(item.anaplan_id, item.value));

    return anaplanAccounts.map((account) => {
      const saved = savedMap.get(account.id);
      return {
        program_id,
        porb_aow_id,
        center_id,
        anaplan_id: account.id,
        account: account.label,
        source_budget: sourceMap.get(account.id) ?? null,
        porb_budget: saved?.budget ?? null,
      };
    });
  }

  async getCross(program_id: number, porb_aow_id?: number, center_id?: number) {
    if (porb_aow_id == null || center_id == null) return [];

    const selectedAow = await this.porbAowRepository.findOne({
      where: { id: porb_aow_id, program_id },
    });
    if (!selectedAow || String(selectedAow.aow_acrnum || '').toUpperCase() !== 'AOW00') return [];

    const standardItems = await this.standerdCrossCuttingRepository.find({ order: { id: 'ASC' } });
    if (!standardItems.length) return [];

    const standardIds = standardItems.map((item) => item.id);
    const savedRows = await this.porbCrossRepository.find({
      where: { program_id, porb_aow_id, center_id, standerd_cross_cutting_id: In(standardIds) },
    });
    const savedMap = new Map<number, PorbCross>();
    savedRows.forEach((row) => savedMap.set(row.standerd_cross_cutting_id, row));

    return standardItems.map((item) => {
      const saved = savedMap.get(item.id);
      return {
        program_id,
        porb_aow_id,
        center_id,
        standerd_cross_cutting_id: item.id,
        title: item.name || '',
        budget: saved?.budget ?? null,
        assumption: saved?.assumption || '',
      };
    });
  }

  async getCountryPercentage(program_id: number, porb_aow_id?: number, center_id?: number) {
    if (porb_aow_id == null || center_id == null) return [];

    const [hlos, savedRows] = await Promise.all([
      this.porbHloRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
      this.porbCountryPercentageRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
    ]);

    const hloCountries = new Set<string>();
    for (const hlo of hlos) {
      if (!hlo.hlo_geo) continue;
      const countries = hlo.hlo_geo.split(', ');
      for (const c of countries) {
        const trimmed = c.trim();
        if (trimmed) hloCountries.add(trimmed);
      }
    }

    const savedMap = new Map<string, PorbCountryPercentage>();
    savedRows.forEach((row) => savedMap.set(row.country_name, row));

    const result: Array<{
      id?: number;
      program_id: number;
      porb_aow_id: number;
      center_id: number;
      country_name: string;
      percentage: number | null;
      is_manual: boolean;
    }> = [];
    const includedCountries = new Set<string>();

    // HLO-derived countries
    for (const country_name of Array.from(hloCountries).sort()) {
      const saved = savedMap.get(country_name);
      includedCountries.add(country_name);
      result.push({
        id: saved?.id,
        program_id,
        porb_aow_id,
        center_id,
        country_name,
        percentage: saved?.percentage ?? null,
        is_manual: false,
      });
    }

    // Manual rows that don't overlap with HLO countries
    for (const row of savedRows) {
      if (row.is_manual && !includedCountries.has(row.country_name)) {
        includedCountries.add(row.country_name);
        result.push({
          id: row.id,
          program_id,
          porb_aow_id,
          center_id,
          country_name: row.country_name,
          percentage: row.percentage ?? null,
          is_manual: true,
        });
      }
    }

    return result;
  }

  async updateCountryPercentage(
    data: {
      program_id: number;
      porb_aow_id: number;
      center_id: number;
      country_name: string;
      percentage?: number | null;
    },
    reqUser?: { id: number },
    emitterSocketId?: string,
  ) {
    await this.assertNotLocked(data.program_id);

    const existing = await this.porbCountryPercentageRepository.findOne({
      where: {
        program_id: data.program_id,
        porb_aow_id: data.porb_aow_id,
        center_id: data.center_id,
        country_name: data.country_name,
      },
    });

    if (existing) {
      const oldPercentage = existing.percentage;

      await this.porbCountryPercentageRepository.update(existing.id, {
        percentage: data.percentage ?? null,
      });

      if (String(oldPercentage ?? '') !== String(data.percentage ?? '')) {
        await this.logHistory({
          initiative_id: data.program_id,
          user_id: reqUser?.id,
          item_name: data.country_name,
          resource_property: 'Country Percentage',
          old_value: String(oldPercentage ?? ''),
          new_value: String(data.percentage ?? ''),
          organization_id: data.center_id,
        });
      }

      const result = await this.porbCountryPercentageRepository.findOne({ where: { id: existing.id } });
      this.emitPorbBudgetChanged({
        program_id: data.program_id,
        center_id: data.center_id,
        aow_id: data.porb_aow_id,
        section: 'country-percentage',
        type: 'update',
        emitter_socket_id: emitterSocketId,
      });
      return result;
    }

    const created = this.porbCountryPercentageRepository.create({
      program_id: data.program_id,
      porb_aow_id: data.porb_aow_id,
      center_id: data.center_id,
      country_name: data.country_name,
      percentage: data.percentage ?? null,
    });
    const saved = await this.porbCountryPercentageRepository.save(created);

    if (data.percentage != null && Number(data.percentage) !== 0) {
      await this.logHistory({
        initiative_id: data.program_id,
        user_id: reqUser?.id,
        item_name: data.country_name,
        resource_property: 'Country Percentage',
        old_value: '',
        new_value: String(data.percentage),
        organization_id: data.center_id,
      });
    }

    this.emitPorbBudgetChanged({
      program_id: data.program_id,
      center_id: data.center_id,
      aow_id: data.porb_aow_id,
      section: 'country-percentage',
      type: 'update',
      emitter_socket_id: emitterSocketId,
    });
    return saved;
  }

  async addManualCountry(
    data: { program_id: number; porb_aow_id: number; center_id: number; country_name: string },
    reqUser?: { id: number },
    emitterSocketId?: string,
  ) {
    await this.assertNotLocked(data.program_id);

    const existing = await this.porbCountryPercentageRepository.findOne({
      where: {
        program_id: data.program_id,
        porb_aow_id: data.porb_aow_id,
        center_id: data.center_id,
        country_name: data.country_name,
      },
    });
    if (existing) {
      throw new BadRequestException('Country already exists for this AOW and center.');
    }

    const created = this.porbCountryPercentageRepository.create({
      program_id: data.program_id,
      porb_aow_id: data.porb_aow_id,
      center_id: data.center_id,
      country_name: data.country_name,
      is_manual: true,
      percentage: null,
    });
    const saved = await this.porbCountryPercentageRepository.save(created);

    this.emitPorbBudgetChanged({
      program_id: data.program_id,
      center_id: data.center_id,
      aow_id: data.porb_aow_id,
      section: 'country-percentage',
      type: 'add',
      emitter_socket_id: emitterSocketId,
    });

    return saved;
  }

  async deleteManualCountry(id: number, reqUser?: { id: number }, emitterSocketId?: string) {
    const row = await this.porbCountryPercentageRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Country percentage row not found.');
    if (!row.is_manual) throw new ForbiddenException('Only manually added countries can be deleted.');
    await this.assertNotLocked(row.program_id);

    await this.porbCountryPercentageRepository.delete(id);

    this.emitPorbBudgetChanged({
      program_id: row.program_id,
      center_id: row.center_id,
      aow_id: row.porb_aow_id,
      section: 'country-percentage',
      type: 'delete',
      emitter_socket_id: emitterSocketId,
    });
  }

  async searchClarisaCountries(query: string) {
    if (!query || query.length < 2) return [];
    return this.clarisaCountryRepository
      .createQueryBuilder('c')
      .where('c.name LIKE :q', { q: `%${query}%` })
      .orderBy('c.name', 'ASC')
      .limit(20)
      .getMany()
      .then(rows => rows.map(r => ({ code: r.code, name: r.name, isoAlpha2: r.isoAlpha2 })));
  }

  // ── Location of Benefit ──

  /**
   * Parse outcome_geo string into array of { name, type } objects.
   */
  private parseOutcomeGeo(outcomeGeo: string): Array<{ name: string; type: string }> {
    if (!outcomeGeo) return [];
    const results: Array<{ name: string; type: string }> = [];
    // Support multi-part format: "Global; Region: X; Country: Y, Z"
    const parts = outcomeGeo.split(';').map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (part === 'Global') {
        results.push({ name: 'Global', type: 'global' });
      } else if (part.startsWith('Region: ')) {
        const names = part.substring('Region: '.length).split(', ');
        for (const n of names) if (n.trim()) results.push({ name: n.trim(), type: 'region' });
      } else if (part.startsWith('Country: ')) {
        const names = part.substring('Country: '.length).split(', ');
        for (const n of names) if (n.trim()) results.push({ name: n.trim(), type: 'country' });
      }
    }
    return results;
  }

  /**
   * Get location-of-benefit rows for a given program/AOW/center.
   * Locations are derived from outcome-level geo data and merged with saved percentages.
   */
  async getLocationBenefit(program_id: number, porb_aow_id?: number, center_id?: number) {
    if (porb_aow_id == null || center_id == null) return [];

    const [outcomes, savedRows] = await Promise.all([
      this.porbOutcomeRepository.find({
        where: { program_id, porb_aow_id, toc_is_deleted: false },
      }),
      this.porbLocationBenefitRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
    ]);

    // Extract unique locations from outcome geo data
    const locationSet = new Map<string, { name: string; type: string }>();
    for (const outcome of outcomes) {
      if (!outcome.outcome_geo) continue;
      const locations = this.parseOutcomeGeo(outcome.outcome_geo);
      for (const loc of locations) {
        const key = `${loc.type}::${loc.name}`;
        if (!locationSet.has(key)) locationSet.set(key, loc);
      }
    }

    // Build saved map keyed by (location_name, location_type)
    const savedMap = new Map<string, PorbLocationBenefit>();
    savedRows.forEach((row) => savedMap.set(`${row.location_type}::${row.location_name}`, row));

    const result: Array<{
      id?: number;
      program_id: number;
      porb_aow_id: number;
      center_id: number;
      location_name: string;
      location_type: string;
      percentage: number | null;
      is_manual: boolean;
    }> = [];
    const includedKeys = new Set<string>();

    // Sort: global first, then regions, then countries — alphabetically within each group
    const sortedLocations = Array.from(locationSet.values()).sort((a, b) => {
      const typeOrder = { global: 0, region: 1, country: 2 };
      const aOrder = typeOrder[a.type] ?? 3;
      const bOrder = typeOrder[b.type] ?? 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });

    // Outcome-derived locations
    for (const loc of sortedLocations) {
      const key = `${loc.type}::${loc.name}`;
      const saved = savedMap.get(key);
      includedKeys.add(key);
      result.push({
        id: saved?.id,
        program_id,
        porb_aow_id,
        center_id,
        location_name: loc.name,
        location_type: loc.type,
        percentage: saved?.percentage ?? null,
        is_manual: false,
      });
    }

    // Manual rows that don't overlap with outcome-derived locations
    for (const row of savedRows) {
      const key = `${row.location_type}::${row.location_name}`;
      if (row.is_manual && !includedKeys.has(key)) {
        includedKeys.add(key);
        result.push({
          id: row.id,
          program_id,
          porb_aow_id,
          center_id,
          location_name: row.location_name,
          location_type: row.location_type,
          percentage: row.percentage ?? null,
          is_manual: true,
        });
      }
    }

    return result;
  }

  /**
   * Update (upsert) a location-of-benefit percentage.
   */
  async updateLocationBenefit(
    data: {
      program_id: number;
      porb_aow_id: number;
      center_id: number;
      location_name: string;
      location_type: string;
      percentage?: number | null;
    },
    reqUser?: { id: number },
    emitterSocketId?: string,
  ) {
    await this.assertNotLocked(data.program_id);

    const existing = await this.porbLocationBenefitRepository.findOne({
      where: {
        program_id: data.program_id,
        porb_aow_id: data.porb_aow_id,
        center_id: data.center_id,
        location_name: data.location_name,
        location_type: data.location_type,
      },
    });

    if (existing) {
      const oldPercentage = existing.percentage;

      await this.porbLocationBenefitRepository.update(existing.id, {
        percentage: data.percentage ?? null,
      });

      if (String(oldPercentage ?? '') !== String(data.percentage ?? '')) {
        await this.logHistory({
          initiative_id: data.program_id,
          user_id: reqUser?.id,
          item_name: `${data.location_name} (${data.location_type})`,
          resource_property: 'Location of Benefit',
          old_value: String(oldPercentage ?? ''),
          new_value: String(data.percentage ?? ''),
          organization_id: data.center_id,
        });
      }

      const result = await this.porbLocationBenefitRepository.findOne({ where: { id: existing.id } });
      this.emitPorbBudgetChanged({
        program_id: data.program_id,
        center_id: data.center_id,
        aow_id: data.porb_aow_id,
        section: 'location-benefit',
        type: 'update',
        emitter_socket_id: emitterSocketId,
      });
      return result;
    }

    const created = this.porbLocationBenefitRepository.create({
      program_id: data.program_id,
      porb_aow_id: data.porb_aow_id,
      center_id: data.center_id,
      location_name: data.location_name,
      location_type: data.location_type,
      percentage: data.percentage ?? null,
    });
    const saved = await this.porbLocationBenefitRepository.save(created);

    if (data.percentage != null && Number(data.percentage) !== 0) {
      await this.logHistory({
        initiative_id: data.program_id,
        user_id: reqUser?.id,
        item_name: data.location_name,
        resource_property: 'Location of Benefit',
        old_value: '',
        new_value: String(data.percentage),
        organization_id: data.center_id,
      });
    }

    this.emitPorbBudgetChanged({
      program_id: data.program_id,
      center_id: data.center_id,
      aow_id: data.porb_aow_id,
      section: 'location-benefit',
      type: 'update',
      emitter_socket_id: emitterSocketId,
    });
    return saved;
  }

  /**
   * Add a manually-created location-of-benefit row.
   */
  async addManualLocation(
    data: { program_id: number; porb_aow_id: number; center_id: number; location_name: string; location_type: string },
    reqUser?: { id: number },
    emitterSocketId?: string,
  ) {
    await this.assertNotLocked(data.program_id);

    const existing = await this.porbLocationBenefitRepository.findOne({
      where: {
        program_id: data.program_id,
        porb_aow_id: data.porb_aow_id,
        center_id: data.center_id,
        location_name: data.location_name,
        location_type: data.location_type,
      },
    });

    // Only treat the row as a real duplicate if it's currently visible to the user.
    // A row is visible when is_manual=true, or when an active (non-toc-deleted) outcome
    // for this AOW still includes this location in its outcome_geo. Rows that fail both
    // checks are orphans from a previous TOC state — promote them back to manual instead
    // of erroring, so the user can re-add the location.
    if (existing) {
      let isLive = existing.is_manual;
      if (!isLive) {
        const outcomes = await this.porbOutcomeRepository.find({
          where: { program_id: data.program_id, porb_aow_id: data.porb_aow_id, toc_is_deleted: false },
        });
        const targetKey = `${data.location_type}::${data.location_name}`;
        outer: for (const outcome of outcomes) {
          if (!outcome.outcome_geo) continue;
          for (const loc of this.parseOutcomeGeo(outcome.outcome_geo)) {
            if (`${loc.type}::${loc.name}` === targetKey) {
              isLive = true;
              break outer;
            }
          }
        }
      }

      if (isLive) {
        throw new BadRequestException('Location already exists for this AOW and center.');
      }

      await this.porbLocationBenefitRepository.update(existing.id, { is_manual: true });
      const refreshed = await this.porbLocationBenefitRepository.findOne({ where: { id: existing.id } });

      this.emitPorbBudgetChanged({
        program_id: data.program_id,
        center_id: data.center_id,
        aow_id: data.porb_aow_id,
        section: 'location-benefit',
        type: 'add',
        emitter_socket_id: emitterSocketId,
      });

      return refreshed;
    }

    const created = this.porbLocationBenefitRepository.create({
      program_id: data.program_id,
      porb_aow_id: data.porb_aow_id,
      center_id: data.center_id,
      location_name: data.location_name,
      location_type: data.location_type,
      is_manual: true,
      percentage: null,
    });
    const saved = await this.porbLocationBenefitRepository.save(created);

    this.emitPorbBudgetChanged({
      program_id: data.program_id,
      center_id: data.center_id,
      aow_id: data.porb_aow_id,
      section: 'location-benefit',
      type: 'add',
      emitter_socket_id: emitterSocketId,
    });

    return saved;
  }

  /**
   * Delete a manually-created location-of-benefit row.
   */
  async deleteManualLocation(id: number, reqUser?: { id: number }, emitterSocketId?: string) {
    const row = await this.porbLocationBenefitRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Location benefit row not found.');
    if (!row.is_manual) throw new ForbiddenException('Only manually added locations can be deleted.');
    await this.assertNotLocked(row.program_id);

    await this.porbLocationBenefitRepository.delete(id);

    this.emitPorbBudgetChanged({
      program_id: row.program_id,
      center_id: row.center_id,
      aow_id: row.porb_aow_id,
      section: 'location-benefit',
      type: 'delete',
      emitter_socket_id: emitterSocketId,
    });
  }

  /**
   * Search for locations (countries and/or regions) for manual add.
   */
  async searchLocations(query: string, type?: string) {
    if (!query || query.length < 2) return [];

    const results: Array<{ name: string; type: string }> = [];

    if (!type || type === 'country') {
      const countries = await this.clarisaCountryRepository
        .createQueryBuilder('c')
        .where('c.name LIKE :q', { q: `%${query}%` })
        .orderBy('c.name', 'ASC')
        .limit(20)
        .getMany();
      for (const c of countries) {
        results.push({ name: c.name, type: 'country' });
      }
    }

    if (!type || type === 'region') {
      const regions = await this.regionRepository
        .createQueryBuilder('r')
        .where('r.name LIKE :q', { q: `%${query}%` })
        .orderBy('r.name', 'ASC')
        .limit(20)
        .getMany();
      for (const r of regions) {
        results.push({ name: r.name, type: 'region' });
      }
    }

    // Sort by name, limit to 20 total
    results.sort((a, b) => a.name.localeCompare(b.name));
    return results.slice(0, 20);
  }

  /**
   * Get consolidated location-of-benefit data across AOWs.
   */
  async getLocationBenefitConsolidated(
    program_id: number,
    center_id?: number,
  ): Promise<{
    locations: Array<{ location_name: string; location_type: string; percentage: number; totalBudget: number }>;
    grandTotal: number;
  }> {
    const lbWhere: Record<string, any> = { program_id };
    if (center_id != null) lbWhere.center_id = center_id;
    const lbRows = await this.porbLocationBenefitRepository.find({
      where: lbWhere,
    });

    if (!lbRows.length) {
      return { locations: [], grandTotal: 0 };
    }

    // Get pooled totals per (aow, center): HLO + Cross-cutting budgets
    const hloWhere: Record<string, any> = { program_id };
    if (center_id != null) hloWhere.center_id = center_id;
    const hlos = await this.porbHloRepository.find({ where: hloWhere });

    const crossWhere: Record<string, any> = { program_id };
    if (center_id != null) crossWhere.center_id = center_id;
    const crosses = await this.porbCrossRepository.find({ where: crossWhere });

    const pooledMap = new Map<string, number>();

    for (const h of hlos) {
      const key = `${h.porb_aow_id}_${h.center_id}`;
      pooledMap.set(key, (pooledMap.get(key) || 0) + (Number(h.hlo_budget) || 0));
    }
    for (const c of crosses) {
      const key = `${c.porb_aow_id}_${c.center_id}`;
      pooledMap.set(key, (pooledMap.get(key) || 0) + (Number(c.budget) || 0));
    }

    // Compute total pooled funding (denominator for percentage)
    let totalPooledFunding = 0;
    for (const val of pooledMap.values()) {
      totalPooledFunding += val;
    }

    // Compute budget for each location, aggregate by (location_name, location_type)
    const locationBudgetMap = new Map<string, { budget: number; type: string }>();

    for (const row of lbRows) {
      const pooledKey = `${row.porb_aow_id}_${row.center_id}`;
      const pooledTotal = pooledMap.get(pooledKey) || 0;
      const pct = Number(row.percentage) || 0;
      const budget = Math.round((pct * pooledTotal) / 100);
      const mapKey = `${row.location_type}::${row.location_name}`;
      const existing = locationBudgetMap.get(mapKey);
      locationBudgetMap.set(mapKey, {
        budget: (existing?.budget || 0) + budget,
        type: row.location_type,
      });
    }

    const grandTotal = Array.from(locationBudgetMap.values()).reduce((a, b) => a + b.budget, 0);

    // Recalculate percentage as location budget / total pooled funding
    const locations = Array.from(locationBudgetMap.entries())
      .map(([mapKey, { budget: totalBudget, type }]) => {
        const location_name = mapKey.substring(mapKey.indexOf('::') + 2);
        return {
          location_name,
          location_type: type,
          percentage: totalPooledFunding > 0
            ? Math.round((totalBudget / totalPooledFunding) * 10000) / 100
            : 0,
          totalBudget,
        };
      })
      .sort((a, b) => {
        const typeOrder = { global: 0, region: 1, country: 2 };
        const aOrder = typeOrder[a.location_type] ?? 3;
        const bOrder = typeOrder[b.location_type] ?? 3;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.location_name.localeCompare(b.location_name);
      });

    return { locations, grandTotal };
  }

  private emitPorbBudgetChanged(payload: {
    program_id: number;
    center_id?: number | string;
    aow_id?: number | null;
    section: 'hlo' | 'partner' | 'bilateral' | 'melia' | 'anaplan' | 'cross' | 'country-percentage' | 'location-benefit' | 'center-status';
    type: 'update' | 'delete' | 'add';
    emitter_socket_id?: string;
  }) {
    this.eventsGateway.server.emit('porbBudgetChanged', payload);
  }

  private async logHistory(opts: {
    initiative_id: number;
    user_id?: number;
    item_name?: string;
    resource_property: string;
    old_value?: string;
    new_value?: string;
    organization_id?: number;
  }) {
    const h = this.historyRepository.create(opts);
    const saved = await this.historyRepository.save(h);
    await this.initiativeRepository.update(opts.initiative_id, {
      latest_history_id: saved.id,
    });
  }

  async updateHlo(
    id: number,
    data: Partial<PorbHlo>,
    reqUser?: { id: number },
    emitterSocketId?: string,
  ) {
    if (data.hlo_budget != null) {
      data.hlo_budget = Math.round(Number(data.hlo_budget));
    }
    const existing = await this.porbHloRepository.findOne({ where: { id } });
    if (existing) await this.assertNotLocked(existing.program_id);
    await this.porbHloRepository.update(id, data);
    const updated = await this.porbHloRepository.findOne({ where: { id } });

    if (existing && updated) {
      const itemName = existing.hlo_name || '';
      if (
        data.hlo_budget !== undefined &&
        String(existing.hlo_budget ?? '') !== String(data.hlo_budget ?? '')
      ) {
        await this.logHistory({
          initiative_id: existing.program_id,
          user_id: reqUser?.id,
          item_name: itemName,
          resource_property: 'HLO Budget',
          old_value: String(existing.hlo_budget ?? ''),
          new_value: String(data.hlo_budget ?? ''),
          organization_id: existing.center_id,
        });
      }
      if (
        data.hlo_assumption !== undefined &&
        (existing.hlo_assumption ?? '') !== (data.hlo_assumption ?? '')
      ) {
        await this.logHistory({
          initiative_id: existing.program_id,
          user_id: reqUser?.id,
          item_name: itemName,
          resource_property: 'HLO Assumption',
          old_value: existing.hlo_assumption ?? '',
          new_value: data.hlo_assumption ?? '',
          organization_id: existing.center_id,
        });
      }
    }

    if (existing) {
      this.emitPorbBudgetChanged({
        program_id: existing.program_id,
        center_id: existing.center_id,
        aow_id: existing.porb_aow_id,
        section: 'hlo',
        type: 'update',
        emitter_socket_id: emitterSocketId,
      });
    }

    return updated;
  }

  async updatePartner(
    id: number,
    data: {
      partner_is_contracted?: boolean | string;
      center_id?: number | string;
      partner_country_codes?: Array<number | string>;
      partner_budget?: number | null;
      assumption?: string;
    },
    reqUser?: { id: number },
    emitterSocketId?: string,
  ) {
    if (data.partner_budget != null && data.partner_budget !== ('' as any)) {
      data.partner_budget = Math.round(Number(data.partner_budget));
    }

    const partner = await this.porbPartnerRepository.findOne({ where: { id } });
    if (!partner) {
      throw new BadRequestException('Partner row not found.');
    }
    await this.assertNotLocked(partner.program_id);

    const isContracted =
      data.partner_is_contracted === true ||
      data.partner_is_contracted === 'true' ||
      data.partner_is_contracted === '1';
    const centerId = Number(data.center_id);
    if (!Number.isFinite(centerId)) {
      throw new BadRequestException('Center is required for partner updates.');
    }
    const selectedCountryCodes = this.normalizeCountryCodes(data.partner_country_codes);

    // Capture old contracted values for history tracking before update
    const oldContracted = await this.porbContractedPartnerRepository.findOne({
      where: { porb_partner_id: id, center_id: centerId },
    });
    const oldBudget = oldContracted?.budget ?? null;
    const oldAssumption = oldContracted?.assumption ?? '';

    if (isContracted) {
      if (!selectedCountryCodes.length) {
        throw new BadRequestException('Countries are required for contracted partners.');
      }
      const validCountries = await this.clarisaCountryRepository.find({
        where: { code: In(selectedCountryCodes) },
      });
      const validCodeSet = new Set(validCountries.map((country) => Number(country.code)));
      const countryCodes = selectedCountryCodes.filter((code) => validCodeSet.has(code));
      if (!countryCodes.length) {
        throw new BadRequestException('Selected countries are invalid.');
      }
      const countries = this.serializeCountryCodes(countryCodes);
      const contractedBudget =
        data.partner_budget != null && data.partner_budget !== ('' as any)
          ? Number(data.partner_budget)
          : null;

      // Find all matching rows and deduplicate (keep first, delete rest)
      const allExisting = await this.porbContractedPartnerRepository.find({
        where: { porb_partner_id: id, center_id: centerId },
        order: { id: 'ASC' },
      });
      const existing = allExisting[0] || null;
      if (allExisting.length > 1) {
        const dupeIds = allExisting.slice(1).map((r) => r.id);
        await this.porbContractedPartnerRepository.delete(dupeIds);
      }

      const contractedAssumption = data.assumption ?? '';

      if (existing) {
        await this.porbContractedPartnerRepository.update(existing.id, {
          center_id: centerId,
          countries,
          budget: contractedBudget,
          assumption: contractedAssumption,
        });
      } else {
        const row = this.porbContractedPartnerRepository.create({
          program_id: partner.program_id,
          center_id: centerId,
          porb_partner_id: id,
          porb_aow_id: partner.porb_aow_id,
          countries,
          budget: contractedBudget,
          assumption: contractedAssumption,
        });
        await this.porbContractedPartnerRepository.save(row);
      }

    } else {
      await this.porbContractedPartnerRepository.delete({ porb_partner_id: id, center_id: centerId });
    }

    const updated = await this.porbPartnerRepository.findOne({ where: { id } });
    const contracted = await this.porbContractedPartnerRepository.findOne({
      where: { porb_partner_id: id, center_id: centerId },
    });

    if (!updated) {
      return null;
    }

    const selectedCodes = contracted ? this.parseCountryCodes(contracted.countries) : [];
    const selectedCountries = selectedCodes.length
      ? await this.clarisaCountryRepository.find({ where: { code: In(selectedCodes) } })
      : [];

    // Track partner changes
    const itemName = partner.partner_name || '';
    const newBudget = contracted?.budget ?? null;
    const newAssumption = contracted?.assumption ?? '';
    if (String(oldBudget ?? '') !== String(newBudget ?? '')) {
      await this.logHistory({
        initiative_id: partner.program_id,
        user_id: reqUser?.id,
        item_name: itemName,
        resource_property: 'Partner Budget',
        old_value: String(oldBudget ?? ''),
        new_value: String(newBudget ?? ''),
      });
    }
    if (oldAssumption !== newAssumption) {
      await this.logHistory({
        initiative_id: partner.program_id,
        user_id: reqUser?.id,
        item_name: itemName,
        resource_property: 'Partner Assumption',
        old_value: oldAssumption,
        new_value: newAssumption,
      });
    }

    const countryNames = selectedCountries.map((c) => c.name).filter(Boolean);

    this.emitPorbBudgetChanged({
      program_id: partner.program_id,
      center_id: Number(data.center_id),
      aow_id: partner.porb_aow_id,
      section: 'partner',
      type: 'update',
      emitter_socket_id: emitterSocketId,
    });

    return {
      ...updated,
      partner_geo: countryNames.length ? countryNames.join(', ') : null,
      partner_assumption: contracted?.assumption ?? '',
      partner_country_codes: selectedCodes,
      partner_budget: contracted?.budget ?? null,
      partner_is_contracted: contracted ? '1' : '0',
    };
  }

  private normalizeCountryCodes(rawCodes?: Array<number | string>): number[] {
    if (!Array.isArray(rawCodes)) {
      return [];
    }
    return [...new Set(
      rawCodes
        .map((code) => Number(code))
        .filter((code) => Number.isFinite(code)),
    )];
  }

  private parseCountryCodes(countriesRaw: string): number[] {
    if (!countriesRaw) {
      return [];
    }
    const value = String(countriesRaw).trim();
    if (!value) {
      return [];
    }
    if (value.startsWith('[')) {
      try {
        const parsed = JSON.parse(value);
        return this.normalizeCountryCodes(parsed);
      } catch {
        return [];
      }
    }
    return this.normalizeCountryCodes(value.split(',').map((item) => item.trim()));
  }

  private serializeCountryCodes(codes: number[]): string {
    return JSON.stringify(codes);
  }

  async updateBilateral(
    id: number,
    data: Partial<PorbBilateral>,
    reqUser?: { id: number },
    emitterSocketId?: string,
  ) {
    if (data.bilateral_budget != null) {
      data.bilateral_budget = Math.round(Number(data.bilateral_budget));
    }
    const existing = await this.porbBilateralRepository.findOne({
      where: { id },
    });
    if (existing) await this.assertNotLocked(existing.program_id);
    await this.porbBilateralRepository.update(id, data);
    const updated = await this.porbBilateralRepository.findOne({
      where: { id },
    });

    if (existing && updated) {
      const itemName = existing.bilateral_name || '';
      if (
        data.bilateral_budget !== undefined &&
        String(existing.bilateral_budget ?? '') !==
          String(data.bilateral_budget ?? '')
      ) {
        await this.logHistory({
          initiative_id: existing.program_id,
          user_id: reqUser?.id,
          item_name: itemName,
          resource_property: 'W3/Bilateral Budget',
          old_value: String(existing.bilateral_budget ?? ''),
          new_value: String(data.bilateral_budget ?? ''),
          organization_id: existing.center_id,
        });
      }
      if (
        data.bilateral_assumption !== undefined &&
        (existing.bilateral_assumption ?? '') !==
          (data.bilateral_assumption ?? '')
      ) {
        await this.logHistory({
          initiative_id: existing.program_id,
          user_id: reqUser?.id,
          item_name: itemName,
          resource_property: 'W3/Bilateral Assumption',
          old_value: existing.bilateral_assumption ?? '',
          new_value: data.bilateral_assumption ?? '',
          organization_id: existing.center_id,
        });
      }
    }

    if (existing) {
      this.emitPorbBudgetChanged({
        program_id: existing.program_id,
        center_id: existing.center_id,
        aow_id: null,
        section: 'bilateral',
        type: 'update',
        emitter_socket_id: emitterSocketId,
      });
    }

    return updated;
  }

  async updateMelia(
    id: number,
    data: Partial<PorbMelia>,
    reqUser?: { id: number },
    emitterSocketId?: string,
  ) {
    if (data.melia_budget != null) {
      data.melia_budget = Math.round(Number(data.melia_budget));
    }
    const existing = await this.porbMeliaRepository.findOne({
      where: { id },
    });
    if (existing) await this.assertNotLocked(existing.program_id);
    await this.porbMeliaRepository.update(id, data);
    const updated = await this.porbMeliaRepository.findOne({
      where: { id },
    });

    if (existing && updated) {
      const itemName = existing.melia_name || '';
      if (
        data.melia_budget !== undefined &&
        String(existing.melia_budget ?? '') !==
          String(data.melia_budget ?? '')
      ) {
        await this.logHistory({
          initiative_id: existing.program_id,
          user_id: reqUser?.id,
          item_name: itemName,
          resource_property: 'MELIA Budget',
          old_value: String(existing.melia_budget ?? ''),
          new_value: String(data.melia_budget ?? ''),
          organization_id: existing.center_id,
        });
      }
      if (
        data.melia_assumption !== undefined &&
        (existing.melia_assumption ?? '') !==
          (data.melia_assumption ?? '')
      ) {
        await this.logHistory({
          initiative_id: existing.program_id,
          user_id: reqUser?.id,
          item_name: itemName,
          resource_property: 'MELIA Assumption',
          old_value: existing.melia_assumption ?? '',
          new_value: data.melia_assumption ?? '',
          organization_id: existing.center_id,
        });
      }
    }

    if (existing) {
      this.emitPorbBudgetChanged({
        program_id: existing.program_id,
        center_id: existing.center_id,
        aow_id: existing.porb_aow_id,
        section: 'melia',
        type: 'update',
        emitter_socket_id: emitterSocketId,
      });
    }

    return updated;
  }

  async updateAnaplan(
    data: {
      program_id: number;
      porb_aow_id: number;
      center_id: number;
      anaplan_id: number;
      budget?: number | null;
    },
    reqUser?: { id: number },
    emitterSocketId?: string,
  ) {
    if (data.budget != null) {
      data.budget = Math.round(Number(data.budget));
    }
    await this.assertNotLocked(data.program_id);

    const existing = await this.porbAnaplanRepository.findOne({
      where: {
        program_id: data.program_id,
        porb_aow_id: data.porb_aow_id,
        center_id: data.center_id,
        anaplan_id: data.anaplan_id,
      },
    });

    if (existing) {
      const oldBudget = existing.budget;
      await this.porbAnaplanRepository.update(existing.id, {
        budget: data.budget ?? null,
      });

      if (String(oldBudget ?? '') !== String(data.budget ?? '')) {
        const anaplan = await this.anaplanRepository.findOne({
          where: { id: data.anaplan_id },
        });
        await this.logHistory({
          initiative_id: data.program_id,
          user_id: reqUser?.id,
          item_name: anaplan?.label || `Anaplan #${data.anaplan_id}`,
          resource_property: 'Anaplan Budget',
          old_value: String(oldBudget ?? ''),
          new_value: String(data.budget ?? ''),
          organization_id: data.center_id,
        });
      }

      const result = await this.porbAnaplanRepository.findOne({ where: { id: existing.id } });
      this.emitPorbBudgetChanged({
        program_id: data.program_id,
        center_id: data.center_id,
        aow_id: data.porb_aow_id,
        section: 'anaplan',
        type: 'update',
        emitter_socket_id: emitterSocketId,
      });
      return result;
    }

    const created = this.porbAnaplanRepository.create({
      program_id: data.program_id,
      porb_aow_id: data.porb_aow_id,
      center_id: data.center_id,
      anaplan_id: data.anaplan_id,
      budget: data.budget ?? null,
    });
    const saved = await this.porbAnaplanRepository.save(created);

    if (data.budget != null) {
      const anaplan = await this.anaplanRepository.findOne({
        where: { id: data.anaplan_id },
      });
      await this.logHistory({
        initiative_id: data.program_id,
        user_id: reqUser?.id,
        item_name: anaplan?.label || `Anaplan #${data.anaplan_id}`,
        resource_property: 'Anaplan Budget',
        old_value: '',
        new_value: String(data.budget ?? ''),
        organization_id: data.center_id,
      });
    }

    this.emitPorbBudgetChanged({
      program_id: data.program_id,
      center_id: data.center_id,
      aow_id: data.porb_aow_id,
      section: 'anaplan',
      type: 'update',
      emitter_socket_id: emitterSocketId,
    });

    return saved;
  }

  async updateCross(
    data: {
      program_id: number;
      porb_aow_id: number;
      center_id: number;
      standerd_cross_cutting_id: number;
      budget?: number | null;
      assumption?: string;
    },
    reqUser?: { id: number },
    emitterSocketId?: string,
  ) {
    if (data.budget != null) {
      data.budget = Math.round(Number(data.budget));
    }
    await this.assertNotLocked(data.program_id);

    const existing = await this.porbCrossRepository.findOne({
      where: {
        program_id: data.program_id,
        porb_aow_id: data.porb_aow_id,
        center_id: data.center_id,
        standerd_cross_cutting_id: data.standerd_cross_cutting_id,
      },
    });

    const standardItem = await this.standerdCrossCuttingRepository.findOne({
      where: { id: data.standerd_cross_cutting_id },
    });
    const itemName = standardItem?.name || `Cross Cutting #${data.standerd_cross_cutting_id}`;

    if (existing) {
      const oldBudget = existing.budget;
      const oldAssumption = existing.assumption ?? '';

      await this.porbCrossRepository.update(existing.id, {
        budget: data.budget ?? null,
        assumption: String(data.assumption || ''),
      });

      if (String(oldBudget ?? '') !== String(data.budget ?? '')) {
        await this.logHistory({
          initiative_id: data.program_id,
          user_id: reqUser?.id,
          item_name: itemName,
          resource_property: 'Cross Cutting Budget',
          old_value: String(oldBudget ?? ''),
          new_value: String(data.budget ?? ''),
          organization_id: data.center_id,
        });
      }
      if (oldAssumption !== String(data.assumption || '')) {
        await this.logHistory({
          initiative_id: data.program_id,
          user_id: reqUser?.id,
          item_name: itemName,
          resource_property: 'Cross Cutting Assumption',
          old_value: oldAssumption,
          new_value: String(data.assumption || ''),
          organization_id: data.center_id,
        });
      }

      const result = await this.porbCrossRepository.findOne({ where: { id: existing.id } });
      this.emitPorbBudgetChanged({
        program_id: data.program_id,
        center_id: data.center_id,
        aow_id: data.porb_aow_id,
        section: 'cross',
        type: 'update',
        emitter_socket_id: emitterSocketId,
      });
      return result;
    }

    const created = this.porbCrossRepository.create({
      program_id: data.program_id,
      porb_aow_id: data.porb_aow_id,
      center_id: data.center_id,
      standerd_cross_cutting_id: data.standerd_cross_cutting_id,
      budget: data.budget ?? null,
      assumption: String(data.assumption || ''),
    });
    const saved = await this.porbCrossRepository.save(created);

    if (data.budget != null && Number(data.budget) !== 0) {
      await this.logHistory({
        initiative_id: data.program_id,
        user_id: reqUser?.id,
        item_name: itemName,
        resource_property: 'Cross Cutting Budget',
        old_value: '',
        new_value: String(data.budget),
        organization_id: data.center_id,
      });
    }
    if (data.assumption && String(data.assumption).trim() !== '') {
      await this.logHistory({
        initiative_id: data.program_id,
        user_id: reqUser?.id,
        item_name: itemName,
        resource_property: 'Cross Cutting Assumption',
        old_value: '',
        new_value: String(data.assumption),
        organization_id: data.center_id,
      });
    }

    this.emitPorbBudgetChanged({
      program_id: data.program_id,
      center_id: data.center_id,
      aow_id: data.porb_aow_id,
      section: 'cross',
      type: 'update',
      emitter_socket_id: emitterSocketId,
    });
    return saved;
  }

  async migrateExistingCrossToStandard() {
    const standardItems = await this.standerdCrossCuttingRepository.find();
    const nameToId = new Map<string, number>();
    for (const item of standardItems) {
      nameToId.set((item.name || '').trim().toLowerCase(), item.id);
    }

    const unmigrated = await this.porbCrossRepository.find({
      where: { standerd_cross_cutting_id: IsNull() },
      relations: ['cross_cutting'],
    });

    let matched = 0;
    const unmatchedTitles: string[] = [];

    for (const row of unmigrated) {
      const title = (row.cross_cutting?.title || '').trim().toLowerCase();
      const standardId = nameToId.get(title);
      if (standardId != null) {
        await this.porbCrossRepository.update(row.id, { standerd_cross_cutting_id: standardId });
        matched++;
      } else {
        const rawTitle = row.cross_cutting?.title || `(unknown CC id=${row.cross_cutting_id})`;
        if (!unmatchedTitles.includes(rawTitle)) {
          unmatchedTitles.push(rawTitle);
        }
      }
    }

    return {
      total: unmigrated.length,
      matched,
      unmatched: unmigrated.length - matched,
      unmatchedTitles,
    };
  }

  private toNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private stripHtml(value: string): string {
    return String(value || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private parseGeoFromLocation(node: any): string {
    const location = String(node?.location || '').toLowerCase();
    const countries = Array.isArray(node?.countries) ? node.countries : [];

    if (location === 'country' && countries.length) {
      const names = countries
        .map((c: any) => c?.name || c?.isoAlpha2 || c?.code || c?.id)
        .filter(Boolean);
      return names.length ? names.join(', ') : '';
    }
    return '';
  }

  private deriveHloGeo(item: any, indicator?: any): string {
    // Use the specific indicator's geo only — don't inherit from the OUTPUT node
    if (indicator) {
      return this.parseGeoFromLocation(indicator);
    }
    return '';
  }

  private deriveIndicatorType(item: any): string {
    const indicators = Array.isArray(item?.quantitative_indicators)
      ? item.quantitative_indicators
      : [];

    const mappedTypes = indicators.map((indicator: any) => {
      const rawType = String(indicator?.type?.value || 'others').trim().toLowerCase();
      return rawType;
    });

    const uniqueTypes = Array.from(new Set(mappedTypes.length ? mappedTypes : ['others']));

    return uniqueTypes.join('');
  }

  /**
   * Per-entity dedup behavior (called from `importTocToPorbTables`):
   *
   * - `porb_aow`         — keyed by `toc_id`. AOW rows are unique per program/toc_id by
   *                        construction; defaults are sufficient.
   * - `porb_hlo`         — composite key `toc_id::center_id`. Unique by construction
   *                        (the harvest builder dedups by the same key); defaults are
   *                        sufficient.
   * - `porb_partner`     — single key `toc_id`. A given TOC partner can legitimately
   *                        appear under multiple AOWs (existingPartnerByKey is keyed by
   *                        `toc_id::porb_aow_id`), so the same toc_id may reference
   *                        several rows. Defaults restore all of them, which is the
   *                        intended behavior — partners share one TOC identity.
   * - `porb_bilateral`   — composite key `toc_id::center_id`. Unique by construction.
   * - `porb_melia`       — composite key `toc_id::center_id::porb_aow_id`. PRONE TO
   *                        DUPLICATES — the prior cron deduped by `melia_name`, so the
   *                        same study under a renamed title produced extra rows. The
   *                        MELIA caller passes `groupKeyOf` + `pickCanonical` so only
   *                        the canonical row in each duplicate group is restored;
   *                        non-canonical rows stay (or become) `toc_is_deleted = 1`.
   *                        Canonical rule: highest melia_budget → longest non-empty
   *                        melia_assumption → most recent updated_at → lowest id.
   * - `porb_synergy`     — single key `toc_id`. Unique within a program by construction.
   * - `porb_outcome`     — single key `toc_id`. Unique within a program by construction.
   *
   * Net per cron tick (with overrides applied where natural duplicates exist):
   *   Canonical row of each live group → `toc_is_deleted = 0`
   *   Non-canonical rows of each live group → `toc_is_deleted = 1`
   *   Rows whose toc_id is gone from TOC → `toc_is_deleted = 1` (regardless of group)
   */
  private async syncTocDeletedFlags<T extends { id: number; toc_id: string; toc_is_deleted?: boolean; center_id?: number }>(
    repository: Repository<any>,
    existingRows: T[],
    currentTocIds: Set<string>,
    useCompositeKey: boolean | ((row: T) => string) = false,
    groupKeyOf?: (row: T) => string,
    pickCanonical?: (rows: T[]) => T,
  ) {
    // Resolve the key used to look up each row in `currentTocIds` (the set of keys
    // present in the latest TOC response).
    let keyFn: (row: T) => string;
    if (typeof useCompositeKey === 'function') {
      keyFn = useCompositeKey;
    } else if (useCompositeKey === true) {
      keyFn = (row) => `${String(row.toc_id)}::${Number(row.center_id)}`;
    } else {
      keyFn = (row) => String(row.toc_id);
    }

    // Default canonical-grouping: every row is its own group (no dedup), and the
    // single member is the canonical. This preserves the historical behavior for
    // callers that don't pass overrides.
    const defaultGroupKeyOf = (row: T) => String(row.id);
    const defaultPickCanonical = (rows: T[]): T => {
      // Most recent updated_at → lowest id.
      return rows.reduce((best, r) => {
        const bUpdated = (best as any).updated_at ? new Date((best as any).updated_at).getTime() : 0;
        const rUpdated = (r as any).updated_at ? new Date((r as any).updated_at).getTime() : 0;
        if (rUpdated !== bUpdated) return rUpdated > bUpdated ? r : best;
        return Number(r.id) < Number(best.id) ? r : best;
      });
    };
    const groupKey = groupKeyOf ?? defaultGroupKeyOf;
    const pick = pickCanonical ?? defaultPickCanonical;

    // Partition rows by whether their TOC key is still present in the latest TOC.
    const liveRows: T[] = [];
    const goneRows: T[] = [];
    for (const row of existingRows) {
      if (currentTocIds.has(keyFn(row))) {
        liveRows.push(row);
      } else {
        goneRows.push(row);
      }
    }

    // Group live rows by the caller-supplied groupKeyOf and pick a single canonical
    // per group. Only the canonical is eligible to be restored; the rest stay flagged.
    const liveGroups = new Map<string, T[]>();
    for (const row of liveRows) {
      const k = groupKey(row);
      const arr = liveGroups.get(k);
      if (arr) arr.push(row);
      else liveGroups.set(k, [row]);
    }

    const idsToRestore: number[] = [];
    const idsToFlag: number[] = [];

    for (const [, group] of liveGroups) {
      const canonical = pick(group);
      for (const row of group) {
        if (row.id === canonical.id) {
          if (row.toc_is_deleted) idsToRestore.push(row.id);
        } else {
          // Non-canonical duplicate inside a live group — flag (or keep flagged).
          if (!row.toc_is_deleted) idsToFlag.push(row.id);
        }
      }
    }

    // Rows whose TOC key is gone always get flagged.
    for (const row of goneRows) {
      if (!row.toc_is_deleted) idsToFlag.push(row.id);
    }

    if (idsToFlag.length) {
      await repository.update({ id: In(idsToFlag) }, { toc_is_deleted: true });
    }
    if (idsToRestore.length) {
      await repository.update({ id: In(idsToRestore) }, { toc_is_deleted: false });
    }
  }

  async getSummaryAowDetail(program_id: number, porb_aow_id: number) {
    const [hlos, partners, melia, bilateral, contractedPartners, selectedAow] = await Promise.all([
      this.getHlos(program_id, porb_aow_id),
      this.getPartners(program_id, porb_aow_id),
      this.getMelia(program_id, porb_aow_id),
      this.getBilaterals(program_id, porb_aow_id),
      this.porbContractedPartnerRepository.find({
        where: { program_id, porb_aow_id },
        relations: ['porb_partner', 'center'],
      }),
      this.porbAowRepository.findOne({ where: { id: porb_aow_id, program_id } }),
    ]);

    // Resolve center names for all rows
    const allCenterIds = new Set<number>();
    for (const row of [...hlos, ...melia, ...bilateral]) {
      if (row.center_id != null) allCenterIds.add(Number(row.center_id));
    }
    const centerEntities = allCenterIds.size
      ? await this.organizationRepo.find({ where: { code: In([...allCenterIds].map(String)) } })
      : [];
    const centerNameMap = new Map<number, string>();
    centerEntities.forEach((c) => centerNameMap.set(Number(c.code), c.name));

    // Enrich rows with center_name
    for (const row of hlos) {
      (row as any).center_name = centerNameMap.get(Number(row.center_id)) || '';
    }
    for (const row of melia) {
      (row as any).center_name = centerNameMap.get(Number(row.center_id)) || '';
    }
    for (const row of bilateral) {
      (row as any).center_name = centerNameMap.get(Number(row.center_id)) || '';
    }

    // Resolve country codes to names for contracted partners
    const allCountryCodes = [
      ...new Set(
        contractedPartners.flatMap((cp) => this.parseCountryCodes(cp.countries)),
      ),
    ];
    const countryEntities = allCountryCodes.length
      ? await this.clarisaCountryRepository.find({ where: { code: In(allCountryCodes) } })
      : [];
    const countryNameMap = new Map<number, string>();
    countryEntities.forEach((c) => countryNameMap.set(Number(c.code), c.name));

    const contractedPartnersFormatted = contractedPartners.map((cp) => {
      const codes = this.parseCountryCodes(cp.countries);
      const countryNames = codes.map((code) => countryNameMap.get(code)).filter(Boolean);
      return {
        id: cp.id,
        porb_partner_id: cp.porb_partner_id,
        partner_name: cp.porb_partner?.partner_name || '',
        center_id: cp.center_id,
        center_name: cp.center?.name || '',
        countries: countryNames.join(', '),
        budget: cp.budget,
        assumption: cp.assumption || '',
      };
    });

    // Cross-cutting only applies to AOW00
    let cross: any[] = [];
    const isAow00 = String(selectedAow?.aow_acrnum || '').toUpperCase() === 'AOW00';
    if (isAow00) {
      const standardItems = await this.standerdCrossCuttingRepository.find({ order: { id: 'ASC' } });
      if (standardItems.length) {
        const standardIds = standardItems.map((item) => item.id);
        const savedRows = await this.porbCrossRepository.find({
          where: { program_id, porb_aow_id, standerd_cross_cutting_id: In(standardIds) },
        });
        // Aggregate budgets per standerd_cross_cutting_id across all centers
        const budgetMap = new Map<number, number>();
        for (const row of savedRows) {
          if (row.standerd_cross_cutting_id != null) {
            const key = row.standerd_cross_cutting_id;
            budgetMap.set(key, (budgetMap.get(key) || 0) + (Number(row.budget) || 0));
          }
        }
        cross = standardItems.map((item) => ({
          standerd_cross_cutting_id: item.id,
          title: item.name || '',
          budget: budgetMap.get(item.id) || 0,
        }));
      }
    }

    const subtotals = {
      hlo: hlos.reduce((sum, row) => sum + (Number(row?.hlo_budget) || 0), 0),
      partners: contractedPartnersFormatted.reduce(
        (sum, row) => sum + (Number(row?.budget) || 0),
        0,
      ),
      melia: melia.reduce(
        (sum, row) => sum + (Number(row?.melia_budget) || 0),
        0,
      ),
      bilateral: bilateral.reduce(
        (sum, row) => sum + (Number(row?.bilateral_budget) || 0),
        0,
      ),
      cross: cross.reduce(
        (sum, row) => sum + (Number(row?.budget) || 0),
        0,
      ),
    };

    // Country percentage rows for this AOW (with computed budgets)
    const cpRows = await this.porbCountryPercentageRepository.find({
      where: { program_id, porb_aow_id },
    });
    // Compute pooled total per center for this AOW: HLO + Cross-cutting budgets
    const pooledByCenter = new Map<number, number>();
    for (const h of hlos) {
      pooledByCenter.set(Number(h.center_id), (pooledByCenter.get(Number(h.center_id)) || 0) + (Number(h.hlo_budget) || 0));
    }
    if (isAow00) {
      const allCrossRows = await this.porbCrossRepository.find({ where: { program_id, porb_aow_id } });
      for (const c of allCrossRows) {
        pooledByCenter.set(Number(c.center_id), (pooledByCenter.get(Number(c.center_id)) || 0) + (Number(c.budget) || 0));
      }
    }
    // Compute total pooled funding for this AOW (across all centers)
    let aowPooledTotal = 0;
    for (const val of pooledByCenter.values()) {
      aowPooledTotal += val;
    }

    // Aggregate budgets by country, then recalculate percentage against AOW total pooled
    const countryBudgetMap = new Map<string, number>();
    for (const row of cpRows) {
      const pooled = pooledByCenter.get(Number(row.center_id)) || 0;
      const budget = Math.round(((Number(row.percentage) || 0) * pooled) / 100);
      countryBudgetMap.set(row.country_name, (countryBudgetMap.get(row.country_name) || 0) + budget);
    }
    const countryPercentage = Array.from(countryBudgetMap.entries())
      .map(([country_name, budget]) => ({
        country_name,
        percentage: aowPooledTotal > 0
          ? Math.round((budget / aowPooledTotal) * 10000) / 100
          : 0,
        budget,
      }))
      .sort((a, b) => a.country_name.localeCompare(b.country_name));
    const countryPercentageCount = cpRows.length;

    const [synergies, outcomes] = await Promise.all([
      this.porbSynergyRepository.find({
        where: { program_id, porb_aow_id, toc_is_deleted: false },
      }),
      this.porbOutcomeRepository.find({
        where: { program_id, porb_aow_id, toc_is_deleted: false },
      }),
    ]);

    // Location benefit rows for this AOW (with computed budgets aggregated across centers)
    const lbRows = await this.porbLocationBenefitRepository.find({
      where: { program_id, porb_aow_id },
    });
    const lbBudgetMap = new Map<string, { budget: number; type: string }>();
    for (const row of lbRows) {
      const pooled = pooledByCenter.get(Number(row.center_id)) || 0;
      const budget = Math.round(((Number(row.percentage) || 0) * pooled) / 100);
      const key = `${row.location_type}::${row.location_name}`;
      const existing = lbBudgetMap.get(key);
      lbBudgetMap.set(key, { budget: (existing?.budget || 0) + budget, type: row.location_type });
    }
    const locationBenefit = Array.from(lbBudgetMap.entries())
      .map(([key, { budget, type }]) => ({
        location_name: key.substring(key.indexOf('::') + 2),
        location_type: type,
        percentage: aowPooledTotal > 0 ? Math.round((budget / aowPooledTotal) * 10000) / 100 : 0,
        budget,
      }))
      .sort((a, b) => {
        const typeOrder = { global: 0, region: 1, country: 2 };
        const ta = typeOrder[a.location_type as keyof typeof typeOrder] ?? 3;
        const tb = typeOrder[b.location_type as keyof typeof typeOrder] ?? 3;
        if (ta !== tb) return ta - tb;
        return a.location_name.localeCompare(b.location_name);
      });
    const locationBenefitCount = lbRows.length;

    return { hlos, partners, contractedPartners: contractedPartnersFormatted, melia, bilateral, cross, isAow00, subtotals, countryPercentageCount, countryPercentage, locationBenefitCount, locationBenefit, synergies, outcomes };
  }

  /**
   * Safely extract a string from a TOC API field that may be a string, an array
   * of result objects (each with .title), or an object. Used for bilateral_outputs
   * where the TOC API returns an array of result objects instead of a plain string.
   */
  private tocStrArray(val: any): string {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) {
      return val
        .map((v) => {
          if (typeof v === 'string') return v;
          if (v && typeof v === 'object') return v.title || v.name || v.value || v.description || '';
          return '';
        })
        .filter(Boolean)
        .join(', ');
    }
    if (typeof val === 'object') {
      return String(val.title || val.name || val.value || '');
    }
    return String(val);
  }

  async importTocToPorbTables(programId: number, officialCode: string, tocDataOverride?: any, setTocTimestamps = true) {
    const CROSS_AOW_TOC_ID = '00000000-0000-0000-0000-000000000000';
    const activePhase =
      await this.submissionService.PhasesService.findActivePhase();
    const toc = tocDataOverride || await this.getTocs(officialCode);
    const results: any[] = Array.isArray(toc?.results) ? toc.results : [];

    if (!results.length) {
      throw new BadRequestException('No TOC results found to import.');
    }

    const aowSource: any[] =
      Array.isArray(toc?.aows) && toc.aows.length
        ? toc.aows
        : results.filter((item: any) => item?.category === 'WP' && !item?.group);

    const aowRows = aowSource
      .map((item: any) => {
        const tocId = item?.related_node_id || item?.id || item?.result_uuid;
        if (!tocId) {
          return null;
        }
        return {
          program_id: programId,
          toc_id: String(tocId),
          aow_name: item?.ost_wp?.name || item?.title || 'AOW',
          aow_acrnum: item?.ost_wp?.acronym || '',
        };
      })
      .filter(Boolean);

    const hasCrossAow = aowRows.some(
      (row: any) => String(row?.aow_acrnum || '').trim().toUpperCase() === 'AOW00',
    );
    if (!hasCrossAow) {
      aowRows.push({
        program_id: programId,
        toc_id: CROSS_AOW_TOC_ID,
        aow_name: 'Cross Cutting',
        aow_acrnum: 'AOW00',
      });
    }

    if (!aowRows.length) {
      throw new BadRequestException('No AOW (WP) rows found in TOC data.');
    }

    const existingAows = await this.porbAowRepository.find({
      where: { program_id: programId },
    });
    const existingAowByTocId = new Map<string, PorbAow>();
    existingAows.forEach((row) => existingAowByTocId.set(String(row.toc_id), row));
    const existingCrossAow = existingAows.find(
      (row) => String(row?.aow_acrnum || '').trim().toUpperCase() === 'AOW00',
    );
    const hasExistingCrossAow = !!existingCrossAow;
    if (existingCrossAow && String(existingCrossAow.toc_id) !== CROSS_AOW_TOC_ID) {
      await this.porbAowRepository.update(existingCrossAow.id, { toc_id: CROSS_AOW_TOC_ID });
      existingCrossAow.toc_id = CROSS_AOW_TOC_ID;
      existingAowByTocId.set(CROSS_AOW_TOC_ID, existingCrossAow);
    }

    const newAowRows = aowRows.filter((row: any) => {
      if (existingAowByTocId.has(String(row.toc_id))) {
        return false;
      }
      if (
        hasExistingCrossAow &&
        String(row?.aow_acrnum || '').trim().toUpperCase() === 'AOW00'
      ) {
        return false;
      }
      return true;
    });
    // Update existing AOW metadata if changed
    for (const row of aowRows) {
      const existing = existingAowByTocId.get(String(row.toc_id));
      if (!existing) continue;
      const changes: any = {};
      if ((row.aow_name || '') !== (existing.aow_name || '')) changes.aow_name = row.aow_name;
      if ((row.aow_acrnum || '') !== (existing.aow_acrnum || '')) changes.aow_acrnum = row.aow_acrnum;
      if (Object.keys(changes).length) {
        if (setTocTimestamps) changes.toc_updated_at = new Date();
        await this.porbAowRepository.update(existing.id, changes);
      }
    }
    if (setTocTimestamps) {
      newAowRows.forEach(r => {
        (r as any).toc_updated_at = new Date();
        (r as any).toc_created_at = new Date();
      });
    }
    const savedAows = newAowRows.length ? await this.porbAowRepository.save(newAowRows) : [];
    const allAows = [...existingAows, ...savedAows];

    const aowByTocId = new Map<string, PorbAow>();
    for (const aow of allAows) {
      aowByTocId.set(String(aow.toc_id), aow);
    }
    const crossAow =
      allAows.find(
        (row) => String(row?.aow_acrnum || '').trim().toUpperCase() === 'AOW00',
      ) || null;
    const resolveParentAow = (...tocRefs: any[]): PorbAow | null => {
      for (const tocRef of tocRefs) {
        const key = String(tocRef || '').trim();
        if (!key) {
          continue;
        }
        const found = aowByTocId.get(key);
        if (found) {
          return found;
        }
      }
      return crossAow;
    };
    await this.syncTocDeletedFlags(
      this.porbAowRepository,
      existingAows as any,
      new Set(aowRows.map((row: any) => String(row.toc_id))),
    );

    // Pre-load valid organization codes to skip unknown centers
    const validOrgs = await this.organizationRepo.find({ select: ['code'] });
    const validCenterIds = new Set(validOrgs.map((o) => Number(o.code)));
    const skippedCenterIds = new Set<number>();

    const outputNodes = results.filter((item: any) => item?.category === 'OUTPUT');
    const hloRows: any[] = [];
    const hloRowByKey = new Map<string, any>();
    // Composite key: `output_id::indicator_id::center_id`. The same indicator
    // can appear under multiple OUTPUTs in TOC, so the key MUST include the
    // output id to avoid silently dropping rows that share an indicator.
    const buildHloKey = (outputId: any, tocId: any, centerId: any) =>
      `${String(outputId || '')}::${String(tocId || '')}::${Number(centerId)}`;
    for (const item of outputNodes) {
      const parentAow = resolveParentAow(item?.group, item?.parent_id);
      const outputId = String(item?.id || '');
      for (const indicator of item?.quantitative_indicators || []) {
        for (const target of indicator?.targets || []) {
          // A center can appear in multiple `targets[]` (and even multiple times
          // within one target.centers[]) for the same indicator — each occurrence
          // contributes to the year's target. Sum the numeric value once per
          // (target × center) occurrence; mirrors the OUTCOME path below.
          const rawTarget = target?.[activePhase.reportingYear];
          const targetNum = parseFloat(rawTarget);
          const targetIsNumber = !isNaN(targetNum);
          for (const center of target?.centers || []) {
            const centerId = Number(center?.code);
            if (!Number.isFinite(centerId)) {
              continue;
            }
            if (!validCenterIds.has(centerId)) {
              skippedCenterIds.add(centerId);
              continue;
            }
            const hloKey = buildHloKey(outputId, indicator?.id, centerId);
            const existingInMemory = hloRowByKey.get(hloKey);
            if (existingInMemory) {
              if (targetIsNumber) {
                const prev = Number(existingInMemory.hlo_target);
                existingInMemory.hlo_target = (isNaN(prev) ? 0 : prev) + targetNum;
              }
              continue;
            }
            const newRow = this.porbHloRepository.create({
              program_id: programId,
              porb_aow_id: parentAow?.id ?? null,
              toc_id: String(indicator?.id || ''),
              output_id: outputId || null,
              center_id: centerId,
              hlo_name: item?.title || '',
              hlo_description: indicator?.description || '',
              hlo_type: indicator?.type?.value || 'others',
              hlo_geo: this.deriveHloGeo(item, indicator),
              hlo_target: targetIsNumber ? targetNum : null,
              hlo_budget: 0,
              hlo_assumption: '',
              toc_is_deleted: false,
            });
            hloRowByKey.set(hloKey, newRow);
            hloRows.push(newRow);
          }
        }
      }
    }

    const existingHlos = await this.porbHloRepository.find({
      where: { program_id: programId },
    });
    // Existing rows may not have output_id yet (pre-backfill); use a fallback
    // 2-part key for those so the import still treats them as the same row.
    // After backfill, every row has output_id and the 3-part key is canonical.
    const existingHloByKey = new Map<string, PorbHlo>();
    existingHlos.forEach((row) => {
      const fullKey = buildHloKey(row.output_id, row.toc_id, row.center_id);
      existingHloByKey.set(fullKey, row);
      if (!row.output_id) {
        const legacyKey = `legacy::${String(row.toc_id)}::${Number(row.center_id)}`;
        if (!existingHloByKey.has(legacyKey)) {
          existingHloByKey.set(legacyKey, row);
        }
      }
    });
    const newHloRows: any[] = [];
    const hloUpdates: Array<{ id: number; changes: any }> = [];
    for (const row of hloRows) {
      const key = buildHloKey(row.output_id, row.toc_id, row.center_id);
      let existing = existingHloByKey.get(key);
      // Fallback: pre-backfill rows have no output_id. Match on (toc_id, center_id, hlo_name)
      // to claim the existing row and stamp output_id on it. Title match is what makes
      // the claim unambiguous when multiple outputs share an indicator.
      if (!existing) {
        const legacyKey = `legacy::${String(row.toc_id)}::${Number(row.center_id)}`;
        const candidate = existingHloByKey.get(legacyKey);
        if (
          candidate &&
          !candidate.output_id &&
          (candidate.hlo_name || '') === (row.hlo_name || '')
        ) {
          existing = candidate;
          // Remove the legacy entry so a second output sharing this indicator
          // doesn't also claim the same existing row.
          existingHloByKey.delete(legacyKey);
        }
      }
      if (!existing) {
        newHloRows.push(row);
        continue;
      }
      const changes: any = {};
      if (Number(existing.porb_aow_id || 0) !== Number(row.porb_aow_id || 0)) changes.porb_aow_id = row.porb_aow_id;
      if ((existing.output_id || '') !== (row.output_id || '')) changes.output_id = row.output_id;
      if ((existing.hlo_name || '') !== (row.hlo_name || '')) changes.hlo_name = row.hlo_name;
      if ((existing.hlo_description || '') !== (row.hlo_description || '')) changes.hlo_description = row.hlo_description;
      if ((existing.hlo_type || '') !== (row.hlo_type || '')) changes.hlo_type = row.hlo_type;
      if ((existing.hlo_geo || '') !== (row.hlo_geo || '')) changes.hlo_geo = row.hlo_geo;
      if (String(existing.hlo_target || '') !== String(row.hlo_target || '')) changes.hlo_target = row.hlo_target;
      if (Object.keys(changes).length) {
        if (setTocTimestamps) changes.toc_updated_at = new Date();
        hloUpdates.push({ id: existing.id, changes });
      }
    }
    if (hloUpdates.length) {
      await Promise.all(
        hloUpdates.map((item) => this.porbHloRepository.update(item.id, item.changes)),
      );
    }
    if (setTocTimestamps) {
      newHloRows.forEach(r => {
        r.toc_updated_at = new Date();
        r.toc_created_at = new Date();
      });
    }
    const savedHlos = newHloRows.length ? await this.porbHloRepository.save(newHloRows) : [];
    // Re-fetch existing rows so the deleted-flag sync sees the output_id values
    // we just stamped via the import UPDATE branch above (and any newly saved
    // rows). Without this, in-memory `existingHlos` still has the pre-update
    // (often NULL) output_id values, which would cause keyFn to mismatch the
    // live-key Set and flag valid rows as toc_is_deleted.
    const refreshedHlos = await this.porbHloRepository.find({
      where: { program_id: programId },
    });
    // syncTocDeletedFlags: identify live HLOs by full composite key. Pre-backfill
    // rows that still have NULL output_id won't match — they'll be flagged as
    // deleted, which is correct (run the admin backfill first to stamp them).
    // Pass the keyFn as the 4th arg (the `useCompositeKey` slot accepts a
    // function override).
    const hloKeyFn = (row: any) =>
      buildHloKey(row.output_id, row.toc_id, row.center_id);
    const liveKeys = new Set(hloRows.map(hloKeyFn));
    await this.syncTocDeletedFlags(
      this.porbHloRepository,
      refreshedHlos as any,
      liveKeys,
      hloKeyFn,
    );

    const partnerNodes = results.filter((item: any) => item?.category === 'partners');
    const partnerRows = partnerNodes.map((item: any) => {
      const parentAow = resolveParentAow(item?.parent_id, item?.group);
      return this.porbPartnerRepository.create({
        program_id: programId,
        porb_aow_id: parentAow?.id ?? null,
        toc_id: String(item?.id || ''),
        partner_name: item?.name || item?.acronym || item?.title || 'Partner',
        partner_outputs: item?.results || '',
        toc_is_deleted: false,
      });
    });
    const existingPartners = await this.porbPartnerRepository.find({
      where: { program_id: programId },
    });
    const existingPartnerByKey = new Map<string, PorbPartner>();
    existingPartners.forEach((row) =>
      existingPartnerByKey.set(`${String(row.toc_id)}::${Number(row.porb_aow_id || 0)}`, row),
    );
    const partnerUpdates: Array<{ id: number; changes: any }> = [];
    for (const row of partnerRows) {
      const existing = existingPartnerByKey.get(`${String(row.toc_id)}::${Number(row.porb_aow_id || 0)}`);
      if (!existing) continue;
      const changes: any = {};
      if ((existing.partner_name || '') !== (row.partner_name || '')) changes.partner_name = row.partner_name;
      if ((existing.partner_outputs || '') !== (row.partner_outputs || '')) changes.partner_outputs = row.partner_outputs;
      if (Object.keys(changes).length) {
        if (setTocTimestamps) changes.toc_updated_at = new Date();
        partnerUpdates.push({ id: existing.id, changes });
      }
    }
    if (partnerUpdates.length) {
      await Promise.all(
        partnerUpdates.map((item) => this.porbPartnerRepository.update(item.id, item.changes)),
      );
    }
    const newPartnerRows = partnerRows.filter(
      (row) => !existingPartnerByKey.has(`${String(row.toc_id)}::${Number(row.porb_aow_id || 0)}`),
    );
    if (setTocTimestamps) {
      newPartnerRows.forEach(r => {
        (r as any).toc_updated_at = new Date();
        (r as any).toc_created_at = new Date();
      });
    }
    const savedPartners = newPartnerRows.length
      ? await this.porbPartnerRepository.save(newPartnerRows)
      : [];
    await this.syncTocDeletedFlags(
      this.porbPartnerRepository,
      existingPartners.filter((p: any) => !p.is_unknown) as any,
      new Set(partnerRows.map((row: any) => String(row.toc_id))),
    );

    const bilateralNodes = results.filter((item: any) => item?.category === 'Project');
    const bilateralRowKeySet = new Set<string>();
    const bilateralRows = bilateralNodes.map((item: any) => {
      const parentAow = resolveParentAow(item?.parent_id, item?.group);
      const centerId = Number(item?.center?.code);
      if (!Number.isFinite(centerId)) {
        return null;
      }
      if (!validCenterIds.has(centerId)) {
        skippedCenterIds.add(centerId);
        return null;
      }
      const bilateralKey = `${String(item?.id || '')}::${centerId}`;
      if (bilateralRowKeySet.has(bilateralKey)) {
        return null;
      }
      bilateralRowKeySet.add(bilateralKey);
      return this.porbBilateralRepository.create({
        program_id: programId,
        porb_aow_id: parentAow?.id ?? null,
        toc_id: String(item?.id || ''),
        center_id: centerId,
        bilateral_name: item?.title,
        bilateral_outputs: this.tocStrArray(item?.result) || this.tocStrArray(item?.results) || '',
        bilateral_budget: 0,
        bilateral_assumption: '',
        toc_is_deleted: false,
      });
    });
    const validBilateralRows = bilateralRows.filter(Boolean);
    const existingBilaterals = await this.porbBilateralRepository.find({
      where: { program_id: programId },
    });
    const existingBilateralByKey = new Map<string, PorbBilateral>();
    existingBilaterals.forEach((row) =>
      existingBilateralByKey.set(`${String(row.toc_id)}::${Number(row.center_id)}`, row),
    );
    const existingBilateralKeys = new Set(
      existingBilaterals.map((row) => `${String(row.toc_id)}::${Number(row.center_id)}`),
    );
    const bilateralUpdates: Array<{ id: number; changes: any }> = [];
    for (const row of validBilateralRows) {
      const key = `${String(row.toc_id)}::${Number(row.center_id)}`;
      const existing = existingBilateralByKey.get(key);
      if (!existing) continue;
      const changes: any = {};
      if (Number(existing.porb_aow_id || 0) !== Number(row.porb_aow_id || 0)) changes.porb_aow_id = row.porb_aow_id;
      if ((existing.bilateral_name || '') !== (row.bilateral_name || '')) changes.bilateral_name = row.bilateral_name;
      if ((existing.bilateral_outputs || '') !== (row.bilateral_outputs || '')) changes.bilateral_outputs = row.bilateral_outputs;
      if (Object.keys(changes).length) {
        if (setTocTimestamps) changes.toc_updated_at = new Date();
        bilateralUpdates.push({ id: existing.id, changes });
      }
    }
    if (bilateralUpdates.length) {
      await Promise.all(
        bilateralUpdates.map((item) => this.porbBilateralRepository.update(item.id, item.changes)),
      );
    }
    const newBilateralRows = validBilateralRows.filter(
      (row) => !existingBilateralKeys.has(`${String(row.toc_id)}::${Number(row.center_id)}`),
    );
    if (setTocTimestamps) {
      newBilateralRows.forEach(r => {
        (r as any).toc_updated_at = new Date();
        (r as any).toc_created_at = new Date();
      });
    }
    const savedBilaterals = newBilateralRows.length
      ? await this.porbBilateralRepository.save(newBilateralRows)
      : [];
    await this.syncTocDeletedFlags(
      this.porbBilateralRepository,
      existingBilaterals as any,
      new Set(validBilateralRows.map((row: any) => `${String(row.toc_id)}::${Number(row.center_id)}`)),
      true,
    );

    const meliaNodes = results.filter((item: any) => item?.category === 'Melia');
    const meliaRows: any[] = [];
    const meliaRowKeySet = new Set<string>();
    for (const item of meliaNodes) {
      const leadCenterId = Number(item?.center?.code);
      // Collect lead + partner centers. Partners come from `item.partners[]`
      // (CLARISA institutions); only those whose `code` matches a CGIAR center
      // in our org table are kept — non-CGIAR partners (e.g., ILRI partners
      // that aren't centers) are silently dropped.
      const centerIds = new Set<number>();
      if (Number.isFinite(leadCenterId)) {
        if (validCenterIds.has(leadCenterId)) {
          centerIds.add(leadCenterId);
        } else {
          skippedCenterIds.add(leadCenterId);
        }
      }
      for (const partner of item?.partners || []) {
        const partnerCode = Number(partner?.code);
        if (!Number.isFinite(partnerCode)) continue;
        if (validCenterIds.has(partnerCode)) {
          centerIds.add(partnerCode);
        }
      }
      if (!centerIds.size) {
        continue;
      }
      const groupKeys = new Set<string>();
      let hasEmptyGroup = false;
      const meliaResults = Array.isArray(item?.results) ? item.results : [];
      for (const resultItem of meliaResults) {
        const rawGroup =
          resultItem?.group?.related_node_id ??
          resultItem?.group?.id ??
          resultItem?.group;
        const groupKey = String(rawGroup ?? '').trim();
        if (groupKey) {
          groupKeys.add(groupKey);
        } else {
          hasEmptyGroup = true;
        }
      }

      if (!groupKeys.size) {
        const fallbackGroup = String(item?.parent_id || item?.group || '').trim();
        if (fallbackGroup) {
          groupKeys.add(fallbackGroup);
        }
      }

      const targetAows = new Map<number, PorbAow>();
      for (const groupKey of groupKeys) {
        const parentAow = resolveParentAow(groupKey);
        if (parentAow?.id != null) {
          targetAows.set(Number(parentAow.id), parentAow);
        }
      }

      if (!targetAows.size && crossAow?.id != null) {
        targetAows.set(Number(crossAow.id), crossAow);
      }

      if (hasEmptyGroup && crossAow?.id != null) {
        targetAows.set(Number(crossAow.id), crossAow);
      }

      if (targetAows.size > 1 && crossAow?.id != null) {
        targetAows.set(Number(crossAow.id), crossAow);
      }

      for (const [, targetAow] of targetAows) {
        for (const centerId of centerIds) {
          const meliaName = item?.title || item?.name || 'Melia';
          const tocId = String(item?.id || '');
          // Dedup by toc_id when available (stable identifier across TOC title renames).
          // Fall back to name-based key only for legacy rows without a toc_id, so empty
          // toc_ids don't all collide on a single shared key.
          const key = tocId
            ? `${tocId}::${centerId}::${Number(targetAow?.id || 0)}`
            : `${meliaName}::${centerId}::${Number(targetAow?.id || 0)}`;
          if (meliaRowKeySet.has(key)) {
            continue;
          }
          meliaRowKeySet.add(key);
          meliaRows.push(
            this.porbMeliaRepository.create({
              program_id: programId,
              porb_aow_id: targetAow?.id ?? null,
              toc_id: tocId,
              center_id: centerId,
              melia_name: meliaName,
              melia_outputs: this.stripHtml(item?.supported_outcome || ''),
              melia_budget: 0,
              melia_assumption: '',
              toc_is_deleted: false,
            }),
          );
        }
      }
    }
    const validMeliaRows = meliaRows.filter(Boolean);
    const existingMeliaRows = await this.porbMeliaRepository.find({
      where: { program_id: programId },
    });
    // Build the canonical existing-by-key map. Multiple existing rows may share the
    // same (toc_id, center, aow) key because of the prior name-based dedup bug.
    // For each key, pick the row most likely to hold real user data:
    //   1. highest melia_budget
    //   2. then most recent updated_at
    //   3. then lowest id (oldest, to keep a stable choice)
    // The cleanup SQL collapses the remaining duplicates after deployment.
    const meliaKeyOf = (row: PorbMelia): string => {
      const tocId = String(row.toc_id || '');
      return tocId
        ? `${tocId}::${Number(row.center_id)}::${Number(row.porb_aow_id || 0)}`
        : `${String(row.melia_name)}::${Number(row.center_id)}::${Number(row.porb_aow_id || 0)}`;
    };
    const meliaRowIsBetter = (candidate: PorbMelia, current: PorbMelia): boolean => {
      const candBudget = Number(candidate.melia_budget || 0);
      const currBudget = Number(current.melia_budget || 0);
      if (candBudget !== currBudget) return candBudget > currBudget;
      const candUpdated = candidate.updated_at ? new Date(candidate.updated_at).getTime() : 0;
      const currUpdated = current.updated_at ? new Date(current.updated_at).getTime() : 0;
      if (candUpdated !== currUpdated) return candUpdated > currUpdated;
      return Number(candidate.id) < Number(current.id);
    };
    const existingMeliaByKey = new Map<string, PorbMelia>();
    existingMeliaRows.forEach((row) => {
      const key = meliaKeyOf(row);
      const current = existingMeliaByKey.get(key);
      if (!current || meliaRowIsBetter(row, current)) {
        existingMeliaByKey.set(key, row);
      }
    });
    const existingMeliaKeys = new Set(existingMeliaByKey.keys());
    const meliaUpdates: Array<{ id: number; changes: any }> = [];
    for (const row of validMeliaRows) {
      const tocId = String(row.toc_id || '');
      const key = tocId
        ? `${tocId}::${Number(row.center_id)}::${Number(row.porb_aow_id || 0)}`
        : `${String(row.melia_name)}::${Number(row.center_id)}::${Number(row.porb_aow_id || 0)}`;
      const existing = existingMeliaByKey.get(key);
      if (!existing) continue;
      const changes: any = {};
      if (Number(existing.porb_aow_id || 0) !== Number(row.porb_aow_id || 0)) changes.porb_aow_id = row.porb_aow_id;
      if ((existing.melia_name || '') !== (row.melia_name || '')) changes.melia_name = row.melia_name;
      if ((existing.melia_outputs || '') !== (row.melia_outputs || '')) changes.melia_outputs = row.melia_outputs;
      if ((existing.toc_id || '') !== (row.toc_id || '')) changes.toc_id = row.toc_id;
      if (Object.keys(changes).length) {
        if (setTocTimestamps) changes.toc_updated_at = new Date();
        meliaUpdates.push({ id: existing.id, changes });
      }
    }
    if (meliaUpdates.length) {
      await Promise.all(
        meliaUpdates.map((item) => this.porbMeliaRepository.update(item.id, item.changes)),
      );
    }
    const newMeliaRows = validMeliaRows.filter((row) => {
      const tocId = String(row.toc_id || '');
      const key = tocId
        ? `${tocId}::${Number(row.center_id)}::${Number(row.porb_aow_id || 0)}`
        : `${String(row.melia_name)}::${Number(row.center_id)}::${Number(row.porb_aow_id || 0)}`;
      return !existingMeliaKeys.has(key);
    });
    if (setTocTimestamps) {
      newMeliaRows.forEach(r => {
        (r as any).toc_updated_at = new Date();
        (r as any).toc_created_at = new Date();
      });
    }
    const savedMelias = newMeliaRows.length ? await this.porbMeliaRepository.save(newMeliaRows) : [];
    // MELIA can have natural duplicates per `toc_id::center_id::porb_aow_id` because
    // the prior cron deduped by name. Pass dedup-aware callbacks so only the canonical
    // row in each group is restored — non-canonical duplicates stay flagged
    // (`toc_is_deleted = 1`) so the UI's "Deleted" badge surfaces them as unreliable.
    // Canonical rule MUST match the cleanup SQL keeper rule:
    //   highest melia_budget → longest non-empty melia_assumption →
    //   most recent updated_at → lowest id.
    await this.syncTocDeletedFlags<PorbMelia>(
      this.porbMeliaRepository,
      existingMeliaRows as any,
      new Set(validMeliaRows.map((row: any) => meliaKeyOf(row as PorbMelia))),
      (row) => meliaKeyOf(row),
      (row) => meliaKeyOf(row),
      (rows) => rows.reduce((best, r) => (meliaRowIsBetter(r, best) ? r : best)),
    );

    // ── Synergy Programs ──
    const synergyNodes = results.filter((item: any) => item?.category === 'synergy-programs');
    const synergyRows: any[] = [];
    const synergyRowKeySet = new Set<string>();
    for (const item of synergyNodes) {
      const tocId = String(item?.id || item?.related_node_id || '');
      if (!tocId || synergyRowKeySet.has(tocId)) continue;
      synergyRowKeySet.add(tocId);
      const parentAow = resolveParentAow(item?.wp?.id, item?.parent_id);
      synergyRows.push(
        this.porbSynergyRepository.create({
          program_id: programId,
          porb_aow_id: parentAow?.id ?? null,
          toc_id: tocId,
          synergy_program_name: item?.flow?.title || '',
          synergy_hlo_title: item?.result?.title || '',
          synergy_description: item?.description || '',
          toc_is_deleted: false,
        }),
      );
    }
    const existingSynergies = await this.porbSynergyRepository.find({
      where: { program_id: programId },
    });
    const existingSynergyByTocId = new Map<string, PorbSynergy>();
    existingSynergies.forEach((row) => existingSynergyByTocId.set(String(row.toc_id), row));
    const synergyUpdates: Array<{ id: number; changes: any }> = [];
    for (const row of synergyRows) {
      const existing = existingSynergyByTocId.get(String(row.toc_id));
      if (!existing) continue;
      const changes: any = {};
      if (Number(existing.porb_aow_id || 0) !== Number(row.porb_aow_id || 0)) changes.porb_aow_id = row.porb_aow_id;
      if ((existing.synergy_program_name || '') !== (row.synergy_program_name || '')) changes.synergy_program_name = row.synergy_program_name;
      if ((existing.synergy_hlo_title || '') !== (row.synergy_hlo_title || '')) changes.synergy_hlo_title = row.synergy_hlo_title;
      if ((existing.synergy_description || '') !== (row.synergy_description || '')) changes.synergy_description = row.synergy_description;
      if (Object.keys(changes).length) {
        if (setTocTimestamps) changes.toc_updated_at = new Date();
        synergyUpdates.push({ id: existing.id, changes });
      }
    }
    if (synergyUpdates.length) {
      await Promise.all(
        synergyUpdates.map((item) => this.porbSynergyRepository.update(item.id, item.changes)),
      );
    }
    const newSynergyRows = synergyRows.filter(
      (row) => !existingSynergyByTocId.has(String(row.toc_id)),
    );
    if (setTocTimestamps) {
      newSynergyRows.forEach(r => {
        (r as any).toc_updated_at = new Date();
        (r as any).toc_created_at = new Date();
      });
    }
    const savedSynergies = newSynergyRows.length ? await this.porbSynergyRepository.save(newSynergyRows) : [];
    await this.syncTocDeletedFlags(
      this.porbSynergyRepository,
      existingSynergies as any,
      new Set(synergyRows.map((row: any) => String(row.toc_id))),
    );

    // ── Outcomes ──
    const outcomeNodes = results.filter((item: any) => item?.category === 'OUTCOME' || item?.category === 'EOI');
    const outcomeRows: any[] = [];
    const outcomeRowKeySet = new Set<string>();
    for (const item of outcomeNodes) {
      const tocId = String(item?.related_node_id || item?.id || '');
      if (!tocId || outcomeRowKeySet.has(tocId)) continue;
      outcomeRowKeySet.add(tocId);
      const parentAow = resolveParentAow(item?.group, item?.parent_id);

      // Extract indicators
      let outcomeIndicators: any[] | null = null;
      if (item?.quantitative_indicators?.length) {
        outcomeIndicators = [];
        for (const indicator of item.quantitative_indicators) {
          let location = '';
          if (indicator?.location === 'global') {
            location = 'Global';
          } else if (indicator?.location === 'regional') {
            const regionNames = [...(indicator?.regions ?? [])].map((r: any) => r.name).sort();
            location = `Region: ${regionNames.join(', ')}`;
          } else if (indicator?.location === 'country') {
            const countryNames = [...(indicator?.countries ?? [])].map((c: any) => c.name).sort();
            location = `Country: ${countryNames.join(', ')}`;
          }
          let targetValue = 0;
          for (const target of indicator?.targets || []) {
            const val = parseFloat(target[activePhase?.reportingYear]);
            if (!isNaN(val)) targetValue += val;
          }
          outcomeIndicators.push({
            type: indicator?.type?.name || indicator?.type?.value || '',
            description: indicator?.description || '',
            location,
            target_value: targetValue,
          });
        }
        if (!outcomeIndicators.length) outcomeIndicators = null;
      }

      // Extract outcome-level geographic scope
      let outcomeGeo = '';
      if (item?.geo_scope === 'global' || item?.location === 'global') {
        outcomeGeo = 'Global';
      } else if (item?.geo_scope === 'regional' || item?.location === 'regional') {
        const regionNames = [...(item?.regions ?? [])].map((r: any) => r.name).sort();
        outcomeGeo = regionNames.length ? `Region: ${regionNames.join(', ')}` : '';
      } else if (item?.geo_scope === 'country' || item?.location === 'country') {
        const countryNames = [...(item?.countries ?? [])].map((c: any) => c.name).sort();
        outcomeGeo = countryNames.length ? `Country: ${countryNames.join(', ')}` : '';
      }

      // Fallback: derive geo from indicators if outcome-level geo is empty
      if (!outcomeGeo && item?.quantitative_indicators?.length) {
        const geoCountries = new Set<string>();
        const geoRegions = new Set<string>();
        let hasGlobal = false;
        for (const ind of item.quantitative_indicators) {
          if (ind?.location === 'global') {
            hasGlobal = true;
          } else if (ind?.location === 'regional') {
            for (const r of ind?.regions ?? []) if (r?.name) geoRegions.add(r.name);
          } else if (ind?.location === 'country') {
            for (const c of ind?.countries ?? []) if (c?.name) geoCountries.add(c.name);
          }
        }
        const parts: string[] = [];
        if (hasGlobal) parts.push('Global');
        if (geoRegions.size) parts.push(`Region: ${[...geoRegions].sort().join(', ')}`);
        if (geoCountries.size) parts.push(`Country: ${[...geoCountries].sort().join(', ')}`);
        outcomeGeo = parts.join('; ');
      }

      outcomeRows.push(
        this.porbOutcomeRepository.create({
          program_id: programId,
          porb_aow_id: parentAow?.id ?? null,
          toc_id: tocId,
          outcome_title: item?.title || '',
          outcome_type: item?.type_of_outcome?.name || item?.type?.name || '',
          outcome_indicators: outcomeIndicators,
          outcome_geo: outcomeGeo || null,
          toc_is_deleted: false,
        }),
      );
    }
    const existingOutcomes = await this.porbOutcomeRepository.find({
      where: { program_id: programId },
    });
    const existingOutcomeByTocId = new Map<string, PorbOutcome>();
    existingOutcomes.forEach((row) => existingOutcomeByTocId.set(String(row.toc_id), row));
    const outcomeUpdates: Array<{ id: number; changes: any }> = [];
    for (const row of outcomeRows) {
      const existing = existingOutcomeByTocId.get(String(row.toc_id));
      if (!existing) continue;
      const changes: any = {};
      if (Number(existing.porb_aow_id || 0) !== Number(row.porb_aow_id || 0)) changes.porb_aow_id = row.porb_aow_id;
      if ((existing.outcome_title || '') !== (row.outcome_title || '')) changes.outcome_title = row.outcome_title;
      if ((existing.outcome_type || '') !== (row.outcome_type || '')) changes.outcome_type = row.outcome_type;
      const existingIndicatorsJson = JSON.stringify(existing.outcome_indicators || null);
      const newIndicatorsJson = JSON.stringify(row.outcome_indicators || null);
      if (existingIndicatorsJson !== newIndicatorsJson) changes.outcome_indicators = row.outcome_indicators;
      if ((existing.outcome_geo || '') !== (row.outcome_geo || '')) changes.outcome_geo = row.outcome_geo;
      if (Object.keys(changes).length) {
        if (setTocTimestamps) changes.toc_updated_at = new Date();
        outcomeUpdates.push({ id: existing.id, changes });
      }
    }
    if (outcomeUpdates.length) {
      await Promise.all(
        outcomeUpdates.map((item) => this.porbOutcomeRepository.update(item.id, item.changes)),
      );
    }
    const newOutcomeRows = outcomeRows.filter(
      (row) => !existingOutcomeByTocId.has(String(row.toc_id)),
    );
    if (setTocTimestamps) {
      newOutcomeRows.forEach(r => {
        (r as any).toc_updated_at = new Date();
        (r as any).toc_created_at = new Date();
      });
    }
    const savedOutcomes = newOutcomeRows.length ? await this.porbOutcomeRepository.save(newOutcomeRows) : [];
    await this.syncTocDeletedFlags(
      this.porbOutcomeRepository,
      existingOutcomes as any,
      new Set(outcomeRows.map((row: any) => String(row.toc_id))),
    );

    return {
      program_id: programId,
      official_code: officialCode,
      imported: {
        aows: savedAows.length,
        hlos: savedHlos.length,
        partners: savedPartners.length,
        bilaterals: savedBilaterals.length,
        melias: savedMelias.length,
        synergies: savedSynergies.length,
        outcomes: savedOutcomes.length,
      },
      updated: {
        hlos: hloUpdates.length,
        partners: partnerUpdates.length,
        bilaterals: bilateralUpdates.length,
        melias: meliaUpdates.length,
        synergies: synergyUpdates.length,
        outcomes: outcomeUpdates.length,
      },
      skipped_center_ids: skippedCenterIds.size
        ? Array.from(skippedCenterIds)
        : undefined,
    };
  }

  async bulkImportToc(programIds?: number[], reqUser?: { id: number }) {
    let initiatives: Initiative[];
    if (programIds?.length) {
      initiatives = await this.initiativeRepository.find({
        where: { id: In(programIds), archived: false },
      });
    } else {
      initiatives = await this.initiativeRepository.find({
        where: { archived: false },
      });
    }

    const results: Array<{
      program_id: number;
      official_code: string;
      status: 'success' | 'error';
      detail?: any;
      error?: string;
    }> = [];

    for (const initiative of initiatives) {
      try {
        const detail = await this.importTocToPorbTables(
          initiative.id,
          initiative.official_code,
          undefined,
          false,
        );
        results.push({
          program_id: initiative.id,
          official_code: initiative.official_code,
          status: 'success',
          detail,
        });

        await this.logHistory({
          initiative_id: initiative.id,
          user_id: reqUser?.id,
          resource_property: 'System Import (TOC)',
          new_value: `Imported TOC data for ${initiative.official_code}`,
        });
      } catch (err) {
        results.push({
          program_id: initiative.id,
          official_code: initiative.official_code,
          status: 'error',
          error: err?.message || String(err),
        });
      }
    }

    return {
      total: initiatives.length,
      success: results.filter((r) => r.status === 'success').length,
      failed: results.filter((r) => r.status === 'error').length,
      results,
    };
  }

  async migrateOneProgram(initiative: Initiative) {
    const programId = initiative.id;
    const submissionId = initiative.latest_submission_id;
    if (!submissionId) {
      return { program_id: programId, status: 'skipped', reason: 'no submission' };
    }

    const activePhase =
      await this.submissionService.PhasesService.findActivePhase();

    // 1. Load all PORB rows for this program
    const porbHlos = await this.porbHloRepository.find({ where: { program_id: programId } });
    const porbPartners = await this.porbPartnerRepository.find({ where: { program_id: programId } });
    const porbBilaterals = await this.porbBilateralRepository.find({ where: { program_id: programId } });
    const porbMelias = await this.porbMeliaRepository.find({ where: { program_id: programId } });
    const porbCrosses = await this.porbCrossRepository.find({ where: { program_id: programId } });

    // 2. Load old submission data
    const oldResults = await this.resultRepository.find({
      where: { submission_id: submissionId },
    });
    const budgetAssumptions = await this.budgetAssumptionsRepository.find({
      where: { initiative_id: programId, phase_id: activePhase.id },
    });

    // 3. Build lookup maps for budget assumptions
    const baByItemAndCenter = new Map<string, BudgetAssumptions>();
    for (const ba of budgetAssumptions) {
      baByItemAndCenter.set(`${ba.item_id}::${ba.organization_code}`, ba);
    }

    const counts = { hlos: 0, partners: 0, contracted_partners: 0, bilaterals: 0, melias: 0, cross: 0, anaplan: 0 };

    // 2b. Load partner country data for this program/phase
    const partnerCountries = await this.partnerCountryRepository.find({
      where: { initiative_id: programId, phase_id: activePhase.id },
      relations: ['country'],
    });
    // Build lookup: "result_id::center_code" → country codes (numbers)
    const countryCodesByResultAndCenter = new Map<string, number[]>();
    for (const pc of partnerCountries) {
      const key = `${pc.result_id}::${pc.center_code}`;
      const list = countryCodesByResultAndCenter.get(key) || [];
      if (pc.country_code) {
        list.push(Number(pc.country_code));
      }
      countryCodesByResultAndCenter.set(key, list);
    }

    // Shared lookups for AOW mapping (used by HLO, Partner, Bilateral, Melia migrations)
    const allAowsForMigration = await this.porbAowRepository.find({
      where: { program_id: programId },
    });
    const aowAcrnumToId = new Map<string, number>();
    for (const aow of allAowsForMigration) {
      aowAcrnumToId.set(String(aow.aow_acrnum || '').toUpperCase(), aow.id);
    }
    const wpRows = await this.workPackageRepository.find({
      where: { initiative_id: programId },
    });
    const wpIdToOfficialCode = new Map<number, string>();
    for (const wp of wpRows) {
      wpIdToOfficialCode.set(wp.wp_id, wp.wp_official_code);
    }
    const getAowIdFromWpId = (wpId: string): number | null => {
      const upper = String(wpId || '').toUpperCase();
      if (upper.startsWith('CROSS')) {
        return aowAcrnumToId.get('AOW00') ?? null;
      }
      const aowMatch = upper.match(/(AOW\d+)/);
      if (aowMatch) {
        return aowAcrnumToId.get(aowMatch[1]) ?? null;
      }
      return null;
    };

    // 4. Migrate HLOs
    // Reset HLO budgets before re-applying (prevents stale data from previous runs)
    if (porbHlos.length) {
      await this.porbHloRepository
        .createQueryBuilder()
        .update()
        .set({ hlo_budget: 0, hlo_assumption: '' })
        .where('program_id = :programId', { programId })
        .execute();
    }
    const hloResults = oldResults.filter(
      (r) => r.type === 'INDICATOR' && !r.is_project,
    );
    // Build lookup: "toc_id::center_id" → PORB HLO row
    const porbHloByKey = new Map<string, typeof porbHlos[0]>();
    for (const ph of porbHlos) {
      porbHloByKey.set(`${ph.toc_id}::${ph.center_id}`, ph);
    }
    // Track used PORB HLO rows and deduplicate submitted Results
    const usedHloIds = new Set<number>();
    const seenHloResults = new Set<string>();
    for (const result of hloResults) {
      const hloDedupKey = `${result.result_uuid}::${result.organization_code}::${result.wp_id}`;
      if (seenHloResults.has(hloDedupKey)) continue;
      seenHloResults.add(hloDedupKey);

      const tocId = result.result_uuid;
      const centerId = Number(result.organization_code);
      const budget = parseFloat(result.budget) || 0;
      const ba = baByItemAndCenter.get(`${tocId}::${centerId}`);
      const assumption = ba?.budget_assumptions || '';
      if (!budget && !assumption) continue;

      const existingPorb = porbHloByKey.get(`${tocId}::${centerId}`);
      if (existingPorb && !usedHloIds.has(existingPorb.id)) {
        // Update existing row (first match for this indicator+center)
        usedHloIds.add(existingPorb.id);
        const wpOfficialCode = wpIdToOfficialCode.get(Number(result.wp_id));
        const correctAowId = wpOfficialCode ? getAowIdFromWpId(wpOfficialCode) : null;
        await this.porbHloRepository.update(existingPorb.id, {
          hlo_budget: budget,
          hlo_assumption: assumption,
          ...(correctAowId != null ? { porb_aow_id: correctAowId } : {}),
        });
        counts.hlos++;
      } else if (existingPorb) {
        // Same indicator+center under different AOW — create new row
        const wpOfficialCode = wpIdToOfficialCode.get(Number(result.wp_id));
        const correctAowId = wpOfficialCode ? getAowIdFromWpId(wpOfficialCode) : null;
        await this.porbHloRepository.save({
          program_id: programId,
          porb_aow_id: correctAowId ?? existingPorb.porb_aow_id,
          toc_id: tocId,
          center_id: centerId,
          hlo_name: existingPorb.hlo_name,
          hlo_description: existingPorb.hlo_description,
          hlo_type: existingPorb.hlo_type,
          hlo_geo: existingPorb.hlo_geo,
          hlo_target: existingPorb.hlo_target,
          hlo_budget: budget,
          hlo_assumption: assumption,
          toc_is_deleted: false,
        });
        counts.hlos++;
      }
      // If no existing PORB row, skip (indicator not in TOC)
    }

    // 5. Reset & Migrate Partners
    // Clear stale contracted partner rows before re-applying
    await this.porbContractedPartnerRepository
      .createQueryBuilder()
      .delete()
      .from(PorbContractedPartner)
      .where('program_id = :programId', { programId })
      .execute();

    // Migrate partners using submitted Results as primary source (like bilateral migration).
    // One contracted partner row per unique Result (toc_id + center + AOW).
    const partnerResults = oldResults.filter((r) => r.type === 'PARTNER');

    // Build lookup: toc_id → porb_partner row
    const porbPartnerByTocId = new Map<string, typeof porbPartners[0]>();
    for (const pp of porbPartners) {
      porbPartnerByTocId.set(pp.toc_id, pp);
    }

    // Deduplicate partner Results by result_uuid::organization_code::wp_id
    const seenPartnerResults = new Set<string>();
    const createdCPKeys = new Set<string>();

    for (const result of partnerResults) {
      const dedupKey = `${result.result_uuid}::${result.organization_code}::${result.wp_id}`;
      if (seenPartnerResults.has(dedupKey)) continue;
      seenPartnerResults.add(dedupKey);

      const tocId = result.result_uuid;
      const centerId = Number(result.organization_code);
      const budget = parseFloat(result.budget) || 0;
      if (!budget) continue;

      // Resolve AOW from Result's wp_id
      const wpOfficialCode = wpIdToOfficialCode.get(Number(result.wp_id));
      const correctAowId = wpOfficialCode ? getAowIdFromWpId(wpOfficialCode) : null;
      if (!correctAowId) continue;

      // Find the porb_partner for this toc_id
      let porbPartner = porbPartnerByTocId.get(tocId);

      // If no porb_partner exists (placeholder like 999999), create one
      if (!porbPartner) {
        const newPartner = await this.porbPartnerRepository.save({
          program_id: programId,
          porb_aow_id: correctAowId,
          toc_id: tocId,
          partner_name: `Partner ${tocId}`,
          partner_outputs: '',
          toc_is_deleted: true,
        });
        porbPartner = newPartner as any;
        porbPartnerByTocId.set(tocId, porbPartner);
      }

      const cpKey = `${porbPartner.id}::${centerId}::${correctAowId}`;
      if (createdCPKeys.has(cpKey)) continue;

      // Get country codes
      const countryKey = `${tocId}::${centerId}`;
      const codes = countryCodesByResultAndCenter.get(countryKey) || [];
      codes.sort((a, b) => a - b);
      const countries = codes.join(', ');

      // Find matching BA for assumption (AOW-specific first, then fallback)
      const matchingBA = budgetAssumptions.find(
        (ba) =>
          ba.item_id === tocId &&
          Number(ba.organization_code) === centerId &&
          ba.wp_id?.endsWith('-partners') &&
          getAowIdFromWpId(ba.wp_id) === correctAowId,
      ) || budgetAssumptions.find(
        (ba) =>
          ba.item_id === tocId &&
          Number(ba.organization_code) === centerId &&
          ba.wp_id?.endsWith('-partners'),
      );
      const assumption = matchingBA?.budget_assumptions || '';

      await this.porbContractedPartnerRepository.save({
        program_id: programId,
        center_id: centerId,
        porb_partner_id: porbPartner.id,
        porb_aow_id: correctAowId,
        countries,
        budget,
        assumption,
      });
      createdCPKeys.add(cpKey);
      counts.contracted_partners++;
    }

    // Reset bilateral/melia budgets before re-applying (prevents stale data from previous runs)
    if (porbBilaterals.length) {
      await this.porbBilateralRepository
        .createQueryBuilder()
        .update()
        .set({ bilateral_budget: 0, bilateral_assumption: '' })
        .where('program_id = :programId', { programId })
        .execute();
    }
    if (porbMelias.length) {
      await this.porbMeliaRepository
        .createQueryBuilder()
        .update()
        .set({ melia_budget: 0, melia_assumption: '' })
        .where('program_id = :programId', { programId })
        .execute();
    }

    // 6. Migrate Bilaterals
    // Use submitted Results as the primary source for bilateral budgets and AOW assignment.
    // Results have correct per-AOW budgets. BAs provide assumptions.
    const bilateralResults = oldResults.filter((r) => r.type === 'PROJECT');
    const bilateralBAs = budgetAssumptions.filter(
      (ba) => ba.wp_id && ba.wp_id.endsWith('-project'),
    );
    // Build lookup: "toc_id::center_id" → PORB bilateral row(s)
    const porbBilateralByKey = new Map<string, typeof porbBilaterals[0]>();
    for (const pb of porbBilaterals) {
      porbBilateralByKey.set(`${pb.toc_id}::${pb.center_id}`, pb);
    }
    // Track which PORB rows have been used for a specific AOW
    const usedBilateralIds = new Set<number>();
    // Deduplicate submitted Results by result_uuid::organization_code::wp_id
    const seenBilateralResults = new Set<string>();
    // Process each submitted Result to set budget and correct AOW
    for (const result of bilateralResults) {
      const bilateralDedupKey = `${result.result_uuid}::${result.organization_code}::${result.wp_id}`;
      if (seenBilateralResults.has(bilateralDedupKey)) continue;
      seenBilateralResults.add(bilateralDedupKey);

      const tocId = result.result_uuid;
      const centerId = Number(result.organization_code);
      const budget = parseFloat(result.budget) || 0;
      // Resolve AOW from the Result's wp_id → work_package → wp_official_code
      const wpOfficialCode = wpIdToOfficialCode.get(Number(result.wp_id));
      const correctAowId = wpOfficialCode ? getAowIdFromWpId(wpOfficialCode) : null;
      // Find matching BA for assumption
      const matchingBA = bilateralBAs.find(
        (ba) =>
          ba.item_id === tocId &&
          Number(ba.organization_code) === centerId &&
          (wpOfficialCode ? getAowIdFromWpId(ba.wp_id) === correctAowId : true),
      ) || bilateralBAs.find(
        (ba) => ba.item_id === tocId && Number(ba.organization_code) === centerId,
      );
      const assumption = matchingBA?.budget_assumptions || '';

      if (!budget && !assumption) continue;

      const existingPorb = porbBilateralByKey.get(`${tocId}::${centerId}`);
      if (existingPorb && !usedBilateralIds.has(existingPorb.id)) {
        // Update existing row (first time for this bilateral+center)
        usedBilateralIds.add(existingPorb.id);
        await this.porbBilateralRepository.update(existingPorb.id, {
          bilateral_budget: budget,
          bilateral_assumption: assumption,
          ...(correctAowId != null ? { porb_aow_id: correctAowId } : {}),
        });
        counts.bilaterals++;
      } else if (existingPorb) {
        // Same bilateral+center already updated — create new row for different AOW
        await this.porbBilateralRepository.save({
          program_id: programId,
          porb_aow_id: correctAowId ?? existingPorb.porb_aow_id,
          toc_id: tocId,
          center_id: centerId,
          bilateral_name: existingPorb.bilateral_name,
          bilateral_outputs: existingPorb.bilateral_outputs,
          bilateral_budget: budget,
          bilateral_assumption: assumption,
          toc_is_deleted: false,
        });
        counts.bilaterals++;
      } else {
        // Bilateral exists in submitted version but not in PORB (not in TOC) — create it
        await this.porbBilateralRepository.save({
          program_id: programId,
          porb_aow_id: correctAowId,
          toc_id: tocId,
          center_id: centerId,
          bilateral_name: `Bilateral ${tocId}`,
          bilateral_outputs: '',
          bilateral_budget: budget,
          bilateral_assumption: assumption,
          toc_is_deleted: true,
        });
        counts.bilaterals++;
      }
    }

    // 7. Migrate MELIAs (same AOW-specific then fallback pattern as bilaterals)
    const meliaBAs = budgetAssumptions.filter(
      (ba) => ba.wp_id && (ba.wp_id.endsWith('-melia') || ba.wp_id === 'CROSS-Cross-Cutting'),
    );
    for (const porbMelia of porbMelias) {
      let matchingBA = meliaBAs.find(
        (ba) =>
          ba.item_id === porbMelia.toc_id &&
          Number(ba.organization_code) === porbMelia.center_id &&
          getAowIdFromWpId(ba.wp_id) === porbMelia.porb_aow_id,
      );
      if (!matchingBA) {
        matchingBA = meliaBAs.find(
          (ba) =>
            ba.item_id === porbMelia.toc_id &&
            Number(ba.organization_code) === porbMelia.center_id,
        );
      }
      if (!matchingBA) continue;

      const budget = parseFloat(matchingBA.item_budget) || 0;
      const assumption = matchingBA.budget_assumptions || '';

      if (budget || assumption) {
        const correctAowId = getAowIdFromWpId(matchingBA.wp_id);
        await this.porbMeliaRepository.update(porbMelia.id, {
          melia_budget: budget,
          melia_assumption: assumption,
          ...(correctAowId != null ? { porb_aow_id: correctAowId } : {}),
        });
        counts.melias++;
      }
    }

    // 8. Migrate Cross-Cutting (using standard cross-cutting items)
    const standardCrossItems = await this.standerdCrossCuttingRepository.find();
    const standardNameToId = new Map<string, number>();
    for (const item of standardCrossItems) {
      standardNameToId.set((item.name || '').trim().toLowerCase(), item.id);
    }

    const submittedCrossItems = await this.crossCuttingRepository.find({
      where: { initiative_id: programId, submission_id: submissionId },
    });
    const crossResults = oldResults.filter((r) => r.type === 'Cross-Cutting');

    const crossAow = await this.porbAowRepository.findOne({
      where: { program_id: programId, aow_acrnum: 'AOW00' },
    });

    if (crossAow && standardCrossItems.length) {
      // Map submitted CC id → standard item id by matching title
      const submittedToStandardMap = new Map<string, number>();
      for (const subCC of submittedCrossItems) {
        const title = (subCC.title || '').trim().toLowerCase();
        const standardId = standardNameToId.get(title);
        if (standardId != null) {
          submittedToStandardMap.set(String(subCC.id), standardId);
        }
      }

      // Build map of existing PorbCross rows by standerd_cross_cutting_id::center_id
      const existingCrossMap = new Map<string, PorbCross>();
      for (const pc of porbCrosses) {
        if (pc.standerd_cross_cutting_id != null) {
          existingCrossMap.set(`${pc.standerd_cross_cutting_id}::${pc.center_id}`, pc);
        }
      }

      for (const result of crossResults) {
        const submittedCcId = result.result_uuid;
        const standardId = submittedToStandardMap.get(submittedCcId);
        if (standardId == null) continue;

        const centerId = Number(result.organization_code);
        if (!Number.isFinite(centerId)) continue;

        const budget = parseFloat(result.budget) || 0;
        const crossBAs = budgetAssumptions.filter(
          (ba) => ba.wp_id && ba.wp_id.endsWith('-Cross-Cutting'),
        );
        const matchingBA = crossBAs.find(
          (ba) => ba.item_id === submittedCcId && Number(ba.organization_code) === centerId,
        );
        const assumption = matchingBA?.budget_assumptions || '';

        if (!budget && !assumption) continue;

        const key = `${standardId}::${centerId}`;
        const existing = existingCrossMap.get(key);

        if (existing) {
          await this.porbCrossRepository.update(existing.id, {
            budget: budget || existing.budget,
            assumption: assumption || existing.assumption,
          });
        } else {
          await this.porbCrossRepository.save({
            program_id: programId,
            porb_aow_id: crossAow.id,
            center_id: centerId,
            standerd_cross_cutting_id: standardId,
            budget: budget || null,
            assumption: assumption || '',
          });
        }
        counts.cross++;
      }
    }

    // 9. Migrate Anaplan
    // Load WorkPackages → map wp_official_code to porb_aow_id
    const workPackages = await this.workPackageRepository.find({
      where: { initiative_id: programId },
    });
    const allAows = await this.porbAowRepository.find({
      where: { program_id: programId },
    });
    const aowByAcrnum = new Map<string, PorbAow>();
    for (const aow of allAows) {
      aowByAcrnum.set(String(aow.aow_acrnum || '').toUpperCase(), aow);
    }
    const wpIdToAow = new Map<number, PorbAow>();
    for (const wp of workPackages) {
      const rawCode = String(wp.wp_official_code || '').toUpperCase();
      // wp_official_code is like "SP01-AOW02" — extract "AOW02" part
      const aowMatch = rawCode.match(/(AOW\d+)$/);
      const aowCode = aowMatch ? aowMatch[1] : rawCode;
      const aow = aowByAcrnum.get(aowCode);
      if (aow) {
        wpIdToAow.set(wp.wp_id, aow);
      }
    }

    // Load live AnaplanValues (submission_id IS NULL)
    const anaplanWhere: any = {
      initiative_id: programId,
      submission_id: IsNull(),
    };
    if (activePhase?.id != null) {
      anaplanWhere.phase_id = activePhase.id;
    }
    const liveAnaplanValues = await this.anaplanValuesRepository.find({
      where: anaplanWhere,
    });

    // Load existing PorbAnaplan rows
    const existingPorbAnaplan = await this.porbAnaplanRepository.find({
      where: { program_id: programId },
    });
    const existingAnaplanMap = new Map<string, PorbAnaplan>();
    for (const pa of existingPorbAnaplan) {
      existingAnaplanMap.set(
        `${pa.porb_aow_id}::${pa.center_id}::${pa.anaplan_id}`,
        pa,
      );
    }

    // AOW00 is the cross-cutting AOW — Anaplan values with unmapped WPs fall back here
    const aow00 = aowByAcrnum.get('AOW00') || null;

    counts.anaplan = 0;
    for (const av of liveAnaplanValues) {
      const aow = wpIdToAow.get(av.wp_id) || aow00;
      if (!aow) continue;

      const key = `${aow.id}::${av.organization_code}::${av.anaplan_id}`;
      const existing = existingAnaplanMap.get(key);

      if (existing) {
        if (av.value && av.value !== existing.budget) {
          await this.porbAnaplanRepository.update(existing.id, {
            budget: av.value,
          });
          counts.anaplan++;
        }
      } else if (av.value) {
        await this.porbAnaplanRepository.save({
          program_id: programId,
          porb_aow_id: aow.id,
          center_id: av.organization_code,
          anaplan_id: av.anaplan_id,
          budget: av.value,
        });
        counts.anaplan++;
      }
    }

    return { program_id: programId, status: 'success', counts };
  }

  async bulkMigrateSubmissionData(
    programIds?: number[],
    reqUser?: { id: number },
  ) {
    let initiatives: Initiative[];
    if (programIds?.length) {
      initiatives = await this.initiativeRepository.find({
        where: { id: In(programIds), archived: false },
      });
    } else {
      initiatives = await this.initiativeRepository.find({
        where: { archived: false },
      });
    }

    const results: Array<any> = [];

    for (const initiative of initiatives) {
      try {
        const detail = await this.migrateOneProgram(initiative);
        results.push(detail);

        if (detail.status === 'success') {
          const counts: Record<string, number> = (detail as any).counts || {};
          const parts: string[] = [];
          if (counts.hlos) parts.push(`${counts.hlos} HLOs`);
          if (counts.partners) parts.push(`${counts.partners} Partners`);
          if (counts.bilaterals) parts.push(`${counts.bilaterals} Bilaterals`);
          if (counts.melias) parts.push(`${counts.melias} MELIA`);
          if (counts.cross) parts.push(`${counts.cross} Cross Cutting`);
          if (counts.anaplan) parts.push(`${counts.anaplan} Anaplan`);

          await this.logHistory({
            initiative_id: initiative.id,
            user_id: reqUser?.id,
            resource_property: 'System Import (Data Migration)',
            new_value: parts.length
              ? `Imported ${parts.join(', ')}`
              : 'Data migration completed',
          });
        }
      } catch (err) {
        results.push({
          program_id: initiative.id,
          status: 'error',
          error: err?.message || String(err),
        });
      }
    }

    return {
      total: initiatives.length,
      success: results.filter((r) => r.status === 'success').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      failed: results.filter((r) => r.status === 'error').length,
      results,
    };
  }

  async bulkImportAndMigrate(
    programIds?: number[],
    reqUser?: { id: number },
  ) {
    // Use submitted toc_data (from submission JSON) for import,
    // ensuring we have the exact same TOC structure as the submitted version.
    let initiatives: Initiative[];
    if (programIds?.length) {
      initiatives = await this.initiativeRepository.find({
        where: { id: In(programIds), archived: false },
      });
    } else {
      initiatives = await this.initiativeRepository.find({
        where: { archived: false },
      });
    }

    const tocResults: any[] = [];
    for (const initiative of initiatives) {
      try {
        // Load submitted toc_data
        let tocData: any = null;
        if (initiative.latest_submission_id) {
          const submission = await this.submissionRepository.findOne({
            where: { id: initiative.latest_submission_id },
          });
          if (submission?.toc_data) {
            tocData = typeof submission.toc_data === 'string'
              ? JSON.parse(submission.toc_data)
              : submission.toc_data;
          }
        }

        if (!tocData) {
          tocResults.push({
            program_id: initiative.id,
            official_code: initiative.official_code,
            status: 'skipped',
            reason: 'no submitted toc_data',
          });
          continue;
        }

        const detail = await this.importTocToPorbTables(
          initiative.id,
          initiative.official_code,
          tocData,
          false,
        );
        tocResults.push({
          program_id: initiative.id,
          official_code: initiative.official_code,
          status: 'success',
          detail,
        });

        await this.logHistory({
          initiative_id: initiative.id,
          user_id: reqUser?.id,
          resource_property: 'System Import (TOC from Submission)',
          new_value: `Imported TOC data from submitted version for ${initiative.official_code}`,
        });
      } catch (err) {
        tocResults.push({
          program_id: initiative.id,
          official_code: initiative.official_code,
          status: 'error',
          error: err?.message || String(err),
        });
      }
    }

    const tocResult = {
      total: initiatives.length,
      success: tocResults.filter((r) => r.status === 'success').length,
      failed: tocResults.filter((r) => r.status === 'error').length,
      results: tocResults,
    };

    const migrateResult = await this.bulkMigrateSubmissionData(
      programIds,
      reqUser,
    );
    return {
      toc_import: tocResult,
      data_migration: migrateResult,
    };
  }

  async validateAgainstSubmission(programId?: number) {
    const programs = programId
      ? [await this.initService.initiativeRepository.findOne({ where: { id: programId } })]
      : await this.initService.initiativeRepository.find({
          where: { latest_submission_id: Not(IsNull()) },
        });

    const results: any[] = [];

    for (const program of programs) {
      if (!program?.latest_submission_id) continue;

      const submissionId = program.latest_submission_id;

      // Load submitted results grouped by type, deduplicated by result_uuid+center+wp_id
      const allSubmittedResults = await this.resultRepository.find({
        where: { submission_id: submissionId },
      });
      // Deduplicate: same result can appear multiple times in submitted version
      const seenResultKeys = new Set<string>();
      const submittedResults = allSubmittedResults.filter((r) => {
        const key = `${r.result_uuid}::${r.organization_code}::${r.wp_id}`;
        if (seenResultKeys.has(key)) return false;
        seenResultKeys.add(key);
        return true;
      });

      // Load work packages for AOW mapping
      const wpRows = await this.workPackageRepository.find({
        where: { initiative_id: program.id },
      });
      const wpIdToCode = new Map<number, string>();
      for (const wp of wpRows) wpIdToCode.set(wp.wp_id, wp.wp_official_code);

      // --- Submitted totals ---
      const submittedHloTotal = submittedResults
        .filter((r) => r.type === 'INDICATOR' && !r.is_project)
        .reduce((sum, r) => sum + (parseFloat(r.budget) || 0), 0);

      const submittedBilateralTotal = submittedResults
        .filter((r) => r.type === 'PROJECT')
        .reduce((sum, r) => sum + (parseFloat(r.budget) || 0), 0);

      const submittedPartnerTotal = submittedResults
        .filter((r) => r.type === 'PARTNER')
        .reduce((sum, r) => sum + (parseFloat(r.budget) || 0), 0);

      // Per-AOW submitted totals
      const submittedByAow: Record<string, { hlo: number; bilateral: number; partner: number }> = {};
      for (const r of submittedResults) {
        const wpCode = wpIdToCode.get(Number(r.wp_id)) || 'UNKNOWN';
        const aowMatch = wpCode.toUpperCase().match(/(AOW\d+)/);
        const aowKey = wpCode.toUpperCase().startsWith('CROSS')
          ? 'AOW00'
          : aowMatch?.[1] || 'UNKNOWN';
        if (!submittedByAow[aowKey]) submittedByAow[aowKey] = { hlo: 0, bilateral: 0, partner: 0 };
        const budget = parseFloat(r.budget) || 0;
        if (r.type === 'INDICATOR' && !r.is_project) submittedByAow[aowKey].hlo += budget;
        else if (r.type === 'PROJECT') submittedByAow[aowKey].bilateral += budget;
        else if (r.type === 'PARTNER') submittedByAow[aowKey].partner += budget;
      }

      // --- PORB totals ---
      const porbHlos = await this.porbHloRepository.find({ where: { program_id: program.id } });
      const porbBilaterals = await this.porbBilateralRepository.find({ where: { program_id: program.id } });
      const contractedPartners = await this.porbContractedPartnerRepository.find({ where: { program_id: program.id } });
      const porbAows = await this.porbAowRepository.find({ where: { program_id: program.id } });

      const aowIdToAcrnum = new Map<number, string>();
      for (const aow of porbAows) aowIdToAcrnum.set(aow.id, String(aow.aow_acrnum || '').toUpperCase());

      const porbHloTotal = porbHlos.reduce((sum, h) => sum + (h.hlo_budget || 0), 0);
      const porbBilateralTotal = porbBilaterals.reduce((sum, b) => sum + (b.bilateral_budget || 0), 0);
      const porbPartnerTotal = contractedPartners.reduce((sum, cp) => sum + (cp.budget || 0), 0);

      // Per-AOW PORB totals
      const porbByAow: Record<string, { hlo: number; bilateral: number; partner: number }> = {};
      for (const h of porbHlos) {
        const aow = aowIdToAcrnum.get(h.porb_aow_id) || 'UNKNOWN';
        if (!porbByAow[aow]) porbByAow[aow] = { hlo: 0, bilateral: 0, partner: 0 };
        porbByAow[aow].hlo += h.hlo_budget || 0;
      }
      for (const b of porbBilaterals) {
        const aow = aowIdToAcrnum.get(b.porb_aow_id) || 'UNKNOWN';
        if (!porbByAow[aow]) porbByAow[aow] = { hlo: 0, bilateral: 0, partner: 0 };
        porbByAow[aow].bilateral += b.bilateral_budget || 0;
      }
      for (const cp of contractedPartners) {
        const aow = aowIdToAcrnum.get(cp.porb_aow_id) || 'UNKNOWN';
        if (!porbByAow[aow]) porbByAow[aow] = { hlo: 0, bilateral: 0, partner: 0 };
        porbByAow[aow].partner += cp.budget || 0;
      }

      // --- Compare ---
      const round2 = (n: number) => Math.round(n * 100) / 100;
      const tolerance = 10; // Allow up to $10 rounding tolerance
      const hloDiff = round2(porbHloTotal - submittedHloTotal);
      const bilateralDiff = round2(porbBilateralTotal - submittedBilateralTotal);
      const partnerDiff = round2(porbPartnerTotal - submittedPartnerTotal);

      const allAowKeys = [...new Set([...Object.keys(submittedByAow), ...Object.keys(porbByAow)])].sort();
      const aowComparison = allAowKeys.map((aow) => {
        const sub = submittedByAow[aow] || { hlo: 0, bilateral: 0, partner: 0 };
        const porb = porbByAow[aow] || { hlo: 0, bilateral: 0, partner: 0 };
        const diffs = {
          hlo: round2(porb.hlo - sub.hlo),
          bilateral: round2(porb.bilateral - sub.bilateral),
          partner: round2(porb.partner - sub.partner),
        };
        const match = Math.abs(diffs.hlo) < tolerance && Math.abs(diffs.bilateral) < tolerance && Math.abs(diffs.partner) < tolerance;
        return {
          aow,
          submitted: { hlo: round2(sub.hlo), bilateral: round2(sub.bilateral), partner: round2(sub.partner) },
          porb: { hlo: round2(porb.hlo), bilateral: round2(porb.bilateral), partner: round2(porb.partner) },
          diff: diffs,
          match,
        };
      });

      const overallMatch = Math.abs(hloDiff) < tolerance && Math.abs(bilateralDiff) < tolerance && Math.abs(partnerDiff) < tolerance;

      results.push({
        program_id: program.id,
        official_code: program.official_code,
        match: overallMatch,
        totals: {
          submitted: { hlo: round2(submittedHloTotal), bilateral: round2(submittedBilateralTotal), partner: round2(submittedPartnerTotal) },
          porb: { hlo: round2(porbHloTotal), bilateral: round2(porbBilateralTotal), partner: round2(porbPartnerTotal) },
          diff: { hlo: hloDiff, bilateral: bilateralDiff, partner: partnerDiff },
        },
        aow_detail: aowComparison.filter((a) => !a.match),
      });
    }

    const matchCount = results.filter((r) => r.match).length;
    return {
      summary: `${matchCount}/${results.length} programs match`,
      matched: results.filter((r) => r.match).map((r) => r.official_code),
      mismatched: results.filter((r) => !r.match),
    };
  }

  async verifyMigration(programId: number) {
    const porbHlos = await this.porbHloRepository.find({ where: { program_id: programId } });
    const porbPartners = await this.porbPartnerRepository.find({ where: { program_id: programId } });
    const porbBilaterals = await this.porbBilateralRepository.find({ where: { program_id: programId } });
    const porbMelias = await this.porbMeliaRepository.find({ where: { program_id: programId } });
    const porbCrosses = await this.porbCrossRepository.find({ where: { program_id: programId } });
    const contractedPartners = await this.porbContractedPartnerRepository.find({ where: { program_id: programId } });
    const porbAnaplan = await this.porbAnaplanRepository.find({ where: { program_id: programId } });

    return {
      program_id: programId,
      hlos: {
        total: porbHlos.length,
        with_budget: porbHlos.filter((h) => h.hlo_budget && h.hlo_budget > 0).length,
        without_budget: porbHlos.filter((h) => !h.hlo_budget || h.hlo_budget === 0).length,
        with_assumption: porbHlos.filter((h) => h.hlo_assumption?.trim()).length,
      },
      partners: {
        total: porbPartners.length,
        contracted_partners: contractedPartners.length,
        contracted_with_budget: contractedPartners.filter((cp) => cp.budget && cp.budget > 0).length,
        contracted_with_assumption: contractedPartners.filter((cp) => cp.assumption?.trim()).length,
      },
      bilaterals: {
        total: porbBilaterals.length,
        with_budget: porbBilaterals.filter((b) => b.bilateral_budget && b.bilateral_budget > 0).length,
        without_budget: porbBilaterals.filter((b) => !b.bilateral_budget || b.bilateral_budget === 0).length,
        with_assumption: porbBilaterals.filter((b) => b.bilateral_assumption?.trim()).length,
      },
      melias: {
        total: porbMelias.length,
        with_budget: porbMelias.filter((m) => m.melia_budget && m.melia_budget > 0).length,
        without_budget: porbMelias.filter((m) => !m.melia_budget || m.melia_budget === 0).length,
        with_assumption: porbMelias.filter((m) => m.melia_assumption?.trim()).length,
      },
      cross: {
        total: porbCrosses.length,
        with_budget: porbCrosses.filter((c) => c.budget && c.budget > 0).length,
        without_budget: porbCrosses.filter((c) => !c.budget || c.budget === 0).length,
        with_assumption: porbCrosses.filter((c) => c.assumption?.trim()).length,
      },
      anaplan: {
        total: porbAnaplan.length,
        with_budget: porbAnaplan.filter((a) => a.budget && a.budget > 0).length,
        without_budget: porbAnaplan.filter((a) => !a.budget || a.budget === 0).length,
      },
    };
  }

    async getTocs(id) {
    const activePhase =
      await this.submissionService.PhasesService.findActivePhase();
    const program = await this.initService.initiativeRepository.findOne({
      where: { official_code: id },
    });
    return await firstValueFrom(
      this.httpService
        .get(
          process.env.TOC_API +
            `/toc/${program.action_area_id ? program.action_area_id : id}`,
        )
          .pipe(
            map(async (dd: any) => {
              const melias = dd?.data?.melias ?? [];
              const projects = dd?.data?.projects ?? [];
              let synergyPrograms: any[] = dd?.data?.synergy_programs ?? [];
              synergyPrograms
                .filter((s) => s.result.category == 'OUTPUT')
                .map((d) => (d['category'] = 'synergy-programs'));
              let indicatorIds = [];
              const filteredData = dd.data?.data
                ?.filter(
                  (d) =>
                    ((d.category == 'WP' && !d.group) ||
                      d.category == 'OUTPUT' ||
                      d.category == 'EOI' ||
                      d.category == 'IA' ||
                      d.category == 'OUTCOME') &&
                    d?.flow_id == dd?.data?.version_id,
                )
                .map((items: any) => {
                  if (items?.related_node_id && items.category != 'WP') {
                    if (items?.id) items['id'] = items.related_node_id;
                  }
  
                  if (items.melias?.length) {
                    items.melias = items.melias.map((melia: any) => melia.id);
                  }
  
                  if (items.projects?.length) {
                    items.projects = items.projects.map((proj: any) => proj.id);
                  }
                  if (items.quantitative_indicators?.length)
                    items.quantitative_indicators =
                      items.quantitative_indicators.map((i: any) => i);
  
                  if (items.partners?.length)
                    items.partners = items.partners.map((p: any) => {
                      p['id'] = p?.code ? p.code : p?.toc_id;
                      return p;
                    });
  
                  if (
                    items.quantitative_indicators?.length &&
                    (items.category == 'OUTPUT' || items.category == 'OUTCOME')
                  ) {
                    const sumPooledFundedByType: Record<string, number> = {};
                    let pooledCenters = [];
                    const sumProjectByType: Record<string, any> = {};
  
                    for (const indicator of items.quantitative_indicators) {
                      let indicatorType = indicator?.type?.value;
  
                      if (indicator.related_node_id) {
                        indicator.id = indicator.related_node_id;
                      }
                      indicatorIds.push(indicator.id);
  
                      for (const target of indicator.targets) {
                        pooledCenters = [...pooledCenters, ...target.centers];
                        const value = parseFloat(
                          target[activePhase.reportingYear],
                        );
                        if (!isNaN(value)) {
                          if (indicatorType == 'custom')
                            indicatorType = indicatorType + '-' + items.category;
                          sumPooledFundedByType[indicatorType] =
                            (sumPooledFundedByType[indicatorType] || 0) + value;
                        }
                      }
                    }
  
                    items.pooled_funded_indicator_values = sumPooledFundedByType;
                    items.pooled_centers = [...new Set(pooledCenters)];
                    items.projects_indicator_values = sumProjectByType;
                  }
  
                  return items;
                });
  
              const meliaMap = new Map<string, any>();
              // helper: escape any HTML in titles (safe rendering)
              const escapeHtml = (s: string) =>
                s?.replace(
                  /[&<>"']/g,
                  (c) =>
                    ({
                      '&': '&amp;',
                      '<': '&lt;',
                      '>': '&gt;',
                      '"': '&quot;',
                      "'": '&#39;',
                    }[c]!),
                );
  
              for (let data of filteredData) {
                for (let melia of melias) {
                  const isLinked = data.melias?.some((m: any) =>
                    typeof m === 'object' ? m.id === melia.id : m === melia.id,
                  );
                  if (!data.group) data.group = '';
                  if (isLinked) {
                    const key = `${melia.id}_${data.group}`;
  
                    if (meliaMap.has(key)) {
                      const existing = meliaMap.get(key);
  
                      // ensure we have a Set to avoid duplicates
                      if (!(existing.supported_outcome instanceof Set)) {
                        const arr = String(existing.supported_outcome || '')
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean);
                        existing.supported_outcome = new Set(arr);
                      }
  
                      (existing.supported_outcome as Set<string>).add(
                        data.title || data.type.name,
                      );
                    } else {
                      meliaMap.set(key, {
                        id: melia.id,
                        parent_id: data.group,
                        supported_outcome: new Set<string>([
                          data.title || data.type.name,
                        ]),
                        category: 'Melia',
                        ...melia,
                      });
                    }
                  }
                }
              }
  
              // When you need HTML for display:
              for (const [, entry] of meliaMap) {
                const items = [...(entry.supported_outcome as Set<string>)];
                entry.supported_outcome = `
                  <ul class="tdul">
                    ${items.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}
                  </ul>
                `;
              }
              const newMelias = Array.from(meliaMap.values());
  
              for (const melia of newMelias) {
                if (melia?.related_node_id) {
                  melia.id = melia.related_node_id;
                } else {
                  // console.warn(`Melia with missing related_node_id:`, melia);
                }
              }
  
              const projectMap = new Map<string, any>();
  
              for (let data of filteredData) {
                for (let project of projects) {
                  const isLinked = data.projects?.includes(project.id);
  
                  if (isLinked) {
                    const key = `${project.id}_${data.group}`;
                    if (projectMap.has(key)) {
                      const existing = projectMap.get(key);
                      if (data.title && !(existing.results || '').includes(data.title)) {
                        existing.results = existing.results ? existing.results + ', ' + data.title : data.title;
                      }
                    } else {
                      projectMap.set(key, {
                        ...project,
                        id: project.id,
                        parent_id: data.group,
                        result: data.title || '',
                        results: data.title || '',
                        category: 'Project',
                        projects_indicator_values:
                          data.projects_indicator_values?.[project.id],
                        title: project.name,
                      });
                    }
                  }
                }
              }
  
              const newProjects = Array.from(projectMap.values());
  
              const indicatorMap = new Map<string, any>();
              const partnersMap = new Map<string, any>();
  
              for (const data of filteredData) {
                if (data.category === 'OUTPUT') {
                  for (const indicator of data.quantitative_indicators) {
                    let costumeId = indicator.id;
                    let location;
                    if (indicator.location === 'regional') {
                      const regionNames = [...(indicator.regions ?? [])]
                        .map((r) => r.name)
                        .sort();
                      location = `Region: ${regionNames.join(', ')}`;
                      costumeId = `R_${indicator.regions
                        .map((r: any) => r.um49Code)
                        .join('-')}`;
                    } else if (indicator.location === 'country') {
                      const countryNames = [...(indicator.countries ?? [])]
                        .map((c) => c.name)
                        .sort();
                      location = `Country: ${countryNames.join(', ')}`;
                      costumeId = `C_${indicator.countries
                        .map((r: any) => r.code)
                        .join('-')}`;
                    } else if (indicator.location === 'global') {
                      location = 'Global';
                    }
                    const key = `${location}_${data.group}`;
                    const title = data.title?.trim();
  
                    if (indicatorMap.has(key)) {
                      const existing = indicatorMap.get(key);
                      const titleSet = new Set(
                        existing.results
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean),
                      );
                      titleSet.add(title);
                      existing.results = Array.from(titleSet).join(', ');
                    } else {
                      indicatorMap.set(key, {
                        ...indicator,
                        id: costumeId,
                        location: location,
                        parent_id: data.group,
                        results: title,
                        category: 'Geographic-Scope',
                      });
                    }
                  }
  
                  for (const partner of data.partners ?? []) {
                    const key = `${partner.id}_${data.group}`;
                    const title = data.title?.trim();
                    const selectedCountries =
                      await this.submissionService.getSelectedCountry(
                        partner.id,
                        id,
                        activePhase.id,
                      );
                    if (partnersMap.has(key)) {
                      const existing = partnersMap.get(key);
                      const titleSet = new Set(
                        existing.results
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean),
                      );
                      titleSet.add(title);
                      existing.results = Array.from(titleSet).join(', ');
                    } else {
                      partnersMap.set(key, {
                        ...partner,
                        id: partner.id,
                        parent_id: data.group,
                        results: title,
                        category: 'partners',
                        selectedCountries: selectedCountries,
                      });
                    }
                  }
                }
              }
  
              const newIndicators = Array.from(indicatorMap.values());
              const newPartners = Array.from(partnersMap.values());
              const aows = filteredData.filter(
                (item: any) => item?.category === 'WP' && !item?.group,
              );

              return {
                results: [
                   aows,
                  ...synergyPrograms,
                  ...newMelias,
                  ...newProjects,
                  ...filteredData,
                  ...newIndicators,
                  ...newPartners,
                  { indicator_ids: { ...indicatorIds } },
                ],
                info: {
                  original_id: dd.data.original_id,
                  version_id: dd.data.version_id,
                  version: dd.data.version,
                  phase: dd.data.phase,
                  initiative_id: id,
                },
              };
            }),
            catchError((error: AxiosError) => {
              console.error(error);
              throw new InternalServerErrorException();
            }),
          ),
      );
    }

  async getLatestSubmission(programId: number): Promise<{ id: number | null; status: string }> {
    const initiative = await this.initiativeRepository.findOne({
      where: { id: programId },
      relations: ['latest_submission'],
    });
    const sub = initiative?.latest_submission;
    if (sub && (sub.status === SubmissionStatus.PENDING || sub.status === SubmissionStatus.APPROVED)) {
      return { id: sub.id, status: sub.status };
    }
    return { id: null, status: 'Draft' };
  }

  private async assertNotLocked(programId: number): Promise<void> {
    const { status } = await this.getLatestSubmission(programId);
    if (status === SubmissionStatus.PENDING || status === SubmissionStatus.APPROVED) {
      throw new ForbiddenException(`Cannot modify PORB data while submission is ${status}`);
    }
  }

  /**
   * Submit PORB data for a program, creating a new Submission record
   * with a snapshot of the summary consolidation data.
   */
  async submitPorb(programId: number, reqUser: { id: number }) {
    try {
      const initiative = await this.initiativeRepository.findOne({
        where: { id: programId },
      });
      if (!initiative) {
        throw new NotFoundException(`Initiative with id ${programId} not found`);
      }

      const activePhase = await this.phasesService.findActivePhase();
      if (!activePhase) {
        throw new BadRequestException('No active phase found');
      }

      const validationResult = await this.getValidationSummary(programId);
      if (
        validationResult.center_error_codes.length > 0 ||
        validationResult.aow_error_ids.length > 0
      ) {
        throw new BadRequestException(
          'Cannot submit: there are validation errors that must be resolved first.',
        );
      }

      const user = await this.userRepository.findOneBy({ id: reqUser.id });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Snapshot the summary consolidation data as the submission payload
      const consolidationSnapshot = await this.getSummaryConsolidation(programId);

      // Build the full PORB snapshot for version history
      const porbSnapshot = await this.buildPorbSnapshot(programId);

      const newSubmission = this.submissionRepository.create();
      newSubmission.toc_data = JSON.stringify(consolidationSnapshot);
      newSubmission.porb_data = JSON.stringify(porbSnapshot);
      newSubmission.user = user;
      newSubmission.phase = activePhase;
      newSubmission.initiative = initiative;
      newSubmission.status = SubmissionStatus.PENDING;

      const saved = await this.submissionRepository.save(newSubmission, {
        reload: true,
      });

      // Record history entry first so its createdAt becomes the canonical "last update".
      const history = this.historyRepository.create();
      history.resource_property = 'PORB Submit';
      history.user_id = reqUser.id;
      history.initiative_id = programId;
      const savedHistory = await this.historyRepository.save(history);

      // Update initiative with latest submission reference. last_update_at mirrors the
      // submit-history row's timestamp so the list view's status logic stays consistent
      // (submission status shown when latest history <= submit; "Draft" when newer activity).
      await this.initiativeRepository.update(programId, {
        last_update_at: savedHistory.createdAt,
        last_submitted_at: savedHistory.createdAt,
        latest_submission_id: saved.id,
        latest_history_id: savedHistory.id,
      });

      // Send notification emails to admins
      const admins = await this.userRepository.find({
        where: { role: userRole.ADMIN },
      });
      for (const admin of admins) {
        this.emailService.sendEmailTobyVarabel(
          admin, 3, initiative, null, null, null, null, null, null,
        );
      }

      // Send notification emails to initiative leaders/coordinators
      const initWithRoles = await this.initiativeRepository.findOne({
        where: {
          id: programId,
          roles: { role: In([...LEAD_ROLES]) },
        },
        relations: ['roles', 'roles.user'],
      });
      if (initWithRoles?.roles) {
        for (const role of initWithRoles.roles) {
          this.emailService.sendEmailTobyVarabel(
            role.user, 4, initWithRoles, null, null, null, null, null, null,
          );
        }
      }

      return await this.submissionRepository.findOne({
        where: { id: saved.id },
        relations: ['user', 'phase'],
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to submit PORB data');
    }
  }

  /**
   * Approve or reject a PORB submission.
   */
  async updateSubmissionStatus(
    submissionId: number,
    data: { status: string; status_reason?: string },
    reqUser: { id: number },
  ) {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['initiative', 'initiative.roles', 'initiative.roles.user'],
    });
    if (!submission) {
      throw new NotFoundException(`Submission with id ${submissionId} not found`);
    }

    if (
      submission.status !== SubmissionStatus.PENDING &&
      submission.status !== SubmissionStatus.DRAFT
    ) {
      throw new BadRequestException(
        `Cannot update status of submission in '${submission.status}' state`,
      );
    }

    const newStatus =
      data.status === 'Approved'
        ? SubmissionStatus.APPROVED
        : data.status === 'Rejected'
          ? SubmissionStatus.REJECTED
          : null;

    if (!newStatus) {
      throw new BadRequestException(
        'Status must be either "Approved" or "Rejected"',
      );
    }

    await this.submissionRepository.update(submissionId, {
      status: newStatus,
      status_reason: data.status_reason || '',
    } as any);

    // Send notification emails to initiative team
    if (submission.initiative?.roles) {
      const emailVariableId = newStatus === SubmissionStatus.APPROVED ? 5 : 6;
      for (const role of submission.initiative.roles) {
        this.emailService.sendEmailTobyVarabel(
          role.user,
          emailVariableId,
          submission.initiative,
          role.role,
          data.status_reason || null,
          null,
          null,
          null,
          null,
        );
      }
    }

    // Record history entry
    const history = this.historyRepository.create();
    history.resource_property =
      newStatus === SubmissionStatus.APPROVED
        ? `PORB Approved for version Id: ${submissionId}`
        : `PORB Rejected for version Id: ${submissionId}`;
    history.item_name = data.status;
    history.user_id = reqUser.id;
    history.initiative_id = submission.initiative_id;
    await this.historyRepository.save(history);
    await this.initiativeRepository.update(submission.initiative_id, {
      latest_history_id: history.id,
    });

    return { success: true, status: newStatus };
  }

  /**
   * List initiatives for admin PORB export, filtered by phase and status.
   * Draft = initiatives with PORB AOWs but no pending/approved submission.
   * Approved/Pending = initiatives whose latest submission matches the status.
   */
  async getExportList(phaseId?: number, status?: string) {
    const normalizedStatus = (status || 'Approved').trim();

    // Check which initiatives have PORB data (at least one AOW)
    const aowCounts = await this.porbAowRepository
      .createQueryBuilder('aow')
      .select('aow.program_id', 'program_id')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('aow.program_id')
      .getRawMany();
    const programsWithAows = new Set(aowCounts.map((r) => r.program_id));

    if (normalizedStatus === 'Draft') {
      // Draft: initiatives with PORB AOWs that have no non-draft submission in this phase
      const initiatives = await this.initiativeRepository.find({
        where: { archived: false },
        order: { official_code: 'ASC' },
      });

      // Find initiatives that DO have an active (non-draft) submission in this phase
      const qb = this.submissionRepository
        .createQueryBuilder('sub')
        .select('sub.initiative_id', 'initiative_id')
        .where('sub.status != :draft', { draft: SubmissionStatus.DRAFT });
      if (phaseId) qb.andWhere('sub.phase_id = :phaseId', { phaseId });
      const activeSubmissions = await qb.getRawMany();
      const activeInitIds = new Set(activeSubmissions.map((r: any) => r.initiative_id));

      return initiatives
        .filter((init) => programsWithAows.has(init.id) && !activeInitIds.has(init.id))
        .map((init) => ({
          id: init.id,
          official_code: init.official_code,
          name: init.name,
          status: 'Draft',
        }));
    }

    // Approved or Pending: find the latest submission per initiative matching phase + status
    const qb = this.submissionRepository
      .createQueryBuilder('sub')
      .innerJoinAndSelect('sub.initiative', 'init')
      .where('sub.status = :status', { status: normalizedStatus })
      .andWhere('init.archived = :archived', { archived: false });
    if (phaseId) qb.andWhere('sub.phase_id = :phaseId', { phaseId });
    qb.orderBy('sub.id', 'DESC');

    const submissions = await qb.getMany();

    // Deduplicate: keep latest per initiative
    const seen = new Set<number>();
    const result: any[] = [];
    for (const sub of submissions) {
      if (seen.has(sub.initiative_id)) continue;
      seen.add(sub.initiative_id);
      if (!programsWithAows.has(sub.initiative_id)) continue;
      result.push({
        id: sub.initiative_id,
        official_code: sub.initiative?.official_code,
        name: sub.initiative?.name,
        status: sub.status,
      });
    }

    result.sort((a, b) => (a.official_code || '').localeCompare(b.official_code || ''));
    return result;
  }

  /**
   * Export a bulk ZIP of PORB Excel files for multiple programs.
   */
  async exportBulkZip(programIds: number[], res: Response) {
    if (!programIds?.length) {
      throw new BadRequestException('No programs selected');
    }

    const zipName = `PORB_Export_${new Date().toISOString().slice(0, 10)}`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}.zip"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (const programId of programIds) {
      const initiative = await this.initiativeRepository.findOne({ where: { id: programId } });
      if (!initiative) continue;
      const code = initiative.official_code || String(programId);
      const { status } = await this.getLatestSubmission(programId);
      const folder = `${status}_PORB_${code}`;

      // Summary workbook
      const summaryWb = await this.buildPorbWorkbook(programId, undefined);
      const summaryBuf = Buffer.from(
        XLSX.write(summaryWb, { type: 'buffer', bookType: 'xlsx', cellStyles: true }),
      );
      archive.append(summaryBuf, { name: `${folder}/Summary.xlsx` });

      // Per-center workbooks
      const activePhase = await this.phasesService.findActivePhase();
      let centers = await this.phasesService.fetchAssignedOrganizations(activePhase?.id, programId);
      if (!centers?.length) {
        centers = await this.organizationRepo.find();
      }
      for (const center of centers) {
        const centerName = center.acronym || center.name || String(center.code);
        const wb = await this.buildPorbWorkbook(programId, center.code);
        const buf = Buffer.from(
          XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true }),
        );
        archive.append(buf, { name: `${folder}/${centerName}.xlsx` });
      }
    }

    await archive.finalize();
  }

  async clearEmails() {
    const result = await this.emailService.repo
      .createQueryBuilder()
      .delete()
      .from('email')
      .execute();
    return { cleared: 'email', deleted: result.affected || 0 };
  }

  async clearHistory() {
    // Clear latest_history_id references first to avoid FK constraint
    await this.initiativeRepository
      .createQueryBuilder()
      .update()
      .set({ latest_history_id: null as any })
      .where('latest_history_id IS NOT NULL')
      .execute();
    const result = await this.historyRepository
      .createQueryBuilder()
      .delete()
      .from('history')
      .execute();
    return { cleared: 'history', deleted: result.affected || 0 };
  }

  /**
   * Reset all programs' PORB status to Draft (admin only).
   * Sets the latest_submission status to Draft and clears latest_submission_id
   * on each initiative so the PORB becomes editable again.
   */
  async resetAllToDraft() {
    const initiatives = await this.initiativeRepository.find({
      where: { latest_submission_id: Not(IsNull()) },
    });

    let updated = 0;
    for (const init of initiatives) {
      await this.initiativeRepository.update(init.id, {
        latest_submission_id: null as any,
      });
      updated++;
    }

    return { updated };
  }

  /**
   * Cancel a pending PORB submission, reverting its status to Draft.
   */
  async cancelSubmission(submissionId: number, reqUser: { id: number }) {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['user'],
    });
    if (!submission) {
      throw new NotFoundException(`Submission with id ${submissionId} not found`);
    }

    if (submission.status !== SubmissionStatus.PENDING) {
      throw new BadRequestException(
        'Only pending submissions can be cancelled',
      );
    }

    // Only the submitter or an admin can cancel
    const currentUser = await this.userRepository.findOneBy({ id: reqUser.id });
    const isSubmitter = submission.user?.id === reqUser.id;
    const isAdmin = currentUser?.role === userRole.ADMIN;
    if (!isSubmitter && !isAdmin) {
      throw new ForbiddenException(
        'Only the submitter or an admin can cancel this submission',
      );
    }

    await this.submissionRepository.update(submissionId, {
      status: SubmissionStatus.DRAFT,
    });

    // Record history entry
    const history = this.historyRepository.create();
    history.resource_property = `PORB Cancelled for version Id: ${submissionId}`;
    history.item_name = SubmissionStatus.DRAFT;
    history.user_id = reqUser.id;
    history.initiative_id = submission.initiative_id;
    await this.historyRepository.save(history);
    await this.initiativeRepository.update(submission.initiative_id, {
      latest_history_id: history.id,
    });

    return { success: true, status: SubmissionStatus.DRAFT };
  }

  async updateCenterStatus(data, reqUser) {
    await this.assertNotLocked(data.initiative_id);
    const { initiative_id, organization_code, phase_id, status, organization } = data;

    const statusBool = status === true || status === 1 || status === '1' ? true : false;

    let center_status = await this.centerStatusRepo.findOneBy({
      initiative_id,
      organization_code,
      phase_id,
    });

    if (center_status) {
      // Use update() with raw value to avoid TypeORM boolean save issue on composite PKs
      const updateData: any = { status: statusBool };
      if (!statusBool) updateData.is_valid = false;
      await this.centerStatusRepo.update(
        { initiative_id, organization_code, phase_id },
        updateData,
      );
    } else {
      center_status = this.centerStatusRepo.create({
        initiative_id,
        organization_code,
        phase_id,
        status: statusBool,
        is_valid: !statusBool ? false : undefined,
      });
      await this.centerStatusRepo.save(center_status);
    }
    center_status.status = statusBool;

    await Promise.resolve(center_status).then(
      async () => {
        if (statusBool) {
          const init = await this.initiativeRepository.findOne({
            where: { id: initiative_id },
            relations: ['roles', 'roles.user', 'roles.organizations'],
          });

          const usersRole = [];
          init.roles.filter((d) => {
            if (isLeadRole(d.role)) {
              usersRole.push(d);
            } else if (d.role == INITIATIVE_ROLES.CONTRIBUTOR) {
              d.organizations.filter((x) => {
                if (x.code == organization_code) {
                  usersRole.push(d);
                }
              });
            }
          });
          const users = usersRole.map((d) => d.user);

          const userRoleDoAction = init.roles.filter(
            (d) => d.user_id == reqUser.id,
          );

          for (let user of users) {
            if (userRoleDoAction.length) {
              this.emailService.sendEmailTobyVarabel(
                user, 7, init, null, null, organization, userRoleDoAction, null, null,
              );
            } else {
              this.emailService.sendEmailTobyVarabel(
                user, 7, init, null, null, organization, [reqUser], null, null,
              );
            }
          }
        }
        const history = this.historyRepository.create();
        history.resource_property = statusBool ? 'Mark as complete' : 'Mark as incomplete';
        history.user_id = reqUser.id;
        history.initiative_id = initiative_id;
        history.organization_id = organization_code;
        await this.historyRepository.save(history);
        await this.initiativeRepository.update(initiative_id, {
          latest_history_id: history.id,
        });
      },
    ).catch((error) => {
      console.error('updateCenterStatus error:', error);
    });

    // Emit socket event so other users see the status change in real-time
    this.emitPorbBudgetChanged({
      program_id: initiative_id,
      center_id: organization_code,
      aow_id: null,
      section: 'center-status',
      type: 'update',
      emitter_socket_id: null,
    });

    return { message: 'Data Saved' };
  }

  async updateCenterValidate(data, reqUser) {
    await this.assertNotLocked(data.initiative_id);
    const { initiative_id, organization_code, phase_id, is_valid, organization } = data;

    let center_status: CenterStatus;
    center_status = await this.centerStatusRepo.findOneBy({
      initiative_id,
      organization_code,
      phase_id,
    });

    center_status.initiative_id = initiative_id;
    center_status.organization_code = organization_code;
    center_status.phase_id = phase_id;
    center_status.is_valid = is_valid;
    await this.centerStatusRepo.save(center_status).then(
      async (data) => {
        if (data.is_valid) {
          const init = await this.initiativeRepository.findOne({
            where: { id: initiative_id },
            relations: ['roles', 'roles.user', 'roles.organizations'],
          });

          const usersRole = [];
          init.roles.filter((d) => {
            if (isLeadRole(d.role)) {
              usersRole.push(d);
            } else if (d.role == INITIATIVE_ROLES.CONTRIBUTOR) {
              d.organizations.filter((x) => {
                if (x.code == data.organization_code) {
                  usersRole.push(d);
                }
              });
            }
          });
          const users = usersRole.map((d) => d.user);

          const userRoleDoAction = init.roles.filter(
            (d) => d.user_id == reqUser.id,
          );

          for (let user of users) {
            if (userRoleDoAction.length) {
              this.emailService.sendEmailTobyVarabel(
                user, 9, init, null, null, organization, userRoleDoAction, null, null,
              );
            } else {
              this.emailService.sendEmailTobyVarabel(
                user, 9, init, null, null, organization, [reqUser], null, null,
              );
            }
          }
        }
        const history = this.historyRepository.create();
        history.resource_property = data.is_valid ? 'Mark as valid' : 'Mark as invalid';
        history.user_id = reqUser.id;
        history.initiative_id = data.initiative_id;
        history.organization_id = organization_code;
        await this.historyRepository.save(history);
        await this.initiativeRepository.update(initiative_id, {
          latest_history_id: history.id,
        });
      },
      (error) => {
        console.error(error);
      },
    );

    return { message: 'Data Saved' };
  }

  // ── Excel export ──────────────────────────────────────────────────────

  private readonly headerStyle = {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    fill: { fgColor: { rgb: '2B3C53' } },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    },
  };

  private readonly cellStyle = {
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    },
  };

  private readonly numberStyle = {
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    },
    numFmt: '#,##0',
  };

  private readonly subTotalRowStyle = {
    font: { bold: true, color: { rgb: '000000' } },
    fill: { fgColor: { rgb: 'E6E6E6' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    },
  };

  private readonly wpVerticalStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '2B3C53' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    },
  };

  private readonly totalRowStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '2B3C53' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  /**
   * Hides ID columns and applies sheet protection to prevent accidental edits.
   */
  private protectAndHideIds(ws: any, idColumnIndices: number[]) {
    if (!ws['!cols']) ws['!cols'] = [];
    for (const idx of idColumnIndices) {
      if (!ws['!cols'][idx]) ws['!cols'][idx] = {};
      ws['!cols'][idx].hidden = true;
    }
  }

  /**
   * Unified sheet styling: applies header, data, subtotal, total, and AOW vertical merge styles.
   */
  private applySheetStyles(
    ws: any,
    wsData: any[][],
    options: {
      headerRowCount: number;
      subtotalDetector?: (row: any[]) => boolean;
      totalRowIndex?: number;
      wpColumnIndex?: number;
      numberColumns?: number[];
      rowHeights?: { header: number; data: number; subtotal: number };
      merges?: any[];
    },
  ) {
    const {
      headerRowCount,
      subtotalDetector,
      totalRowIndex,
      wpColumnIndex,
      numberColumns = [],
      rowHeights = { header: 30, data: 50, subtotal: 25 },
      merges,
    } = options;

    ws['!rows'] = [];
    for (let R = 0; R < wsData.length; R++) {
      const isHeader = R < headerRowCount;
      const isSubtotal = !isHeader && subtotalDetector?.(wsData[R]);
      const isTotal = totalRowIndex != null && R === totalRowIndex;

      ws['!rows'][R] = {
        hpt: isHeader
          ? rowHeights.header
          : isSubtotal
            ? rowHeights.subtotal
            : isTotal
              ? rowHeights.subtotal
              : rowHeights.data,
      };

      for (let C = 0; C < (wsData[R]?.length || 0); C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (!cell) continue;

        if (isHeader) {
          cell.s = this.headerStyle;
        } else if (isTotal) {
          cell.s = numberColumns.includes(C)
            ? { ...this.totalRowStyle, numFmt: '#,##0' }
            : this.totalRowStyle;
        } else if (isSubtotal) {
          cell.s = this.subTotalRowStyle;
        } else {
          cell.s = numberColumns.includes(C) ? this.numberStyle : this.cellStyle;
        }
      }
    }

    // Apply wpVerticalStyle to AOW column merges
    if (wpColumnIndex != null && merges) {
      for (const merge of merges) {
        if (merge.s.c === wpColumnIndex && merge.e.c === wpColumnIndex) {
          const addr = XLSX.utils.encode_cell(merge.s);
          if (ws[addr]) ws[addr].s = this.wpVerticalStyle;
        }
      }
    }
  }

  private getAowLabel(aowId: number, aowMap: Map<number, { code: string; name: string }>): string {
    const aow = aowMap.get(aowId);
    return aow ? `${aow.code}: ${aow.name}` : String(aowId);
  }

  /**
   * Load all data needed for Excel generation, build workbook, return as sheets.
   */
  private async buildPorbWorkbook(programId: number, centerId?: any) {
    const [aows, hlos, partners, bilaterals, melias, summaryData, rawCountryPercentageRows, rawLocationBenefitRows, outcomesForExport] = await Promise.all([
      this.getAows(programId),
      this.getHlos(programId, undefined, centerId),
      this.getPartners(programId, undefined, centerId),
      this.getBilaterals(programId, undefined, centerId),
      this.getMelia(programId, undefined, centerId),
      this.getSummaryConsolidation(programId, centerId != null ? centerId : undefined),
      this.porbCountryPercentageRepository.find({
        where: { program_id: programId, ...(centerId != null ? { center_id: centerId } : {}) },
      }),
      this.porbLocationBenefitRepository.find({
        where: { program_id: programId, ...(centerId != null ? { center_id: centerId } : {}) },
      }),
      this.porbOutcomeRepository.find({
        where: { program_id: programId, toc_is_deleted: false },
      }),
    ]);

    // Filter out orphan rows (UI hides these; export should match).
    // A country row is live if is_manual=true OR its country is in the current
    // hlo_geo for that (center, AOW). A location row is live if is_manual=true OR
    // its (type, name) is in an active outcome's outcome_geo for that AOW.
    const liveCountriesByCenterAow = new Map<string, Set<string>>();
    for (const hlo of hlos as any[]) {
      if (!hlo?.hlo_geo || hlo.center_id == null || hlo.porb_aow_id == null) continue;
      const key = `${hlo.center_id}::${hlo.porb_aow_id}`;
      let set = liveCountriesByCenterAow.get(key);
      if (!set) {
        set = new Set<string>();
        liveCountriesByCenterAow.set(key, set);
      }
      for (const c of String(hlo.hlo_geo).split(', ')) {
        const trimmed = c.trim();
        if (trimmed) set.add(trimmed);
      }
    }
    const countryPercentageRows = rawCountryPercentageRows.filter((row) => {
      if (row.is_manual) return true;
      if (row.center_id == null || row.porb_aow_id == null) return false;
      return !!liveCountriesByCenterAow.get(`${row.center_id}::${row.porb_aow_id}`)?.has(row.country_name);
    });

    const liveLocationsByAow = new Map<number, Set<string>>();
    for (const outcome of outcomesForExport) {
      if (!outcome?.outcome_geo || outcome.porb_aow_id == null) continue;
      let set = liveLocationsByAow.get(outcome.porb_aow_id);
      if (!set) {
        set = new Set<string>();
        liveLocationsByAow.set(outcome.porb_aow_id, set);
      }
      for (const loc of this.parseOutcomeGeo(outcome.outcome_geo)) {
        set.add(`${loc.type}::${loc.name}`);
      }
    }
    const locationBenefitRows = rawLocationBenefitRows.filter((row) => {
      if (row.is_manual) return true;
      if (row.porb_aow_id == null) return false;
      return !!liveLocationsByAow.get(row.porb_aow_id)?.has(`${row.location_type}::${row.location_name}`);
    });

    const aowMap = new Map<number, { code: string; name: string }>();
    if (Array.isArray(aows)) {
      for (const aow of aows) {
        aowMap.set(aow.id, { code: aow.aow_acrnum || '', name: aow.aow_name || '' });
      }
    }

    // Sort AOW IDs for consistent ordering
    const sortedAowIds = Array.isArray(aows)
      ? aows.map((a) => a.id)
      : [...aowMap.keys()].sort((a, b) => a - b);

    const anaplanRows = await this.porbAnaplanRepository.find({
      where: { program_id: programId, ...(centerId != null ? { center_id: centerId } : {}) },
      relations: ['anaplan'],
    });

    const crossRows = await this.porbCrossRepository.find({
      where: { program_id: programId, ...(centerId != null ? { center_id: centerId } : {}) },
    });
    const standardCrossItems = await this.standerdCrossCuttingRepository.find();
    const crossItemMap = new Map<number, string>();
    standardCrossItems.forEach((c) => crossItemMap.set(c.id, c.name || ''));

    // Load contracted partners directly for proper multi-center grouping
    const contractedPartners = await this.porbContractedPartnerRepository.find({
      where: { program_id: programId, ...(centerId != null ? { center_id: centerId } : {}) },
    });

    // Build partner lookup: partner_id -> partner row
    const partnerMap = new Map<number, any>();
    if (Array.isArray(partners)) {
      for (const p of partners) {
        partnerMap.set(p.id, p);
      }
    }

    // Resolve country codes for contracted partners
    const allCountryCodes = [
      ...new Set(
        contractedPartners.flatMap((cp) => this.parseCountryCodes(cp.countries)),
      ),
    ];
    const countryRows = allCountryCodes.length
      ? await this.clarisaCountryRepository.find({ where: { code: In(allCountryCodes) } })
      : [];
    const countryNameMap = new Map<number, string>();
    countryRows.forEach((c) => countryNameMap.set(Number(c.code), c.name));

    // Resolve center names from ALL entities
    const centerIds = [
      ...new Set([
        ...contractedPartners.map((cp) => cp.center_id),
        ...(Array.isArray(hlos) ? hlos : []).map((h: any) => h.center_id),
        ...(Array.isArray(bilaterals) ? bilaterals : []).map((b: any) => b.center_id),
        ...(Array.isArray(melias) ? melias : []).map((m: any) => m.center_id),
        ...crossRows.map((c) => c.center_id),
        ...countryPercentageRows.map((cp) => cp.center_id),
        ...locationBenefitRows.map((lb) => lb.center_id),
      ].filter(Boolean)),
    ];
    const centerRows = centerIds.length
      ? await this.organizationRepo.find({ where: { code: In(centerIds.map(String)) } })
      : [];
    const centerNameMap = new Map<number, string>();
    centerRows.forEach((c) => centerNameMap.set(Number(c.code), c.acronym || c.name || String(c.code)));

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, this.generatePorbSummarySheet(summaryData), 'Summary');
    XLSX.utils.book_append_sheet(
      wb,
      this.generatePorbHloSheet(Array.isArray(hlos) ? hlos : [], aowMap, sortedAowIds, centerNameMap),
      'HLO',
    );
    XLSX.utils.book_append_sheet(
      wb,
      this.generatePorbPartnerSheet(contractedPartners, partnerMap, aowMap, sortedAowIds, countryNameMap, centerNameMap),
      'Partners',
    );
    XLSX.utils.book_append_sheet(
      wb,
      this.generatePorbBilateralSheet(Array.isArray(bilaterals) ? bilaterals : [], centerNameMap),
      'W3-Bilateral',
    );
    XLSX.utils.book_append_sheet(
      wb,
      this.generatePorbMeliaSheet(Array.isArray(melias) ? melias : [], aowMap, sortedAowIds, centerNameMap),
      'MELIA',
    );
    XLSX.utils.book_append_sheet(
      wb,
      this.generatePorbCrossSheet(crossRows, aowMap, crossItemMap, sortedAowIds, centerNameMap),
      'Cross Cutting',
    );
    XLSX.utils.book_append_sheet(
      wb,
      this.generatePorbAnaplanSheet(anaplanRows, aowMap, sortedAowIds),
      'Anaplan',
    );

    XLSX.utils.book_append_sheet(
      wb,
      this.generatePorbCountryPercentageSheet(countryPercentageRows, aowMap, sortedAowIds, centerNameMap),
      'Countries of Implementation',
    );

    XLSX.utils.book_append_sheet(
      wb,
      this.generatePorbLocationBenefitSheet(locationBenefitRows, aowMap, sortedAowIds, centerNameMap),
      'Location of Benefit',
    );

    const synergyRows = await this.porbSynergyRepository.find({
      where: { program_id: programId, toc_is_deleted: false },
    });
    const outcomeRows = await this.porbOutcomeRepository.find({
      where: { program_id: programId, toc_is_deleted: false },
    });

    XLSX.utils.book_append_sheet(
      wb,
      this.generatePorbSynergySheet(synergyRows, aowMap, sortedAowIds),
      'Synergy Programs',
    );
    XLSX.utils.book_append_sheet(
      wb,
      this.generatePorbOutcomeSheet(outcomeRows, aowMap, sortedAowIds),
      'Outcomes',
    );

    return wb;
  }

  /**
   * Returns Anaplan data consolidated across all centers for a program,
   * grouped by account label and AOW.
   */
  async getAnaplanConsolidated(program_id: number, center_id?: number) {
    const aows = await this.porbAowRepository
      .createQueryBuilder('aow')
      .where('aow.program_id = :program_id', { program_id })
      .andWhere('(aow.toc_is_deleted = :isDeleted OR aow.toc_is_deleted IS NULL)', {
        isDeleted: false,
      })
      .orderBy('aow.aow_acrnum', 'ASC')
      .addOrderBy('aow.aow_name', 'ASC')
      .getMany();

    if (!aows.length) {
      return { aows: [], accounts: [], grandTotal: 0 };
    }

    const aowIds = aows.map((a) => a.id);
    const aowLabels = aows.map((a) => a.aow_acrnum || `AOW${a.id}`);

    const anaplanFindWhere: any = { program_id, porb_aow_id: In(aowIds) };
    if (center_id != null) {
      anaplanFindWhere.center_id = center_id;
    }

    const anaplanRows = await this.porbAnaplanRepository.find({
      where: anaplanFindWhere,
      relations: ['anaplan'],
    });

    // Build lookup: anaplan_id -> { label, budgetByAow }
    const accountMap = new Map<number, { label: string; budgetByAow: Map<number, number> }>();
    for (const row of anaplanRows) {
      if (!accountMap.has(row.anaplan_id)) {
        accountMap.set(row.anaplan_id, {
          label: row.anaplan?.label || `Anaplan #${row.anaplan_id}`,
          budgetByAow: new Map(),
        });
      }
      const entry = accountMap.get(row.anaplan_id);
      const current = entry.budgetByAow.get(row.porb_aow_id) || 0;
      entry.budgetByAow.set(row.porb_aow_id, current + (Number(row.budget) || 0));
    }

    // If no rows exist, still load the anaplan accounts so we return the full list
    if (!accountMap.size) {
      const allAccounts = await this.anaplanRepository.find({ order: { label: 'ASC' } });
      for (const acct of allAccounts) {
        accountMap.set(acct.id, { label: acct.label, budgetByAow: new Map() });
      }
    }

    const sortedAccountIds = [...accountMap.keys()].sort((a, b) => a - b);
    let grandTotal = 0;
    const grandTotalByAow: Record<string, number> = {};

    const accounts = sortedAccountIds.map((anaplanId) => {
      const entry = accountMap.get(anaplanId);
      const budgetByAow: Record<string, number> = {};
      let total = 0;

      for (let i = 0; i < aows.length; i++) {
        const aowCode = aowLabels[i];
        const val = entry.budgetByAow.get(aows[i].id) || 0;
        budgetByAow[aowCode] = val;
        grandTotalByAow[aowCode] = (grandTotalByAow[aowCode] || 0) + val;
        total += val;
      }

      grandTotal += total;

      return {
        label: entry.label,
        budgetByAow,
        total,
      };
    });

    return { aows: aowLabels, accounts, grandTotal, grandTotalByAow };
  }

  /**
   * Returns W3/Bilateral budget totals grouped by center for a given program.
   * Shape matches the Anaplan consolidated endpoint for frontend consistency.
   */
  async getW3Consolidated(program_id: number) {
    const bilateralRows = await this.porbBilateralRepository.find({
      where: { program_id },
      relations: ['center'],
    });

    const centerMap = new Map<number, { name: string; code: string; budget: number }>();
    for (const row of bilateralRows) {
      const centerId = row.center_id;
      if (!centerMap.has(centerId)) {
        centerMap.set(centerId, {
          name: row.center?.name || `Center ${centerId}`,
          code: String(row.center?.code || centerId),
          budget: 0,
        });
      }
      centerMap.get(centerId).budget += Number(row.bilateral_budget) || 0;
    }

    const centers = [...centerMap.values()].sort((a, b) => a.name.localeCompare(b.name));
    const grandTotal = centers.reduce((sum, c) => sum + c.budget, 0);

    return { centers, grandTotal };
  }

  /**
   * Returns country-of-implementation budget totals aggregated across all AOWs.
   * Each country's budget is computed as (percentage / 100) * pooled_total for that AOW+center.
   * Pooled total = HLO budgets + Cross-cutting budgets per (AOW, center).
   * Optionally filtered by center_id.
   */
  async getCountryPercentageConsolidated(
    program_id: number,
    center_id?: number,
  ): Promise<{
    countries: Array<{ country_name: string; percentage: number; totalBudget: number }>;
    grandTotal: number;
  }> {
    const cpWhere: Record<string, any> = { program_id };
    if (center_id != null) cpWhere.center_id = center_id;
    const cpRows = await this.porbCountryPercentageRepository.find({
      where: cpWhere,
    });

    if (!cpRows.length) {
      return { countries: [], grandTotal: 0 };
    }

    // Get pooled totals per (aow, center): HLO + Cross-cutting budgets
    const hloWhere: Record<string, any> = { program_id };
    if (center_id != null) hloWhere.center_id = center_id;
    const hlos = await this.porbHloRepository.find({ where: hloWhere });

    const crossWhere: Record<string, any> = { program_id };
    if (center_id != null) crossWhere.center_id = center_id;
    const crosses = await this.porbCrossRepository.find({ where: crossWhere });

    const pooledMap = new Map<string, number>();

    for (const h of hlos) {
      const key = `${h.porb_aow_id}_${h.center_id}`;
      pooledMap.set(key, (pooledMap.get(key) || 0) + (Number(h.hlo_budget) || 0));
    }
    for (const c of crosses) {
      const key = `${c.porb_aow_id}_${c.center_id}`;
      pooledMap.set(key, (pooledMap.get(key) || 0) + (Number(c.budget) || 0));
    }

    // Compute total pooled funding across all AOWs/centers (the denominator for percentage)
    let totalPooledFunding = 0;
    for (const val of pooledMap.values()) {
      totalPooledFunding += val;
    }

    // Compute budget for each country, aggregate by country name
    const countryBudgetMap = new Map<string, number>();

    for (const row of cpRows) {
      const pooledKey = `${row.porb_aow_id}_${row.center_id}`;
      const pooledTotal = pooledMap.get(pooledKey) || 0;
      const pct = Number(row.percentage) || 0;
      const budget = Math.round((pct * pooledTotal) / 100);
      countryBudgetMap.set(
        row.country_name,
        (countryBudgetMap.get(row.country_name) || 0) + budget,
      );
    }

    const grandTotal = Array.from(countryBudgetMap.values()).reduce((a, b) => a + b, 0);

    // Recalculate percentage as country budget / total pooled funding
    const countries = Array.from(countryBudgetMap.entries())
      .map(([country_name, totalBudget]) => ({
        country_name,
        percentage: totalPooledFunding > 0
          ? Math.round((totalBudget / totalPooledFunding) * 10000) / 100
          : 0,
        totalBudget,
      }))
      .sort((a, b) => a.country_name.localeCompare(b.country_name));

    return { countries, grandTotal };
  }

  /**
   * Migration endpoint: merges bilateral rows that share (toc_id, center_id, program_id)
   * but differ by porb_aow_id. After migration, porb_aow_id is NULL on all bilateral rows.
   */
  async migrateBilateralToCenter() {
    const queryRunner = this.porbBilateralRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find groups with duplicates (same toc_id + center_id + program_id)
      const groups: Array<{
        toc_id: string;
        center_id: number;
        program_id: number;
        cnt: string;
      }> = await queryRunner.query(`
        SELECT toc_id, center_id, program_id, COUNT(*) AS cnt
        FROM porb_bilateral
        GROUP BY toc_id, center_id, program_id
        HAVING COUNT(*) > 1
      `);

      let merged = 0;
      let deleted = 0;

      for (const group of groups) {
        // Get all rows in this group, ordered by id ASC (keep the lowest)
        const rows: PorbBilateral[] = await queryRunner.query(
          `SELECT * FROM porb_bilateral
           WHERE toc_id = ? AND center_id = ? AND program_id = ?
           ORDER BY id ASC`,
          [group.toc_id, group.center_id, group.program_id],
        );

        if (rows.length < 2) continue;

        const keepRow = rows[0];
        const duplicates = rows.slice(1);

        // Sum budgets
        const totalBudget = rows.reduce(
          (sum, r) => sum + (Number(r.bilateral_budget) || 0),
          0,
        );

        // Concat non-empty assumptions
        const assumptions = rows
          .map((r) => (r.bilateral_assumption || '').trim())
          .filter((a) => a.length > 0);
        const mergedAssumption = assumptions.length > 0 ? assumptions.join('\n') : null;

        // Update the kept row
        await queryRunner.query(
          `UPDATE porb_bilateral
           SET bilateral_budget = ?, bilateral_assumption = ?, porb_aow_id = NULL
           WHERE id = ?`,
          [totalBudget || null, mergedAssumption, keepRow.id],
        );

        // Delete duplicates
        const deleteIds = duplicates.map((r) => r.id);
        if (deleteIds.length > 0) {
          await queryRunner.query(
            `DELETE FROM porb_bilateral WHERE id IN (${deleteIds.map(() => '?').join(',')})`,
            deleteIds,
          );
          deleted += deleteIds.length;
        }

        merged += 1;
      }

      // Set porb_aow_id = NULL on all remaining rows
      const nullified = await queryRunner.query(
        `UPDATE porb_bilateral SET porb_aow_id = NULL WHERE porb_aow_id IS NOT NULL`,
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        groupsMerged: merged,
        rowsDeleted: deleted,
        rowsNullified: nullified?.affectedRows ?? 0,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        `Bilateral migration failed: ${error?.message || error}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Migration endpoint: merges duplicate MELIA rows that share
   * (program_id, center_id, porb_aow_id, melia_name). Keeps the row with
   * the lowest id, sums budgets, and concatenates non-empty assumptions.
   */
  async migrateMeliaDedup() {
    const queryRunner =
      this.porbMeliaRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find groups with duplicates
      const groups: Array<{
        program_id: number;
        center_id: number;
        porb_aow_id: number | null;
        melia_name: string;
        cnt: string;
      }> = await queryRunner.query(`
        SELECT program_id, center_id, porb_aow_id, melia_name, COUNT(*) AS cnt
        FROM porb_melia
        GROUP BY program_id, center_id, porb_aow_id, melia_name
        HAVING COUNT(*) > 1
      `);

      let merged = 0;
      let deleted = 0;

      for (const group of groups) {
        const rows: PorbMelia[] = await queryRunner.query(
          `SELECT * FROM porb_melia
           WHERE program_id = ? AND center_id = ?
             AND ${group.porb_aow_id == null ? 'porb_aow_id IS NULL' : 'porb_aow_id = ?'}
             AND melia_name = ?
           ORDER BY id ASC`,
          group.porb_aow_id == null
            ? [group.program_id, group.center_id, group.melia_name]
            : [
                group.program_id,
                group.center_id,
                group.porb_aow_id,
                group.melia_name,
              ],
        );

        if (rows.length < 2) continue;

        const keepRow = rows[0];
        const duplicates = rows.slice(1);

        // Sum budgets across all rows
        const totalBudget = rows.reduce(
          (sum, r) => sum + (Number(r.melia_budget) || 0),
          0,
        );

        // Concat non-empty assumptions (newline-separated)
        const assumptions = rows
          .map((r) => (r.melia_assumption || '').trim())
          .filter((a) => a.length > 0);
        const mergedAssumption =
          assumptions.length > 0 ? assumptions.join('\n') : null;

        // Update the kept row with merged values
        await queryRunner.query(
          `UPDATE porb_melia
           SET melia_budget = ?, melia_assumption = ?
           WHERE id = ?`,
          [totalBudget || null, mergedAssumption, keepRow.id],
        );

        // Delete duplicate rows
        const deleteIds = duplicates.map((r) => r.id);
        if (deleteIds.length > 0) {
          await queryRunner.query(
            `DELETE FROM porb_melia WHERE id IN (${deleteIds.map(() => '?').join(',')})`,
            deleteIds,
          );
          deleted += deleteIds.length;
        }

        merged += 1;
      }

      await queryRunner.commitTransaction();

      // Verification: check no duplicates remain
      const remaining: Array<{ cnt: string }> = await queryRunner.query(`
        SELECT COUNT(*) AS cnt FROM (
          SELECT program_id, center_id, porb_aow_id, melia_name
          FROM porb_melia
          GROUP BY program_id, center_id, porb_aow_id, melia_name
          HAVING COUNT(*) > 1
        ) AS dups
      `);

      return {
        success: true,
        groupsMerged: merged,
        rowsDeleted: deleted,
        remainingDuplicates: Number(remaining?.[0]?.cnt || 0),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        `MELIA dedup migration failed: ${error?.message || error}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async dedupContractedPartners() {
    const queryRunner =
      this.porbContractedPartnerRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find groups with duplicates
      const groups: Array<{
        porb_partner_id: number;
        center_id: number;
        cnt: string;
      }> = await queryRunner.query(`
        SELECT porb_partner_id, center_id, COUNT(*) AS cnt
        FROM porb_contracted_partners
        GROUP BY porb_partner_id, center_id
        HAVING COUNT(*) > 1
      `);

      let merged = 0;
      let deleted = 0;

      for (const group of groups) {
        const rows: PorbContractedPartner[] = await queryRunner.query(
          `SELECT * FROM porb_contracted_partners
           WHERE porb_partner_id = ? AND center_id = ?
           ORDER BY COALESCE(budget, 0) DESC, id ASC`,
          [group.porb_partner_id, group.center_id],
        );

        if (rows.length < 2) continue;

        // Keep the row with highest budget (first due to ORDER BY)
        const keepRow = rows[0];
        const duplicates = rows.slice(1);

        // Delete duplicate rows
        const deleteIds = duplicates.map((r) => r.id);
        if (deleteIds.length > 0) {
          await queryRunner.query(
            `DELETE FROM porb_contracted_partners WHERE id IN (${deleteIds.map(() => '?').join(',')})`,
            deleteIds,
          );
          deleted += deleteIds.length;
        }

        merged += 1;
      }

      await queryRunner.commitTransaction();

      // Verification: check no duplicates remain
      const remaining: Array<{ cnt: string }> = await queryRunner.query(`
        SELECT COUNT(*) AS cnt FROM (
          SELECT porb_partner_id, center_id
          FROM porb_contracted_partners
          GROUP BY porb_partner_id, center_id
          HAVING COUNT(*) > 1
        ) AS dups
      `);

      return {
        success: true,
        groupsMerged: merged,
        rowsDeleted: deleted,
        remainingDuplicates: Number(remaining?.[0]?.cnt || 0),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        `Contracted partners dedup failed: ${error?.message || error}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async cleanupHloGeo() {
    // Clear non-country values: Global, Region:...
    const cleared = await this.porbHloRepository
      .createQueryBuilder()
      .update()
      .set({ hlo_geo: null })
      .where(
        `hlo_geo IS NOT NULL AND hlo_geo != '' AND (hlo_geo = 'Global' OR hlo_geo LIKE 'Region:%')`,
      )
      .execute();

    // Strip "Country: " prefix from remaining rows
    const stripped = await this.porbHloRepository.query(
      `UPDATE porb_hlo SET hlo_geo = SUBSTRING(hlo_geo, 10)
       WHERE hlo_geo LIKE 'Country:%'`,
    );

    return {
      success: true,
      rowsCleared: cleared.affected ?? 0,
      rowsStrippedPrefix: stripped?.affectedRows ?? stripped?.[1] ?? 0,
    };
  }

  /**
   * Backfill output_id on existing porb_hlo rows that have output_id IS NULL.
   *
   * Pre-fix, the import dedup key was `indicator_id::center_id`, so when the same
   * indicator appeared under multiple OUTPUTs in TOC, only the first OUTPUT's HLO
   * row was created. The new key is `output_id::indicator_id::center_id`, but
   * existing rows have no output_id stamped on them.
   *
   * Strategy: pull the live TOC, build a map of (indicator_id, output_title) →
   * output_id. For each existing HLO with NULL output_id, look up by
   * (toc_id, hlo_name). hlo_name was originally set from item.title (the OUTPUT
   * title), so this is the natural disambiguator when an indicator is shared.
   *
   * Idempotent: safe to run multiple times. Rows that already have output_id
   * are skipped. Rows whose (indicator, title) no longer exists in TOC stay NULL
   * and will be flagged toc_is_deleted by syncTocDeletedFlags on the next import.
   */
  async backfillHloOutputId(programId: number) {
    const program = await this.initService.initiativeRepository.findOne({
      where: { id: programId },
    });
    if (!program) {
      return { success: false, error: 'Program not found' };
    }

    const existingRows = await this.porbHloRepository.find({
      where: { program_id: programId },
    });
    const totalRows = existingRows.length;
    const alreadyHasOutputId = existingRows.filter((r) => !!r.output_id).length;
    const candidates = existingRows.filter((r) => !r.output_id);

    if (!candidates.length) {
      return {
        success: true,
        program_id: programId,
        program_code: program.official_code,
        totalRows,
        alreadyHasOutputId,
        matched: 0,
        ambiguous: 0,
        orphaned: 0,
        message: 'All rows already have output_id; nothing to backfill.',
      };
    }

    // Pull live TOC (same path used by importTocToPorbTables)
    const toc: any = await this.getTocs(program.official_code);
    const results: any[] = Array.isArray(toc?.results) ? toc.results : [];
    if (!results.length) {
      return {
        success: false,
        program_id: programId,
        program_code: program.official_code,
        error: 'TOC returned no results — cannot backfill.',
      };
    }
    const outputs = results.filter((item: any) => item?.category === 'OUTPUT');

    // Build (indicator_id, normalized_title) → [output_id, ...] map.
    // Multiple outputs can share the same (indicator, title) only in pathological
    // data; we treat that as ambiguous.
    type TitleMap = Map<string, Set<string>>; // title → output_ids
    const indicatorToTitles = new Map<string, TitleMap>();
    const normalizeTitle = (s: string) => String(s ?? '').trim();

    for (const o of outputs) {
      const outputId = String(o?.id || '');
      if (!outputId) continue;
      const title = normalizeTitle(o?.title);
      for (const ind of o?.quantitative_indicators || []) {
        const indId = String(ind?.id || '');
        if (!indId) continue;
        let titleMap = indicatorToTitles.get(indId);
        if (!titleMap) {
          titleMap = new Map();
          indicatorToTitles.set(indId, titleMap);
        }
        let outputIdSet = titleMap.get(title);
        if (!outputIdSet) {
          outputIdSet = new Set();
          titleMap.set(title, outputIdSet);
        }
        outputIdSet.add(outputId);
      }
    }

    let matched = 0;
    let ambiguous = 0;
    let orphaned = 0;
    const updates: Array<{ id: number; output_id: string }> = [];
    const ambiguousRows: Array<{ id: number; toc_id: string; hlo_name: string; candidates: string[] }> = [];
    const orphanedRows: Array<{ id: number; toc_id: string; hlo_name: string }> = [];

    for (const row of candidates) {
      const indId = String(row.toc_id || '');
      const title = normalizeTitle(row.hlo_name);
      const titleMap = indicatorToTitles.get(indId);
      if (!titleMap) {
        orphaned++;
        orphanedRows.push({ id: row.id, toc_id: row.toc_id, hlo_name: row.hlo_name });
        continue;
      }
      const outputIds = titleMap.get(title);
      if (!outputIds || outputIds.size === 0) {
        // Indicator exists in TOC but not under any output with this title —
        // the OUTPUT title was renamed, or this row is from a stale import.
        // Leave output_id NULL; syncTocDeletedFlags will flag it on next tick.
        orphaned++;
        orphanedRows.push({ id: row.id, toc_id: row.toc_id, hlo_name: row.hlo_name });
        continue;
      }
      if (outputIds.size > 1) {
        ambiguous++;
        ambiguousRows.push({
          id: row.id,
          toc_id: row.toc_id,
          hlo_name: row.hlo_name,
          candidates: Array.from(outputIds),
        });
        continue;
      }
      const [outputId] = Array.from(outputIds);
      updates.push({ id: row.id, output_id: outputId });
      matched++;
    }

    if (updates.length) {
      // Run updates in batches to avoid overwhelming the DB on large programs.
      const batchSize = 100;
      for (let i = 0; i < updates.length; i += batchSize) {
        const chunk = updates.slice(i, i + batchSize);
        await Promise.all(
          chunk.map((u) =>
            this.porbHloRepository.update(u.id, { output_id: u.output_id }),
          ),
        );
      }
    }

    return {
      success: true,
      program_id: programId,
      program_code: program.official_code,
      totalRows,
      alreadyHasOutputId,
      candidatesProcessed: candidates.length,
      matched,
      ambiguous,
      orphaned,
      ambiguousRows: ambiguousRows.slice(0, 20),
      orphanedRows: orphanedRows.slice(0, 20),
    };
  }

  /**
   * Bulk backfill: run backfillHloOutputId for every program that has porb_hlo
   * rows. Sequential (not parallel) to avoid hammering the TOC API. Always
   * returns a per-program summary, even when individual programs error out, so
   * the admin UI can show the full picture instead of bailing on the first
   * failure.
   */
  async backfillHloOutputIdAll() {
    const rows: Array<{ program_id: number }> = await this.porbHloRepository
      .createQueryBuilder('h')
      .select('DISTINCT h.program_id', 'program_id')
      .orderBy('h.program_id', 'ASC')
      .getRawMany();
    const programIds = rows
      .map((r) => Number(r.program_id))
      .filter((n) => Number.isFinite(n));

    const results: any[] = [];
    let totals = {
      programsProcessed: 0,
      programsFailed: 0,
      totalRows: 0,
      alreadyHasOutputId: 0,
      matched: 0,
      ambiguous: 0,
      orphaned: 0,
    };

    for (const programId of programIds) {
      try {
        const r = await this.backfillHloOutputId(programId);
        results.push(r);
        if (r?.success) {
          totals.programsProcessed += 1;
          totals.totalRows += Number(r.totalRows || 0);
          totals.alreadyHasOutputId += Number(r.alreadyHasOutputId || 0);
          totals.matched += Number(r.matched || 0);
          totals.ambiguous += Number(r.ambiguous || 0);
          totals.orphaned += Number(r.orphaned || 0);
        } else {
          totals.programsFailed += 1;
        }
      } catch (err: any) {
        totals.programsFailed += 1;
        results.push({
          success: false,
          program_id: programId,
          error: err?.message || 'Unknown error',
        });
      }
    }

    return {
      success: true,
      programsTotal: programIds.length,
      ...totals,
      perProgram: results,
    };
  }

  /**
   * Danger zone: clear all PORB data. If program_id is provided, only clear that program.
   */
  async clearAllPorbData(programId?: number) {
    const queryRunner =
      this.porbAowRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const where = programId ? `WHERE program_id = ${programId}` : '';
      const aowWhere = programId
        ? `WHERE porb_aow_id IN (SELECT id FROM porb_aow WHERE program_id = ${programId})`
        : '';

      // Child tables first (FK order)
      const tables = [
        { name: 'porb_contracted_partners', condition: aowWhere },
        { name: 'porb_country_percentage', condition: where },
        { name: 'porb_location_benefit', condition: where },
        { name: 'porb_hlo', condition: aowWhere },
        { name: 'porb_melia', condition: aowWhere },
        { name: 'porb_anaplan', condition: where },
        { name: 'porb_cross', condition: aowWhere },
        { name: 'porb_bilateral', condition: where },
        { name: 'porb_partner', condition: aowWhere },
        { name: 'porb_synergy', condition: where },
        { name: 'porb_outcome', condition: where },
        { name: 'porb_aow', condition: where },
      ];

      const counts: Record<string, number> = {};
      for (const t of tables) {
        const result = await queryRunner.query(
          `DELETE FROM ${t.name} ${t.condition}`,
        );
        counts[t.name] = result?.affectedRows ?? 0;
      }

      // Reset TOC counter so cron will re-harvest
      if (programId) {
        await queryRunner.query(
          `UPDATE initiative SET toc_last_update = 0 WHERE id = ${programId}`,
        );
      } else {
        await queryRunner.query(
          `UPDATE initiative SET toc_last_update = 0`,
        );
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        programId: programId || 'ALL',
        deletedRows: counts,
        totalDeleted: Object.values(counts).reduce((a, b) => a + b, 0),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        `Clear PORB data failed: ${error?.message || error}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Generates a standalone Anaplan-only Excel workbook and streams it as a download.
   */
  async generateAnaplanExcel(programId: number, centerId: number | undefined, res: Response) {
    const aows = await this.porbAowRepository
      .createQueryBuilder('aow')
      .where('aow.program_id = :programId', { programId })
      .andWhere('(aow.toc_is_deleted = :isDeleted OR aow.toc_is_deleted IS NULL)', {
        isDeleted: false,
      })
      .orderBy('aow.aow_acrnum', 'ASC')
      .addOrderBy('aow.aow_name', 'ASC')
      .getMany();

    const aowMap = new Map<number, { code: string; name: string }>();
    for (const aow of aows) {
      aowMap.set(aow.id, { code: aow.aow_acrnum || '', name: aow.aow_name || '' });
    }
    const sortedAowIds = aows.map((a) => a.id);

    const anaplanRows = await this.porbAnaplanRepository.find({
      where: { program_id: programId, ...(centerId != null ? { center_id: centerId } : {}) },
      relations: ['anaplan'],
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      this.generatePorbAnaplanSheet(anaplanRows, aowMap, sortedAowIds),
      'Anaplan',
    );

    const initiative = await this.initiativeRepository.findOne({ where: { id: programId } });
    const code = initiative?.official_code || programId;
    const { status } = await this.getLatestSubmission(programId);
    const fileName = centerId
      ? `${status}_PORB_Anaplan_${code}_center${centerId}`
      : `${status}_PORB_Anaplan_${code}`;

    const dirPath = join(process.cwd(), 'generated_files');
    const { mkdirSync, existsSync } = require('fs');
    if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });

    const filePath = join(dirPath, `${fileName}.xlsx`);
    XLSX.writeFile(wb, filePath, { cellStyles: true });
    const file = createReadStream(filePath);

    setTimeout(() => {
      try { unlink(filePath, () => {}); } catch {}
    }, 10000);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    return new StreamableFile(file);
  }

  async generatePorbExcel(programId: number, centerId: number | undefined, res: Response) {
    const wb = await this.buildPorbWorkbook(programId, centerId);

    const initiative = await this.initiativeRepository.findOne({ where: { id: programId } });
    const code = initiative?.official_code || programId;
    const { status } = await this.getLatestSubmission(programId);
    const fileName = centerId ? `${status}_PORB_${code}_center${centerId}` : `${status}_PORB_${code}`;

    const dirPath = join(process.cwd(), 'generated_files');
    const { mkdirSync, existsSync } = require('fs');
    if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });

    const filePath = join(dirPath, `${fileName}.xlsx`);
    XLSX.writeFile(wb, filePath, { cellStyles: true });
    const file = createReadStream(filePath);

    setTimeout(() => {
      try { unlink(filePath, () => {}); } catch {}
    }, 10000);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    return new StreamableFile(file);
  }

  /**
   * Generate a ZIP containing Summary.xlsx + one Excel per center
   */
  async generatePorbZip(programId: number, res: Response) {
    const initiative = await this.initiativeRepository.findOne({ where: { id: programId } });
    if (!initiative) throw new NotFoundException('Initiative not found');
    const code = initiative.official_code || String(programId);
    const { status } = await this.getLatestSubmission(programId);

    const activePhase = await this.submissionService.PhasesService.findActivePhase();
    let centers = await this.phasesService.fetchAssignedOrganizations(
      activePhase?.id,
      programId,
    );
    if (!centers?.length) {
      centers = await this.organizationRepo.find();
    }

    const zipName = `${status}_PORB_${code}`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}.zip"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    // Summary Excel (no centerId filter)
    const summaryWb = await this.buildPorbWorkbook(programId, undefined);
    const summaryBuf = Buffer.from(XLSX.write(summaryWb, { type: 'buffer', bookType: 'xlsx', cellStyles: true }));
    archive.append(summaryBuf, { name: `${zipName}/Summary.xlsx` });

    // Per-center Excel files
    for (const center of centers) {
      const centerCode = center.code;
      const centerName = center.acronym || center.name || String(centerCode);
      const wb = await this.buildPorbWorkbook(programId, centerCode);
      const buf = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true }));
      archive.append(buf, { name: `${zipName}/${centerName}.xlsx` });
    }

    await archive.finalize();
  }

  // ── Sheet generators (match submission export structure) ─────────────

  private generatePorbSummarySheet(summaryData: any) {
    const rows = Array.isArray(summaryData?.rows) ? summaryData.rows : [];
    const totals = summaryData?.totals || {};

    // Column layout matches UI: AOW | Indicators(8) | Total Pooled | Anaplan | Partner | MELIA | aow_id(hidden)
    const wsData: any[][] = [
      [
        'Area of Work',
        'Pooled Funding', null, null, null, null, null, null, null, null,
        'Additional Information', null, null,
        'aow_id',
      ],
      [
        null,
        'Innovation Development', null,
        'Knowledge product', null,
        'Capacity Sharing', null,
        'Others outputs', null,
        'Total Pooled Funding budget (USD)',
        'Anaplan budget',
        'Partner budget',
        'MELIA Studies budget',
        null,
      ],
      [
        null,
        'Target', 'Budget',
        'Target', 'Budget',
        'Target', 'Budget',
        'Target', 'Budget',
        null, null, null, null, null,
      ],
    ];

    for (const r of rows) {
      wsData.push([
        `${r.aowCode || ''}: ${r.aowName || ''}`,
        Number(r.innovationTarget) || 0, Number(r.innovationBudget) || 0,
        Number(r.knowledgeTarget) || 0, Number(r.knowledgeBudget) || 0,
        Number(r.capacityTarget) || 0, Number(r.capacityBudget) || 0,
        Number(r.othersTarget) || 0, Number(r.othersBudget) || 0,
        Number(r.totalPooledFunding) || 0,
        Number(r.anaplanBudget) || 0,
        Number(r.partnerBudget) || 0, Number(r.meliaBudget) || 0,
        r.aowId || '',
      ]);
    }

    const totalRowIdx = wsData.length;
    wsData.push([
      'Total',
      '', Number(totals.innovationBudget) || 0,
      '', Number(totals.knowledgeBudget) || 0,
      '', Number(totals.capacityBudget) || 0,
      '', Number(totals.othersBudget) || 0,
      Number(totals.totalPooledFunding) || 0,
      Number(totals.anaplanBudget) || 0,
      Number(totals.partnerBudget) || 0, Number(totals.meliaBudget) || 0,
      '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } },        // Area of Work rowspan=3
      { s: { r: 0, c: 1 }, e: { r: 0, c: 9 } },         // Pooled Funding colspan=9
      { s: { r: 0, c: 10 }, e: { r: 0, c: 12 } },       // Additional Information colspan=3
      { s: { r: 1, c: 1 }, e: { r: 1, c: 2 } },         // Innovation Development
      { s: { r: 1, c: 3 }, e: { r: 1, c: 4 } },         // Knowledge product
      { s: { r: 1, c: 5 }, e: { r: 1, c: 6 } },         // Capacity Sharing
      { s: { r: 1, c: 7 }, e: { r: 1, c: 8 } },         // Others outputs
      { s: { r: 1, c: 9 }, e: { r: 2, c: 9 } },         // Total Pooled Funding
      { s: { r: 1, c: 10 }, e: { r: 2, c: 10 } },       // Anaplan budget
      { s: { r: 1, c: 11 }, e: { r: 2, c: 11 } },       // Partner budget
      { s: { r: 1, c: 12 }, e: { r: 2, c: 12 } },       // MELIA Studies budget
    ];

    ws['!cols'] = [
      { wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
      { wch: 35 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 10 },
    ];

    const numCols = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    this.applySheetStyles(ws, wsData, {
      headerRowCount: 3,
      totalRowIndex: totalRowIdx,
      numberColumns: numCols,
      rowHeights: { header: 15, data: 20, subtotal: 25 },
    });

    this.protectAndHideIds(ws, [13]);

    return ws;
  }

  private generatePorbHloSheet(
    hlos: any[],
    aowMap: Map<number, { code: string; name: string }>,
    sortedAowIds: number[],
    centerNameMap: Map<number, string>,
  ) {
    const wsData: any[][] = [];
    const merges: any[] = [];

    // 2-row header with Center column
    wsData.push([
      'AOW', 'Center', 'High Level Output',
      'Key Performance Indicators', null, null, null, null,
      'Assumption', 'id',
    ]);
    wsData.push([
      null, null, null,
      'Description', 'Type', 'Country(ies) of implementation', 'Target', 'Budget (USD)',
      null, null,
    ]);

    // Header merges
    merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });   // AOW
    merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } });   // Center
    merges.push({ s: { r: 0, c: 2 }, e: { r: 1, c: 2 } });   // High Level Output
    merges.push({ s: { r: 0, c: 3 }, e: { r: 0, c: 7 } });   // KPI colspan=5
    merges.push({ s: { r: 0, c: 8 }, e: { r: 1, c: 8 } });   // Assumption
    merges.push({ s: { r: 0, c: 9 }, e: { r: 1, c: 9 } });   // id

    let currentRow = 2;

    // Group HLOs by AOW
    const hlosByAow = new Map<number, any[]>();
    for (const h of hlos) {
      const list = hlosByAow.get(h.porb_aow_id) || [];
      list.push(h);
      hlosByAow.set(h.porb_aow_id, list);
    }

    for (const aowId of sortedAowIds) {
      const aowHlos = hlosByAow.get(aowId);
      if (!aowHlos?.length) continue;

      const aowLabel = this.getAowLabel(aowId, aowMap);
      const aowStartRow = currentRow;

      // Group by hlo_name within this AOW (multiple indicators share same HLO name)
      const hloGroups: { name: string; items: any[] }[] = [];
      const nameIndex = new Map<string, number>();
      for (const h of aowHlos) {
        const name = h.hlo_name || '';
        if (nameIndex.has(name)) {
          hloGroups[nameIndex.get(name)].items.push(h);
        } else {
          nameIndex.set(name, hloGroups.length);
          hloGroups.push({ name, items: [h] });
        }
      }

      for (const group of hloGroups) {
        const startRowForHlo = currentRow;
        const totalBudget = group.items.reduce((sum, h) => sum + (Number(h.hlo_budget) || 0), 0);

        group.items.forEach((h, idx) => {
          wsData.push([
            idx === 0 ? aowLabel : null,
            centerNameMap.get(h.center_id) || String(h.center_id || ''),
            idx === 0 ? group.name : null,
            h.hlo_description || '',
            h.hlo_type || '',
            h.hlo_geo || '',
            Number(h.hlo_target) || 0,
            Number(h.hlo_budget) || 0,
            h.hlo_assumption || '',
            h.id,
          ]);
          currentRow++;
        });

        // Merge HLO name across indicator rows
        if (group.items.length > 1) {
          merges.push({ s: { r: startRowForHlo, c: 2 }, e: { r: currentRow - 1, c: 2 } });
        }
      }

      // Subtotal row
      const hloBudgetTotal = aowHlos.reduce((sum, h) => sum + (Number(h.hlo_budget) || 0), 0);
      wsData.push([null, null, 'HLO budget subtotal', null, null, null, null, hloBudgetTotal, null, '']);
      merges.push({ s: { r: currentRow, c: 2 }, e: { r: currentRow, c: 6 } });
      currentRow++;

      // AOW vertical merge
      const aowEndRow = currentRow - 1;
      if (aowEndRow > aowStartRow) {
        merges.push({ s: { r: aowStartRow, c: 0 }, e: { r: aowEndRow, c: 0 } });
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = merges;

    ws['!cols'] = [
      { wch: 8 }, { wch: 15 }, { wch: 40 }, { wch: 30 }, { wch: 30 }, { wch: 30 },
      { wch: 10 }, { wch: 15 }, { wch: 30 }, { wch: 10 },
    ];

    this.applySheetStyles(ws, wsData, {
      headerRowCount: 2,
      subtotalDetector: (row) => row?.[2] === 'HLO budget subtotal',
      wpColumnIndex: 0,
      numberColumns: [6, 7],
      rowHeights: { header: 30, data: 50, subtotal: 25 },
      merges,
    });

    this.protectAndHideIds(ws, [9]);

    return ws;
  }

  private generatePorbPartnerSheet(
    contractedPartners: PorbContractedPartner[],
    partnerMap: Map<number, any>,
    aowMap: Map<number, { code: string; name: string }>,
    sortedAowIds: number[],
    countryNameMap: Map<number, string>,
    centerNameMap: Map<number, string>,
  ) {
    const wsData: any[][] = [];
    const merges: any[] = [];

    wsData.push(['AOW', 'Partner', 'Center', 'Geographic location', 'Total Budget (USD)', 'Assumption', 'id']);

    let currentRow = 1;

    // Group contracted partners by AOW
    const cpByAow = new Map<number, PorbContractedPartner[]>();
    for (const cp of contractedPartners) {
      const list = cpByAow.get(cp.porb_aow_id) || [];
      list.push(cp);
      cpByAow.set(cp.porb_aow_id, list);
    }

    for (const aowId of sortedAowIds) {
      const aowCps = cpByAow.get(aowId);
      if (!aowCps?.length) continue;

      const aowLabel = this.getAowLabel(aowId, aowMap);
      const aowStartRow = currentRow;

      // Group by partner within this AOW
      const partnerGroups: { partnerId: number; name: string; items: PorbContractedPartner[] }[] = [];
      const pidIndex = new Map<number, number>();
      for (const cp of aowCps) {
        if (pidIndex.has(cp.porb_partner_id)) {
          partnerGroups[pidIndex.get(cp.porb_partner_id)].items.push(cp);
        } else {
          pidIndex.set(cp.porb_partner_id, partnerGroups.length);
          const partner = partnerMap.get(cp.porb_partner_id);
          partnerGroups.push({
            partnerId: cp.porb_partner_id,
            name: partner?.partner_name || String(cp.porb_partner_id),
            items: [cp],
          });
        }
      }

      for (const group of partnerGroups) {
        const startRowForPartner = currentRow;
        const totalBudget = group.items.reduce((sum, cp) => sum + (Number(cp.budget) || 0), 0);

        group.items.forEach((cp, idx) => {
          const countryCodes = this.parseCountryCodes(cp.countries);
          const countryNames = countryCodes.map((c) => countryNameMap.get(c)).filter(Boolean).join(', ');
          const centerName = centerNameMap.get(cp.center_id) || String(cp.center_id);

          wsData.push([
            idx === 0 ? aowLabel : null,
            idx === 0 ? group.name : null,
            centerName,
            countryNames || 'N/A',
            idx === 0 ? totalBudget : null,
            cp.assumption || '',
            cp.id,
          ]);
          currentRow++;
        });

        // Merge partner name + budget across center rows
        if (group.items.length > 1) {
          merges.push({ s: { r: startRowForPartner, c: 1 }, e: { r: currentRow - 1, c: 1 } });
          merges.push({ s: { r: startRowForPartner, c: 4 }, e: { r: currentRow - 1, c: 4 } });
        }
      }

      // Subtotal row
      const aowBudgetTotal = aowCps.reduce((sum, cp) => sum + (Number(cp.budget) || 0), 0);
      wsData.push([null, 'Contracted partners subtotal', null, null, aowBudgetTotal, '', '']);
      merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 3 } });
      currentRow++;

      // AOW vertical merge
      const aowEndRow = currentRow - 1;
      merges.push({ s: { r: aowStartRow, c: 0 }, e: { r: aowEndRow, c: 0 } });
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = merges;

    ws['!cols'] = [
      { wch: 8 }, { wch: 40 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 10 },
    ];

    this.applySheetStyles(ws, wsData, {
      headerRowCount: 1,
      subtotalDetector: (row) => row?.[1] === 'Contracted partners subtotal',
      wpColumnIndex: 0,
      numberColumns: [4],
      rowHeights: { header: 30, data: 50, subtotal: 25 },
      merges,
    });

    this.protectAndHideIds(ws, [6]);

    return ws;
  }

  private generatePorbBilateralSheet(
    bilaterals: any[],
    centerNameMap: Map<number, string>,
  ) {
    const wsData: any[][] = [];
    const merges: any[] = [];

    wsData.push(['Center', 'Project title', 'High Level Output title', 'W3/Bilateral Project (USD)', 'Assumption', 'id']);

    let currentRow = 1;

    // Group by center (W3/Bilateral is center-level, porb_aow_id is NULL)
    const bilByCenter = new Map<number, any[]>();
    for (const b of bilaterals) {
      const cId = b.center_id ?? 0;
      const list = bilByCenter.get(cId) || [];
      list.push(b);
      bilByCenter.set(cId, list);
    }

    const sortedCenterIds = [...bilByCenter.keys()].sort((a, b) => a - b);

    for (const cId of sortedCenterIds) {
      const centerBils = bilByCenter.get(cId);
      if (!centerBils?.length) continue;

      const centerLabel = centerNameMap.get(cId) || String(cId);
      const centerStartRow = currentRow;

      for (const b of centerBils) {
        wsData.push([
          centerLabel,
          b.bilateral_name || 'N/A',
          b.bilateral_outputs || 'N/A',
          Number(b.bilateral_budget) || 0,
          b.bilateral_assumption || '',
          b.id,
        ]);
        currentRow++;
      }

      // Subtotal row
      const centerBudgetTotal = centerBils.reduce((sum, b) => sum + (Number(b.bilateral_budget) || 0), 0);
      wsData.push([null, 'W3/Bilateral budget subtotal', null, centerBudgetTotal, '', '']);
      merges.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 2 } });
      currentRow++;

      // Center vertical merge
      const centerEndRow = currentRow - 1;
      if (centerEndRow > centerStartRow) {
        merges.push({ s: { r: centerStartRow, c: 0 }, e: { r: centerEndRow, c: 0 } });
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = merges;

    ws['!cols'] = [
      { wch: 15 }, { wch: 40 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 10 },
    ];

    this.applySheetStyles(ws, wsData, {
      headerRowCount: 1,
      subtotalDetector: (row) => row?.[1] === 'W3/Bilateral budget subtotal',
      wpColumnIndex: 0,
      numberColumns: [3],
      rowHeights: { header: 30, data: 60, subtotal: 25 },
      merges,
    });

    this.protectAndHideIds(ws, [5]);

    return ws;
  }

  private generatePorbMeliaSheet(
    melias: any[],
    aowMap: Map<number, { code: string; name: string }>,
    sortedAowIds: number[],
    centerNameMap: Map<number, string>,
  ) {
    const wsData: any[][] = [];
    const merges: any[] = [];

    wsData.push(['AOW', 'Center', 'MELIA study', 'Supported outcomes', 'Geographic location', 'Total Budget (USD)', 'Assumption', 'id']);

    let currentRow = 1;

    // Group by AOW
    const meliaByAow = new Map<number, any[]>();
    for (const m of melias) {
      const list = meliaByAow.get(m.porb_aow_id) || [];
      list.push(m);
      meliaByAow.set(m.porb_aow_id, list);
    }

    for (const aowId of sortedAowIds) {
      const aowMelias = meliaByAow.get(aowId);
      if (!aowMelias?.length) continue;

      const aowLabel = this.getAowLabel(aowId, aowMap);
      const aowStartRow = currentRow;

      for (const m of aowMelias) {
        wsData.push([
          aowLabel,
          centerNameMap.get(m.center_id) || String(m.center_id || ''),
          m.melia_name || 'N/A',
          m.melia_outputs || 'N/A',
          'N/A',
          Number(m.melia_budget) || 0,
          m.melia_assumption || '',
          m.id,
        ]);
        currentRow++;
      }

      // Subtotal row
      const aowBudgetTotal = aowMelias.reduce((sum, m) => sum + (Number(m.melia_budget) || 0), 0);
      wsData.push([null, null, 'MELIA budget subtotal', null, null, aowBudgetTotal, '', '']);
      merges.push({ s: { r: currentRow, c: 2 }, e: { r: currentRow, c: 4 } });
      currentRow++;

      // AOW vertical merge
      const aowEndRow = currentRow - 1;
      merges.push({ s: { r: aowStartRow, c: 0 }, e: { r: aowEndRow, c: 0 } });
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = merges;

    ws['!cols'] = [
      { wch: 8 }, { wch: 15 }, { wch: 40 }, { wch: 30 }, { wch: 30 }, { wch: 25 }, { wch: 30 }, { wch: 10 },
    ];

    this.applySheetStyles(ws, wsData, {
      headerRowCount: 1,
      subtotalDetector: (row) => row?.[2] === 'MELIA budget subtotal',
      wpColumnIndex: 0,
      numberColumns: [5],
      rowHeights: { header: 30, data: 60, subtotal: 25 },
      merges,
    });

    this.protectAndHideIds(ws, [7]);

    return ws;
  }

  private generatePorbCrossSheet(
    crossRows: PorbCross[],
    aowMap: Map<number, { code: string; name: string }>,
    crossItemMap: Map<number, string>,
    sortedAowIds: number[],
    centerNameMap: Map<number, string>,
  ) {
    const wsData: any[][] = [];
    const merges: any[] = [];

    wsData.push(['AOW', 'Center', 'Cost elements', 'Total budget (USD)', 'Assumption', 'id', 'standerd_cross_cutting_id']);

    let currentRow = 1;

    const crossByAow = new Map<number, PorbCross[]>();
    for (const c of crossRows) {
      const list = crossByAow.get(c.porb_aow_id) || [];
      list.push(c);
      crossByAow.set(c.porb_aow_id, list);
    }

    for (const aowId of sortedAowIds) {
      const aowCross = crossByAow.get(aowId);
      if (!aowCross?.length) continue;

      const aowLabel = this.getAowLabel(aowId, aowMap);
      const aowStartRow = currentRow;

      for (const c of aowCross) {
        const itemName = crossItemMap.get(c.standerd_cross_cutting_id) || '';
        wsData.push([
          aowLabel,
          centerNameMap.get(c.center_id) || String(c.center_id || ''),
          itemName,
          Number(c.budget) || 0,
          c.assumption || '',
          c.id,
          c.standerd_cross_cutting_id,
        ]);
        currentRow++;
      }

      // Subtotal row
      const aowBudgetTotal = aowCross.reduce((sum, c) => sum + (Number(c.budget) || 0), 0);
      wsData.push([null, null, 'Cross-cutting budget subtotal', aowBudgetTotal, '', '', '']);
      currentRow++;

      // AOW vertical merge (includes subtotal row)
      const aowEndRow = currentRow - 1;
      if (aowEndRow >= aowStartRow) {
        merges.push({ s: { r: aowStartRow, c: 0 }, e: { r: aowEndRow, c: 0 } });
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = merges;

    ws['!cols'] = [
      { wch: 10 }, { wch: 15 }, { wch: 40 }, { wch: 25 }, { wch: 30 }, { wch: 10 }, { wch: 10 },
    ];

    this.applySheetStyles(ws, wsData, {
      headerRowCount: 1,
      subtotalDetector: (row) => row?.[2] === 'Cross-cutting budget subtotal',
      wpColumnIndex: 0,
      numberColumns: [3],
      rowHeights: { header: 60, data: 45, subtotal: 25 },
      merges,
    });

    this.protectAndHideIds(ws, [5, 6]);

    return ws;
  }

  private generatePorbAnaplanSheet(
    anaplanRows: PorbAnaplan[],
    aowMap: Map<number, { code: string; name: string }>,
    sortedAowIds: number[],
  ) {
    // Build dynamic header: Main Accounts | AOW01 | AOW02 | ... | Total budget (USD)
    const aowCols = sortedAowIds.filter((id) => aowMap.has(id));
    const header = [
      'Main Accounts',
      ...aowCols.map((id) => aowMap.get(id)?.code || String(id)),
      'Total budget (USD)',
    ];

    const colCount = header.length;
    const totalBudgetColIdx = colCount - 1;

    // Get unique anaplan labels
    const anaplanLabelMap = new Map<number, string>();
    for (const row of anaplanRows) {
      if (row.anaplan?.label && !anaplanLabelMap.has(row.anaplan.id)) {
        anaplanLabelMap.set(row.anaplan.id, row.anaplan.label);
      }
    }
    const anaplanIds = [...anaplanLabelMap.keys()].sort((a, b) => a - b);

    // Build budget lookup: anaplan_id -> aow_id -> total budget
    const budgetLookup = new Map<number, Map<number, number>>();
    for (const row of anaplanRows) {
      if (!budgetLookup.has(row.anaplan_id)) {
        budgetLookup.set(row.anaplan_id, new Map());
      }
      const aowBudgets = budgetLookup.get(row.anaplan_id);
      const current = aowBudgets.get(row.porb_aow_id) || 0;
      aowBudgets.set(row.porb_aow_id, current + (Number(row.budget) || 0));
    }

    const ws = XLSX.utils.aoa_to_sheet([header]);

    const FIRST_DATA_ROW = 1;
    let currentRow = FIRST_DATA_ROW;
    const formulae: { cell: string; formula: string }[] = [];
    const sheetData: any[][] = [];

    for (const anaplanId of anaplanIds) {
      const label = anaplanLabelMap.get(anaplanId) || '';
      const rowArray: any[] = [label];
      const aowBudgets = budgetLookup.get(anaplanId) || new Map();

      for (const aowId of aowCols) {
        rowArray.push(aowBudgets.get(aowId) || 0);
      }
      rowArray.push(0); // Placeholder for SUM formula

      sheetData.push(rowArray);

      // SUM formula for row total
      const startCell = XLSX.utils.encode_cell({ r: currentRow, c: 1 });
      const endCell = XLSX.utils.encode_cell({ r: currentRow, c: totalBudgetColIdx - 1 });
      const totalCell = XLSX.utils.encode_cell({ r: currentRow, c: totalBudgetColIdx });
      formulae.push({ cell: totalCell, formula: `=SUM(${startCell}:${endCell})` });

      currentRow++;
    }

    XLSX.utils.sheet_add_aoa(ws, sheetData, { origin: -1 });

    // Subtotal row
    const SUB_TOTAL_ROW = currentRow;
    const subTotalData: any[] = ['Subtotal'];
    for (let C = 1; C < colCount; C++) {
      const startCell = XLSX.utils.encode_cell({ r: FIRST_DATA_ROW, c: C });
      const endCell = XLSX.utils.encode_cell({ r: SUB_TOTAL_ROW - 1, c: C });
      const subTotalCell = XLSX.utils.encode_cell({ r: SUB_TOTAL_ROW, c: C });
      formulae.push({ cell: subTotalCell, formula: `=SUM(${startCell}:${endCell})` });
      subTotalData.push(0);
    }
    XLSX.utils.sheet_add_aoa(ws, [subTotalData], { origin: -1 });

    // Apply formulas
    for (const { cell, formula } of formulae) {
      if (!ws[cell]) ws[cell] = { t: 'n', v: 0 };
      ws[cell].t = 'n';
      ws[cell].f = formula;
    }

    // Build wsData for styling
    const allWsData = [header, ...sheetData, subTotalData];

    ws['!cols'] = [
      { wch: 25 },
      ...Array(aowCols.length).fill({ wch: 10 }),
      { wch: 20 },
    ];

    // Style: header row, data rows, subtotal row (dark navy like submission)
    const numberCols = Array.from({ length: colCount - 1 }, (_, i) => i + 1);

    this.applySheetStyles(ws, allWsData, {
      headerRowCount: 1,
      totalRowIndex: SUB_TOTAL_ROW,
      numberColumns: numberCols,
      rowHeights: { header: 25, data: 20, subtotal: 20 },
    });

    return ws;
  }

  private generatePorbCountryPercentageSheet(
    cpRows: PorbCountryPercentage[],
    aowMap: Map<number, { code: string; name: string }>,
    sortedAowIds: number[],
    centerNameMap: Map<number, string>,
  ) {
    const wsData: any[][] = [];
    const merges: any[] = [];

    wsData.push(['AOW', 'Center', 'Country', 'Percentage (%)', 'id']);

    // Group by AOW
    const cpByAow = new Map<number, PorbCountryPercentage[]>();
    for (const row of cpRows) {
      const list = cpByAow.get(row.porb_aow_id) || [];
      list.push(row);
      cpByAow.set(row.porb_aow_id, list);
    }

    let currentRow = 1;

    for (const aowId of sortedAowIds) {
      const aowCp = cpByAow.get(aowId);
      if (!aowCp?.length) continue;

      const aowLabel = this.getAowLabel(aowId, aowMap);
      const aowStartRow = currentRow;

      // Sort by country name
      aowCp.sort((a, b) => a.country_name.localeCompare(b.country_name));

      for (const row of aowCp) {
        const pct = Number(row.percentage) || 0;
        wsData.push([
          aowLabel,
          centerNameMap.get(row.center_id) || String(row.center_id || ''),
          row.country_name,
          pct,
          row.id,
        ]);
        currentRow++;
      }

      const aowEndRow = currentRow - 1;
      if (aowEndRow >= aowStartRow) {
        merges.push({ s: { r: aowStartRow, c: 0 }, e: { r: aowEndRow, c: 0 } });
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = merges;

    ws['!cols'] = [
      { wch: 10 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 10 },
    ];

    this.applySheetStyles(ws, wsData, {
      headerRowCount: 1,
      wpColumnIndex: 0,
      numberColumns: [3],
      rowHeights: { header: 60, data: 45, subtotal: 25 },
      merges,
    });

    this.protectAndHideIds(ws, [4]);

    return ws;
  }

  private generatePorbLocationBenefitSheet(
    lbRows: PorbLocationBenefit[],
    aowMap: Map<number, { code: string; name: string }>,
    sortedAowIds: number[],
    centerNameMap: Map<number, string>,
  ) {
    const wsData: any[][] = [];
    const merges: any[] = [];

    wsData.push(['AOW', 'Center', 'Location', 'Type', 'Percentage (%)', 'id']);

    // Group by AOW
    const lbByAow = new Map<number, PorbLocationBenefit[]>();
    for (const row of lbRows) {
      const list = lbByAow.get(row.porb_aow_id) || [];
      list.push(row);
      lbByAow.set(row.porb_aow_id, list);
    }

    let currentRow = 1;

    for (const aowId of sortedAowIds) {
      const aowLb = lbByAow.get(aowId);
      if (!aowLb?.length) continue;

      const aowLabel = this.getAowLabel(aowId, aowMap);
      const aowStartRow = currentRow;

      // Sort: global first, regions, countries — alphabetically within each
      aowLb.sort((a, b) => {
        const typeOrder = { global: 0, region: 1, country: 2 };
        const aOrder = typeOrder[a.location_type] ?? 3;
        const bOrder = typeOrder[b.location_type] ?? 3;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.location_name.localeCompare(b.location_name);
      });

      for (const row of aowLb) {
        const pct = Number(row.percentage) || 0;
        wsData.push([
          aowLabel,
          centerNameMap.get(row.center_id) || String(row.center_id || ''),
          row.location_name,
          row.location_type,
          pct,
          row.id,
        ]);
        currentRow++;
      }

      const aowEndRow = currentRow - 1;
      if (aowEndRow >= aowStartRow) {
        merges.push({ s: { r: aowStartRow, c: 0 }, e: { r: aowEndRow, c: 0 } });
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = merges;

    ws['!cols'] = [
      { wch: 10 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 10 },
    ];

    this.applySheetStyles(ws, wsData, {
      headerRowCount: 1,
      wpColumnIndex: 0,
      numberColumns: [4],
      rowHeights: { header: 60, data: 45, subtotal: 25 },
      merges,
    });

    this.protectAndHideIds(ws, [5]);

    return ws;
  }

  private generatePorbSynergySheet(
    synergies: PorbSynergy[],
    aowMap: Map<number, { code: string; name: string }>,
    sortedAowIds: number[],
  ) {
    const wsData: any[][] = [];
    const merges: any[] = [];

    wsData.push(['AOW', 'Program or Accelerator', 'High Level Output', 'Brief description', 'id']);

    let currentRow = 1;

    // Group by AOW
    const synergyByAow = new Map<number, PorbSynergy[]>();
    for (const s of synergies) {
      const list = synergyByAow.get(s.porb_aow_id) || [];
      list.push(s);
      synergyByAow.set(s.porb_aow_id, list);
    }

    for (const aowId of sortedAowIds) {
      const aowSynergies = synergyByAow.get(aowId);
      if (!aowSynergies?.length) continue;

      const aowLabel = this.getAowLabel(aowId, aowMap);
      const aowStartRow = currentRow;

      for (const s of aowSynergies) {
        wsData.push([
          aowLabel,
          s.synergy_program_name || '',
          s.synergy_hlo_title || '',
          s.synergy_description || '',
          s.id,
        ]);
        currentRow++;
      }

      // AOW vertical merge
      const aowEndRow = currentRow - 1;
      if (aowEndRow > aowStartRow) {
        merges.push({ s: { r: aowStartRow, c: 0 }, e: { r: aowEndRow, c: 0 } });
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = merges;

    ws['!cols'] = [
      { wch: 8 }, { wch: 35 }, { wch: 40 }, { wch: 50 }, { wch: 10 },
    ];

    this.applySheetStyles(ws, wsData, {
      headerRowCount: 1,
      wpColumnIndex: 0,
      rowHeights: { header: 30, data: 60, subtotal: 25 },
      merges,
    });

    this.protectAndHideIds(ws, [4]);

    return ws;
  }

  private generatePorbOutcomeSheet(
    outcomes: PorbOutcome[],
    aowMap: Map<number, { code: string; name: string }>,
    sortedAowIds: number[],
  ) {
    const wsData: any[][] = [];
    const merges: any[] = [];

    wsData.push(['AOW', 'Outcome', 'Type of Outcome', 'Indicator Type', 'Geographic Location', 'Target Value', 'id']);

    let currentRow = 1;

    // Group by AOW
    const outcomeByAow = new Map<number, PorbOutcome[]>();
    for (const o of outcomes) {
      const list = outcomeByAow.get(o.porb_aow_id) || [];
      list.push(o);
      outcomeByAow.set(o.porb_aow_id, list);
    }

    for (const aowId of sortedAowIds) {
      const aowOutcomes = outcomeByAow.get(aowId);
      if (!aowOutcomes?.length) continue;

      const aowLabel = this.getAowLabel(aowId, aowMap);
      const aowStartRow = currentRow;

      for (const o of aowOutcomes) {
        const indicators = Array.isArray(o.outcome_indicators) ? o.outcome_indicators as any[] : [];
        if (indicators.length > 0) {
          const outcomeStartRow = currentRow;
          for (const ind of indicators) {
            wsData.push([
              aowLabel,
              o.outcome_title || '',
              o.outcome_type || '',
              ind.type || '',
              ind.location || '',
              Number(ind.target_value) || 0,
              o.id,
            ]);
            currentRow++;
          }
          // Merge Outcome + Type columns across indicator rows
          if (indicators.length > 1) {
            merges.push({ s: { r: outcomeStartRow, c: 1 }, e: { r: currentRow - 1, c: 1 } });
            merges.push({ s: { r: outcomeStartRow, c: 2 }, e: { r: currentRow - 1, c: 2 } });
          }
        } else {
          // No indicators — single row with empty indicator cells
          wsData.push([
            aowLabel,
            o.outcome_title || '',
            o.outcome_type || '',
            '',
            '',
            0,
            o.id,
          ]);
          currentRow++;
        }
      }

      // AOW vertical merge
      const aowEndRow = currentRow - 1;
      if (aowEndRow > aowStartRow) {
        merges.push({ s: { r: aowStartRow, c: 0 }, e: { r: aowEndRow, c: 0 } });
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = merges;

    ws['!cols'] = [
      { wch: 8 }, { wch: 40 }, { wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 10 },
    ];

    this.applySheetStyles(ws, wsData, {
      headerRowCount: 1,
      wpColumnIndex: 0,
      numberColumns: [5],
      rowHeights: { header: 30, data: 60, subtotal: 25 },
      merges,
    });

    this.protectAndHideIds(ws, [6]);

    return ws;
  }

  /**
   * Build a full JSON snapshot of all PORB data for a program.
   * Used when submitting to freeze the data at that point in time.
   */
  public async buildPorbSnapshot(programId: number) {
    // Get all AOWs
    const aows = await this.getAows(programId);

    // Get all centers assigned to this program
    const activePhase = await this.phasesService.findActivePhase();
    let centers: Organization[] = [];
    if (activePhase) {
      centers = await this.phasesService.fetchAssignedOrganizations(
        activePhase.id,
        programId,
      );
    }
    if (!centers?.length) {
      centers = await this.organizationRepo.find();
    }

    // Bulk-load synergies and outcomes for all AOWs (avoid N+1)
    const [allSynergies, allOutcomes] = await Promise.all([
      this.porbSynergyRepository.find({ where: { program_id: programId, toc_is_deleted: false } }),
      this.porbOutcomeRepository.find({ where: { program_id: programId, toc_is_deleted: false } }),
    ]);
    const synergyByAow = new Map<number, PorbSynergy[]>();
    for (const s of allSynergies) {
      const list = synergyByAow.get(s.porb_aow_id) || [];
      list.push(s);
      synergyByAow.set(s.porb_aow_id, list);
    }
    const outcomeByAow = new Map<number, PorbOutcome[]>();
    for (const o of allOutcomes) {
      const list = outcomeByAow.get(o.porb_aow_id) || [];
      list.push(o);
      outcomeByAow.set(o.porb_aow_id, list);
    }

    // Build per-AOW, per-center data
    const aowSnapshots = [];
    for (const aow of aows) {
      const synergies = synergyByAow.get(aow.id) || [];
      const outcomes = outcomeByAow.get(aow.id) || [];

      const centerSnapshots = [];
      for (const center of centers) {
        const centerId = Number(center.code);
        const centerName =
          center.acronym || center.name || String(centerId);

        // Fetch all section data for this AOW+center combo
        const [hlos, partners, melias, anaplan, cross, countryPercentages, locationBenefits] =
          await Promise.all([
            this.getHlos(programId, aow.id, centerId),
            this.getPartners(programId, aow.id, centerId),
            this.getMelia(programId, aow.id, centerId),
            this.getAnaplan(programId, aow.id, centerId),
            this.getCross(programId, aow.id, centerId),
            this.getCountryPercentage(programId, aow.id, centerId),
            this.getLocationBenefit(programId, aow.id, centerId),
          ]);

        centerSnapshots.push({
          center_code: centerId,
          center_name: centerName,
          hlos,
          partners,
          melias,
          anaplan,
          cross_cutting: cross,
          country_percentages: countryPercentages,
          location_benefits: locationBenefits,
        });
      }

      aowSnapshots.push({
        id: aow.id,
        toc_id: aow.toc_id,
        aow_name: aow.aow_name,
        aow_acrnum: aow.aow_acrnum,
        synergies,
        outcomes,
        centers: centerSnapshots,
      });
    }

    // Bilaterals are center-level (not per-AOW)
    const bilateralSnapshots = [];
    for (const center of centers) {
      const bilaterals = await this.getBilaterals(
        programId,
        undefined,
        Number(center.code),
      );
      for (const b of bilaterals) {
        bilateralSnapshots.push(b);
      }
    }

    return {
      snapshot_version: 1,
      program_id: programId,
      submitted_at: new Date().toISOString(),
      aows: aowSnapshots,
      bilaterals: bilateralSnapshots,
    };
  }

  /**
   * Get a submitted PORB version with its snapshot data.
   * Approved versions are viewable by any authenticated user.
   * Pending/rejected: only program team members and admins.
   */
  async getSubmissionVersion(
    submissionId: number,
    reqUser: { id: number; role?: string },
  ) {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['user', 'phase', 'initiative'],
    });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Approved versions viewable by any authenticated user
    // Pending/rejected: only program team + admins
    if (submission.status !== SubmissionStatus.APPROVED) {
      const user = await this.userRepository.findOneBy({ id: reqUser.id });
      if (user?.role !== userRole.ADMIN) {
        const initWithRoles = await this.initiativeRepository.findOne({
          where: { id: submission.initiative_id },
          relations: ['roles'],
        });
        const isTeamMember = initWithRoles?.roles?.some(
          (r) => r.user_id === reqUser.id,
        );
        if (!isTeamMember) {
          throw new ForbiddenException('Access denied');
        }
      }
    }

    return {
      id: submission.id,
      status: submission.status,
      status_reason: submission.status_reason,
      created_at: submission.created_at,
      user: submission.user
        ? {
            id: submission.user.id,
            full_name: submission.user.full_name || submission.user.email,
          }
        : null,
      phase: submission.phase
        ? { id: submission.phase.id, name: submission.phase.name }
        : null,
      initiative: submission.initiative
        ? {
            id: submission.initiative.id,
            official_code: submission.initiative.official_code,
            name: submission.initiative.name,
          }
        : null,
      porb_data: submission.porb_data
        ? JSON.parse(submission.porb_data)
        : null,
      toc_data: submission.toc_data
        ? typeof submission.toc_data === 'string'
          ? JSON.parse(submission.toc_data)
          : submission.toc_data
        : null,
    };
  }

  /**
   * Generate a ZIP export from a submission's snapshot data.
   * Currently generates from live DB data (TODO: generate from snapshot).
   */
  async generateVersionZip(
    submissionId: number,
    res: Response,
    reqUser: { id: number; role?: string },
  ) {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['initiative'],
    });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    if (!submission.porb_data) {
      throw new BadRequestException('No PORB data for this submission');
    }

    // Override the filename with the submission's own status
    const code = submission.initiative?.official_code || String(submission.initiative_id);
    const versionStatus = submission.status || 'Draft';
    const zipName = `${versionStatus}_PORB_${code}_v${submissionId}`;

    const activePhase = await this.phasesService.findActivePhase();
    let centers = await this.phasesService.fetchAssignedOrganizations(
      activePhase?.id,
      submission.initiative_id,
    );
    if (!centers?.length) {
      centers = await this.organizationRepo.find();
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}.zip"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    const summaryWb = await this.buildPorbWorkbook(submission.initiative_id, undefined);
    const summaryBuf = Buffer.from(XLSX.write(summaryWb, { type: 'buffer', bookType: 'xlsx', cellStyles: true }));
    archive.append(summaryBuf, { name: `${zipName}/Summary.xlsx` });

    for (const center of centers) {
      const centerName = center.acronym || center.name || String(center.code);
      const wb = await this.buildPorbWorkbook(submission.initiative_id, center.code);
      const buf = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true }));
      archive.append(buf, { name: `${zipName}/${centerName}.xlsx` });
    }

    await archive.finalize();
  }
}
