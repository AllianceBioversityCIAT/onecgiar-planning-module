import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
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
import { catchError, firstValueFrom, map } from 'rxjs';
import { AxiosError } from 'axios';
import { InitiativesService } from 'src/initiatives/initiatives.service';
import { PhasesService } from 'src/phases/phases.service';
import { HttpService } from '@nestjs/axios';
import { SubmissionService } from 'src/submission/submission.service';

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
    private readonly initService: InitiativesService,
    private readonly phasesService: PhasesService,
    private readonly httpService: HttpService,
    private readonly submissionService: SubmissionService,
  ) {}

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
    const contractedRows = await this.porbContractedPartnerRepository.find({ where: contractedWhere });
    const contractedMap = new Map<number, PorbContractedPartner>();
    for (const row of contractedRows) {
      contractedMap.set(row.porb_partner_id, row);
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
      };
    });
  }

  getBilaterals(program_id: number, porb_aow_id?: number, center_id?: number) {
    const where: any = { program_id };
    if (porb_aow_id != null) where.porb_aow_id = porb_aow_id;
    if (center_id != null) where.center_id = center_id;

    return this.porbBilateralRepository.find({
      where,
      order: { id: 'ASC' },
    });
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
          partners: 0,
          melia: 0,
          pooledTotal: 0,
          w3: 0,
          consolidatedTotal: 0,
          anaplan: 0,
        },
      };
    }

    const [hlos, partners, contractedPartners, meliaRows, w3Rows, anaplanRows] = await Promise.all([
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
      this.porbBilateralRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
      this.porbAnaplanRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
    ]);

    const partnerIds = new Set(partners.map((row) => row.id));
    const relevantContracted = contractedPartners.filter((row) => partnerIds.has(row.porb_partner_id));

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
    const w3 = w3Rows.reduce((sum, row) => sum + (Number(row?.bilateral_budget) || 0), 0);
    const anaplan = anaplanRows.reduce((sum, row) => sum + (Number(row?.budget) || 0), 0);
    const pooledTotal = poolHlo + partnersTotal + melia;
    const consolidatedTotal = pooledTotal + w3;

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
        partners: partnersTotal,
        melia,
        pooledTotal,
        w3,
        consolidatedTotal,
        anaplan,
      },
    };
  }

  async getSummaryConsolidation(program_id: number) {
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

    // Bulk-load all data for this program (no center filter = all centers)
    const [allHlos, allPartners, allContracted, allMelia, allBilateral, allAnaplan] = await Promise.all([
      this.porbHloRepository.find({ where: { program_id, porb_aow_id: In(aowIds) } }),
      this.porbPartnerRepository.find({ where: { program_id, porb_aow_id: In(aowIds) } }),
      this.porbContractedPartnerRepository.find({ where: { program_id } }),
      this.porbMeliaRepository.find({ where: { program_id, porb_aow_id: In(aowIds) } }),
      this.porbBilateralRepository.find({ where: { program_id, porb_aow_id: In(aowIds) } }),
      this.porbAnaplanRepository.find({ where: { program_id, porb_aow_id: In(aowIds) } }),
    ]);

    // Group HLOs by porb_aow_id
    const hlosByAow = new Map<number, typeof allHlos>();
    for (const row of allHlos) {
      const list = hlosByAow.get(row.porb_aow_id) || [];
      list.push(row);
      hlosByAow.set(row.porb_aow_id, list);
    }

    // Group partners by porb_aow_id, and build a set of partner IDs per AOW
    const partnersByAow = new Map<number, typeof allPartners>();
    for (const row of allPartners) {
      const list = partnersByAow.get(row.porb_aow_id) || [];
      list.push(row);
      partnersByAow.set(row.porb_aow_id, list);
    }

    // Map contracted partners by porb_partner_id
    const contractedByPartnerId = new Map<number, PorbContractedPartner[]>();
    for (const row of allContracted) {
      const list = contractedByPartnerId.get(row.porb_partner_id) || [];
      list.push(row);
      contractedByPartnerId.set(row.porb_partner_id, list);
    }

    // Group melia by porb_aow_id
    const meliaByAow = new Map<number, typeof allMelia>();
    for (const row of allMelia) {
      const list = meliaByAow.get(row.porb_aow_id) || [];
      list.push(row);
      meliaByAow.set(row.porb_aow_id, list);
    }

    // Group bilateral by porb_aow_id
    const bilateralByAow = new Map<number, typeof allBilateral>();
    for (const row of allBilateral) {
      const list = bilateralByAow.get(row.porb_aow_id) || [];
      list.push(row);
      bilateralByAow.set(row.porb_aow_id, list);
    }

    // Group anaplan by porb_aow_id
    const anaplanByAow = new Map<number, typeof allAnaplan>();
    for (const row of allAnaplan) {
      const list = anaplanByAow.get(row.porb_aow_id) || [];
      list.push(row);
      anaplanByAow.set(row.porb_aow_id, list);
    }

    const totals = {
      innovationTarget: 0, innovationBudget: 0,
      knowledgeTarget: 0, knowledgeBudget: 0,
      capacityTarget: 0, capacityBudget: 0,
      othersTarget: 0, othersBudget: 0,
      partnerBudget: 0, meliaBudget: 0,
      totalPooledFunding: 0, w3Budget: 0,
      anaplanBudget: 0, consolidatedTotal: 0,
    };

    const rows = aows.map((aow) => {
      const hlos = hlosByAow.get(aow.id) || [];
      const partners = partnersByAow.get(aow.id) || [];
      const meliaRows = meliaByAow.get(aow.id) || [];
      const bilateralRows = bilateralByAow.get(aow.id) || [];

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

      // Partner budget: sum contracted partner budgets for this AOW's partners
      const partnerIdSet = new Set(partners.map((p) => p.id));
      let partnerBudget = 0;
      for (const [partnerId, contractedList] of contractedByPartnerId) {
        if (partnerIdSet.has(partnerId)) {
          for (const c of contractedList) {
            partnerBudget += Number(c?.budget) || 0;
          }
        }
      }

      const meliaBudget = meliaRows.reduce((sum, r) => sum + (Number(r?.melia_budget) || 0), 0);
      const w3Budget = bilateralRows.reduce((sum, r) => sum + (Number(r?.bilateral_budget) || 0), 0);
      const anaplanRows = anaplanByAow.get(aow.id) || [];
      const anaplanBudget = anaplanRows.reduce((sum, r) => sum + (Number(r?.budget) || 0), 0);
      const totalPooledFunding =
        ind.innovationBudget + ind.knowledgeBudget + ind.capacityBudget +
        ind.othersBudget + partnerBudget + meliaBudget;
      const consolidatedTotal = totalPooledFunding + w3Budget;

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
      totals.totalPooledFunding += totalPooledFunding;
      totals.w3Budget += w3Budget;
      totals.anaplanBudget += anaplanBudget;
      totals.consolidatedTotal += consolidatedTotal;

      return {
        aowId: aow.id,
        aowCode: aow.aow_acrnum || '',
        aowName: aow.aow_name || '',
        ...ind,
        partnerBudget,
        meliaBudget,
        totalPooledFunding,
        w3Budget,
        anaplanBudget,
        consolidatedTotal,
      };
    });

    return { rows, totals };
  }

  async getValidation(program_id: number, porb_aow_id?: number, center_id?: number) {
    const sectionNames = ['Pool funding HLO', 'Partners', 'W3/Bilatral', 'MELIA Study', 'Anaplan', 'Cross Cutting'];
    const emptyResult: Record<string, { hasError: boolean; message: string }> = {};
    sectionNames.forEach((name) => {
      emptyResult[name] = { hasError: false, message: '' };
    });

    if (porb_aow_id == null || center_id == null) {
      return emptyResult;
    }

    const [hlos, partners, contractedRows, w3Rows, meliaRows, crossRows, selectedAow] = await Promise.all([
      this.porbHloRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
      this.porbPartnerRepository.find({
        where: { program_id, porb_aow_id },
      }),
      this.porbContractedPartnerRepository.find({
        where: { program_id, center_id },
      }),
      this.porbBilateralRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
      this.porbMeliaRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
      this.porbCrossRepository.find({
        where: { program_id, porb_aow_id, center_id },
      }),
      this.porbAowRepository.findOne({ where: { id: porb_aow_id } }),
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
    emptyResult['Pool funding HLO'] = {
      hasError: poolMissing > 0,
      message: poolMissing > 0 ? `${poolMissing} row(s) have budget but missing assumption.` : '',
    };

    const partnerIds = new Set(partners.map((row) => row.id));
    const relevantContracted = contractedRows.filter((row) => partnerIds.has(row.porb_partner_id));
    const partnerById = new Map<number, PorbPartner>();
    partners.forEach((row) => partnerById.set(row.id, row));

    let partnerBudgetMissingAssumption = 0;
    let contractedMissingBudgetOrAssumption = 0;
    for (const contracted of relevantContracted) {
      const budget = parseBudget(contracted?.budget);
      const partner = partnerById.get(contracted.porb_partner_id);
      const assumption = partner?.partner_assumption;

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
    emptyResult['Partners'] = {
      hasError: partnerMessages.length > 0,
      message: partnerMessages.join(' '),
    };

    const w3Missing = w3Rows.filter(
      (row) => parseBudget(row?.bilateral_budget) > 0 && !hasAssumption(row?.bilateral_assumption),
    ).length;
    emptyResult['W3/Bilatral'] = {
      hasError: w3Missing > 0,
      message: w3Missing > 0 ? `${w3Missing} row(s) have budget but missing assumption.` : '',
    };

    const meliaMissing = meliaRows.filter(
      (row) => parseBudget(row?.melia_budget) > 0 && !hasAssumption(row?.melia_assumption),
    ).length;
    emptyResult['MELIA Study'] = {
      hasError: meliaMissing > 0,
      message: meliaMissing > 0 ? `${meliaMissing} row(s) have budget but missing assumption.` : '',
    };

    emptyResult['Anaplan'] = { hasError: false, message: '' };
    const isCrossAow =
      String(selectedAow?.aow_acrnum || '')
        .trim()
        .toUpperCase() === 'AOW00';
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
    return emptyResult;
  }

  async getValidationSummary(program_id: number, center_id?: number) {
    const centerErrorCodes = new Set<string>();
    const aowErrorIds = new Set<number>();
    const includeAowForCenter = center_id != null;

    const [hlos, bilaterals, melias, partners, contractedRows, crossRows] = await Promise.all([
      this.porbHloRepository.find({ where: { program_id } }),
      this.porbBilateralRepository.find({ where: { program_id } }),
      this.porbMeliaRepository.find({ where: { program_id } }),
      this.porbPartnerRepository.find({ where: { program_id } }),
      this.porbContractedPartnerRepository.find({ where: { program_id } }),
      this.porbCrossRepository.find({ where: { program_id } }),
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
        pushError(row?.center_id, row?.porb_aow_id);
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
    for (const partner of partners) {
      if (partner?.toc_is_deleted) continue;
      partnerById.set(partner.id, partner);
    }

    for (const contracted of contractedRows) {
      const partner = partnerById.get(contracted?.porb_partner_id);
      if (!partner) continue;
      const budget = parseBudget(contracted?.budget);
      const hasPartnerAssumption = hasAssumption(partner?.partner_assumption);
      if (budget > 0 && !hasPartnerAssumption) {
        pushError(contracted?.center_id, partner?.porb_aow_id);
        continue;
      }
      if (budget <= 0 || !hasPartnerAssumption) {
        pushError(contracted?.center_id, partner?.porb_aow_id);
      }
    }

    return {
      center_error_codes: Array.from(centerErrorCodes),
      aow_error_ids: Array.from(aowErrorIds),
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
    if (porb_aow_id == null || center_id == null) {
      return [];
    }

    const selectedAow = await this.porbAowRepository.findOne({
      where: { id: porb_aow_id, program_id },
    });
    if (!selectedAow || String(selectedAow.aow_acrnum || '').toUpperCase() !== 'AOW00') {
      return [];
    }

    const crossItems = await this.crossCuttingRepository.find({
      where: {
        initiative_id: program_id,
        submission_id: IsNull(),
      },
      order: { title: 'ASC' },
    });
    if (!crossItems.length) {
      return [];
    }

    const crossIds = crossItems.map((item) => String(item.id));
    const savedRows = await this.porbCrossRepository.find({
      where: {
        program_id,
        porb_aow_id,
        center_id,
        cross_cutting_id: In(crossIds),
      },
    });
    const savedMap = new Map<string, PorbCross>();
    savedRows.forEach((row) => savedMap.set(String(row.cross_cutting_id), row));

    return crossItems.map((item) => {
      const saved = savedMap.get(String(item.id));
      return {
        program_id,
        porb_aow_id,
        center_id,
        cross_cutting_id: String(item.id),
        title: item.title || '',
        description: item.description || '',
        budget: saved?.budget ?? null,
        assumption: saved?.assumption || '',
      };
    });
  }

  async updateHlo(id: number, data: Partial<PorbHlo>) {
    await this.porbHloRepository.update(id, data);
    return this.porbHloRepository.findOne({ where: { id } });
  }

  async updatePartner(
    id: number,
    data: {
      partner_is_contracted?: boolean | string;
      center_id?: number | string;
      partner_geo?: string;
      partner_country_codes?: Array<number | string>;
      partner_budget?: number | null;
      partner_assumption?: string;
    },
  ) {
    const partner = await this.porbPartnerRepository.findOne({ where: { id } });
    if (!partner) {
      throw new BadRequestException('Partner row not found.');
    }

    const isContracted =
      data.partner_is_contracted === true ||
      data.partner_is_contracted === 'true' ||
      data.partner_is_contracted === '1';
    const centerId = Number(data.center_id);
    if (!Number.isFinite(centerId)) {
      throw new BadRequestException('Center is required for partner updates.');
    }
    const selectedCountryCodes = this.normalizeCountryCodes(data.partner_country_codes);

    let partnerGeo = data.partner_geo ?? partner.partner_geo ?? '';

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
      const countriesLabel = validCountries.map((country) => country.name).join(', ');
      partnerGeo = countriesLabel;

      const contractedBudget =
        data.partner_budget != null && data.partner_budget !== ('' as any)
          ? Number(data.partner_budget)
          : null;

      const existing = await this.porbContractedPartnerRepository.findOne({
        where: { porb_partner_id: id, center_id: centerId },
      });

      if (existing) {
        await this.porbContractedPartnerRepository.update(existing.id, {
          center_id: centerId,
          countries,
          budget: contractedBudget,
        });
      } else {
        const row = this.porbContractedPartnerRepository.create({
          program_id: partner.program_id,
          center_id: centerId,
          porb_partner_id: id,
          countries,
          budget: contractedBudget,
        });
        await this.porbContractedPartnerRepository.save(row);
      }

    } else {
      await this.porbContractedPartnerRepository.delete({ porb_partner_id: id, center_id: centerId });
    }

    await this.porbPartnerRepository.update(id, {
      partner_geo: partnerGeo,
      partner_budget: null,
      partner_assumption: data.partner_assumption ?? partner.partner_assumption ?? '',
    });

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

    return {
      ...updated,
      partner_geo: partnerGeo,
      partner_assumption: updated.partner_assumption ?? '',
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

  async updateBilateral(id: number, data: Partial<PorbBilateral>) {
    await this.porbBilateralRepository.update(id, data);
    return this.porbBilateralRepository.findOne({ where: { id } });
  }

  async updateMelia(id: number, data: Partial<PorbMelia>) {
    await this.porbMeliaRepository.update(id, data);
    return this.porbMeliaRepository.findOne({ where: { id } });
  }

  async updateAnaplan(data: {
    program_id: number;
    porb_aow_id: number;
    center_id: number;
    anaplan_id: number;
    budget?: number | null;
  }) {
    const existing = await this.porbAnaplanRepository.findOne({
      where: {
        program_id: data.program_id,
        porb_aow_id: data.porb_aow_id,
        center_id: data.center_id,
        anaplan_id: data.anaplan_id,
      },
    });

    if (existing) {
      await this.porbAnaplanRepository.update(existing.id, {
        budget: data.budget ?? null,
      });
      return this.porbAnaplanRepository.findOne({ where: { id: existing.id } });
    }

    const created = this.porbAnaplanRepository.create({
      program_id: data.program_id,
      porb_aow_id: data.porb_aow_id,
      center_id: data.center_id,
      anaplan_id: data.anaplan_id,
      budget: data.budget ?? null,
    });
    return this.porbAnaplanRepository.save(created);
  }

  async updateCross(data: {
    program_id: number;
    porb_aow_id: number;
    center_id: number;
    cross_cutting_id: string;
    budget?: number | null;
    assumption?: string;
  }) {
    const existing = await this.porbCrossRepository.findOne({
      where: {
        program_id: data.program_id,
        porb_aow_id: data.porb_aow_id,
        center_id: data.center_id,
        cross_cutting_id: data.cross_cutting_id,
      },
    });

    if (existing) {
      await this.porbCrossRepository.update(existing.id, {
        budget: data.budget ?? null,
        assumption: String(data.assumption || ''),
      });
      return this.porbCrossRepository.findOne({ where: { id: existing.id } });
    }

    const created = this.porbCrossRepository.create({
      program_id: data.program_id,
      porb_aow_id: data.porb_aow_id,
      center_id: data.center_id,
      cross_cutting_id: data.cross_cutting_id,
      budget: data.budget ?? null,
      assumption: String(data.assumption || ''),
    });
    return this.porbCrossRepository.save(created);
  }

  async createCross(data: {
    program_id: number;
    porb_aow_id: number;
    center_id: number;
    title: string;
    description?: string;
    budget?: number | null;
    assumption?: string;
  }) {
    const title = String(data.title || '').trim();
    if (!title) {
      throw new BadRequestException('Cross cutting title is required.');
    }

    const selectedAow = await this.porbAowRepository.findOne({
      where: { id: data.porb_aow_id, program_id: data.program_id },
    });
    if (!selectedAow || String(selectedAow.aow_acrnum || '').toUpperCase() !== 'AOW00') {
      throw new BadRequestException('Cross cutting rows are only available for AOW00.');
    }

    const cross = await this.crossCuttingRepository.save(
      this.crossCuttingRepository.create({
        initiative_id: data.program_id,
        title,
        description: String(data.description || ''),
        submission_id: null,
      }),
    );

    await this.updateCross({
      program_id: data.program_id,
      porb_aow_id: data.porb_aow_id,
      center_id: data.center_id,
      cross_cutting_id: String(cross.id),
      budget: data.budget ?? null,
      assumption: String(data.assumption || ''),
    });

    return {
      program_id: data.program_id,
      porb_aow_id: data.porb_aow_id,
      center_id: data.center_id,
      cross_cutting_id: String(cross.id),
      title: cross.title || '',
      description: cross.description || '',
      budget: data.budget ?? null,
      assumption: String(data.assumption || ''),
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
    const regions = Array.isArray(node?.regions) ? node.regions : [];
    const countries = Array.isArray(node?.countries) ? node.countries : [];

    if (location === 'global') {
      return 'Global';
    }
    if (location === 'region' || location === 'regional') {
      const names = regions
        .map((r: any) => r?.name || r?.acronym || r?.id)
        .filter(Boolean);
      return names.length ? `Region: ${names.join(', ')}` : 'Region';
    }
    if (location === 'country') {
      const names = countries
        .map((c: any) => c?.name || c?.isoAlpha2 || c?.code || c?.id)
        .filter(Boolean);
      return names.length ? `Country: ${names.join(', ')}` : 'Country';
    }
    return '';
  }

  private deriveHloGeo(item: any): string {
    const direct = this.parseGeoFromLocation(item);
    if (direct) return direct;

    const indicators = Array.isArray(item?.quantitative_indicators)
      ? item.quantitative_indicators
      : [];
    for (const indicator of indicators) {
      const geo = this.parseGeoFromLocation(indicator);
      if (geo) return geo;
    }

    if (Array.isArray(item?.pooled_centers) && item.pooled_centers.length) {
      return item.pooled_centers
        .map((c: any) => c?.acronym || c?.name || c?.code || '')
        .filter(Boolean)
        .join(', ');
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

  private async syncTocDeletedFlags(
    repository: Repository<any>,
    existingRows: Array<{ id: number; toc_id: string; toc_is_deleted?: boolean }>,
    currentTocIds: Set<string>,
  ) {
    const idsToDelete = existingRows
      .filter((row) => !currentTocIds.has(String(row.toc_id)) && !row.toc_is_deleted)
      .map((row) => row.id);
    const idsToRestore = existingRows
      .filter((row) => currentTocIds.has(String(row.toc_id)) && row.toc_is_deleted)
      .map((row) => row.id);

    if (idsToDelete.length) {
      await repository.update({ id: In(idsToDelete) }, { toc_is_deleted: true });
    }
    if (idsToRestore.length) {
      await repository.update({ id: In(idsToRestore) }, { toc_is_deleted: false });
    }
  }

  async getSummaryAowDetail(program_id: number, porb_aow_id: number) {
    const [hlos, partners, melia, bilateral, selectedAow] = await Promise.all([
      this.getHlos(program_id, porb_aow_id),
      this.getPartners(program_id, porb_aow_id),
      this.getMelia(program_id, porb_aow_id),
      this.getBilaterals(program_id, porb_aow_id),
      this.porbAowRepository.findOne({ where: { id: porb_aow_id, program_id } }),
    ]);

    // Cross-cutting only applies to AOW00
    let cross: any[] = [];
    const isAow00 = String(selectedAow?.aow_acrnum || '').toUpperCase() === 'AOW00';
    if (isAow00) {
      const crossItems = await this.crossCuttingRepository.find({
        where: { initiative_id: program_id, submission_id: IsNull() },
        order: { title: 'ASC' },
      });
      if (crossItems.length) {
        const crossIds = crossItems.map((item) => String(item.id));
        const savedRows = await this.porbCrossRepository.find({
          where: { program_id, porb_aow_id, cross_cutting_id: In(crossIds) },
        });
        // Aggregate budgets per cross_cutting_id across all centers
        const budgetMap = new Map<string, number>();
        for (const row of savedRows) {
          const key = String(row.cross_cutting_id);
          budgetMap.set(key, (budgetMap.get(key) || 0) + (Number(row.budget) || 0));
        }
        cross = crossItems.map((item) => ({
          cross_cutting_id: String(item.id),
          title: item.title || '',
          description: item.description || '',
          budget: budgetMap.get(String(item.id)) || 0,
        }));
      }
    }

    const subtotals = {
      hlo: hlos.reduce((sum, row) => sum + (Number(row?.hlo_budget) || 0), 0),
      partners: (partners as any[]).reduce(
        (sum, row) => sum + (Number(row?.partner_budget) || 0),
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

    return { hlos, partners, melia, bilateral, cross, isAow00, subtotals };
  }

  async importTocToPorbTables(programId: number, officialCode: string) {
    const CROSS_AOW_TOC_ID = '00000000-0000-0000-0000-000000000000';
    const activePhase =
      await this.submissionService.PhasesService.findActivePhase();
    const tocData: any = await this.getTocs(officialCode);
    const toc = await Promise.resolve(tocData);
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

    const outputNodes = results.filter((item: any) => item?.category === 'OUTPUT');
    const hloRows: any[] = [];
    for (const item of outputNodes) {
      const parentAow = resolveParentAow(item?.group, item?.parent_id);
      for (const indicator of item?.quantitative_indicators || []) {
        for (const target of indicator?.targets || []) {
          for (const center of target?.centers || []) {
            const centerId = Number(center?.code);
            if (!Number.isFinite(centerId)) {
              continue;
            }
            hloRows.push(
              this.porbHloRepository.create({
                program_id: programId,
                porb_aow_id: parentAow?.id ?? null,
                toc_id: String(indicator?.id || ''),
                center_id: centerId,
                hlo_name: item?.title || '',
                hlo_description: indicator?.description || '',
                hlo_type: indicator?.type?.value || 'others',
                hlo_geo: this.deriveHloGeo(item),
                hlo_target: target[activePhase.reportingYear] || null,
                hlo_budget: 0,
                hlo_assumption: '',
                toc_is_deleted: false,
              }),
            );
          }
        }
      }
    }

    const existingHlos = await this.porbHloRepository.find({
      where: { program_id: programId },
    });
    const existingHloByKey = new Map<string, PorbHlo>();
    existingHlos.forEach((row) =>
      existingHloByKey.set(`${String(row.toc_id)}::${Number(row.center_id)}`, row),
    );
    const existingHloKeys = new Set(
      existingHlos.map((row) => `${String(row.toc_id)}::${Number(row.center_id)}`),
    );
    const newHloRows = hloRows.filter(
      (row) => !existingHloKeys.has(`${String(row.toc_id)}::${Number(row.center_id)}`),
    );
    const hloUpdates = hloRows
      .map((row) => {
        const key = `${String(row.toc_id)}::${Number(row.center_id)}`;
        const existing = existingHloByKey.get(key);
        if (!existing) {
          return null;
        }
        const nextAowId = row?.porb_aow_id ?? null;
        const currentAowId = existing?.porb_aow_id ?? null;
        if (Number(currentAowId || 0) === Number(nextAowId || 0)) {
          return null;
        }
        return { id: existing.id, porb_aow_id: nextAowId };
      })
      .filter(Boolean) as Array<{ id: number; porb_aow_id: number | null }>;
    if (hloUpdates.length) {
      await Promise.all(
        hloUpdates.map((item) =>
          this.porbHloRepository.update(item.id, { porb_aow_id: item.porb_aow_id }),
        ),
      );
    }
    const savedHlos = newHloRows.length ? await this.porbHloRepository.save(newHloRows) : [];
    await this.syncTocDeletedFlags(
      this.porbHloRepository,
      existingHlos as any,
      new Set(hloRows.map((row: any) => String(row.toc_id))),
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
    const existingPartnerByTocId = new Map<string, PorbPartner>();
    existingPartners.forEach((row) => existingPartnerByTocId.set(String(row.toc_id), row));
    const partnerUpdates = partnerRows
      .map((row: any) => {
        const existing = existingPartnerByTocId.get(String(row.toc_id));
        if (!existing) {
          return null;
        }
        const nextAowId = row?.porb_aow_id ?? null;
        const currentAowId = existing?.porb_aow_id ?? null;
        if (Number(currentAowId || 0) === Number(nextAowId || 0)) {
          return null;
        }
        return { id: existing.id, porb_aow_id: nextAowId };
      })
      .filter(Boolean) as Array<{ id: number; porb_aow_id: number | null }>;
    if (partnerUpdates.length) {
      await Promise.all(
        partnerUpdates.map((item) =>
          this.porbPartnerRepository.update(item.id, { porb_aow_id: item.porb_aow_id }),
        ),
      );
    }
    const newPartnerRows = partnerRows.filter(
      (row) => !existingPartnerByTocId.has(String(row.toc_id)),
    );
    const savedPartners = newPartnerRows.length
      ? await this.porbPartnerRepository.save(newPartnerRows)
      : [];
    await this.syncTocDeletedFlags(
      this.porbPartnerRepository,
      existingPartners as any,
      new Set(partnerRows.map((row: any) => String(row.toc_id))),
    );

    const bilateralNodes = results.filter((item: any) => item?.category === 'Project');
    const bilateralRows = bilateralNodes.map((item: any) => {
      const parentAow = resolveParentAow(item?.parent_id, item?.group);
      const centerId = Number(item?.center?.code);
      if (!Number.isFinite(centerId)) {
        return null;
      }
      return this.porbBilateralRepository.create({
        program_id: programId,
        porb_aow_id: parentAow?.id ?? null,
        toc_id: String(item?.id || ''),
        center_id: centerId,
        bilateral_name: item?.title,
        bilateral_outputs: item?.result || item?.results || '',
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
    const bilateralUpdates = validBilateralRows
      .map((row: any) => {
        const key = `${String(row.toc_id)}::${Number(row.center_id)}`;
        const existing = existingBilateralByKey.get(key);
        if (!existing) {
          return null;
        }
        const nextAowId = row?.porb_aow_id ?? null;
        const currentAowId = existing?.porb_aow_id ?? null;
        if (Number(currentAowId || 0) === Number(nextAowId || 0)) {
          return null;
        }
        return { id: existing.id, porb_aow_id: nextAowId };
      })
      .filter(Boolean) as Array<{ id: number; porb_aow_id: number | null }>;
    if (bilateralUpdates.length) {
      await Promise.all(
        bilateralUpdates.map((item) =>
          this.porbBilateralRepository.update(item.id, { porb_aow_id: item.porb_aow_id }),
        ),
      );
    }
    const newBilateralRows = validBilateralRows.filter(
      (row) => !existingBilateralKeys.has(`${String(row.toc_id)}::${Number(row.center_id)}`),
    );
    const savedBilaterals = newBilateralRows.length
      ? await this.porbBilateralRepository.save(newBilateralRows)
      : [];
    await this.syncTocDeletedFlags(
      this.porbBilateralRepository,
      existingBilaterals as any,
      new Set(validBilateralRows.map((row: any) => String(row.toc_id))),
    );

    const meliaNodes = results.filter((item: any) => item?.category === 'Melia');
    const meliaRows: any[] = [];
    const meliaRowKeySet = new Set<string>();
    for (const item of meliaNodes) {
      const centerId = Number(item?.center?.code);
      if (!Number.isFinite(centerId)) {
        continue;
      }
console.log('Processing Melia node:', item);
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
        const key = `${String(item?.id || '')}::${centerId}::${Number(targetAow?.id || 0)}`;
        if (meliaRowKeySet.has(key)) {
          continue;
        }
        meliaRowKeySet.add(key);
        meliaRows.push(
          this.porbMeliaRepository.create({
            program_id: programId,
            porb_aow_id: targetAow?.id ?? null,
            toc_id: String(item?.id || ''),
            center_id: centerId,
            melia_name: item?.title || item?.name || 'Melia',
            melia_outputs: this.stripHtml(item?.supported_outcome || ''),
            melia_budget: 0,
            melia_assumption: '',
            toc_is_deleted: false,
          }),
        );
      }
    }
    const validMeliaRows = meliaRows.filter(Boolean);
    const existingMeliaRows = await this.porbMeliaRepository.find({
      where: { program_id: programId },
    });
    const existingMeliaByKey = new Map<string, PorbMelia>();
    existingMeliaRows.forEach((row) =>
      existingMeliaByKey.set(
        `${String(row.toc_id)}::${Number(row.center_id)}::${Number(row.porb_aow_id || 0)}`,
        row,
      ),
    );
    const existingMeliaKeys = new Set(
      existingMeliaRows.map(
        (row) => `${String(row.toc_id)}::${Number(row.center_id)}::${Number(row.porb_aow_id || 0)}`,
      ),
    );
    const meliaUpdates = validMeliaRows
      .map((row: any) => {
        const key = `${String(row.toc_id)}::${Number(row.center_id)}::${Number(row.porb_aow_id || 0)}`;
        const existing = existingMeliaByKey.get(key);
        if (!existing) {
          return null;
        }
        const nextAowId = row?.porb_aow_id ?? null;
        const currentAowId = existing?.porb_aow_id ?? null;
        if (Number(currentAowId || 0) === Number(nextAowId || 0)) {
          return null;
        }
        return { id: existing.id, porb_aow_id: nextAowId };
      })
      .filter(Boolean) as Array<{ id: number; porb_aow_id: number | null }>;
    if (meliaUpdates.length) {
      await Promise.all(
        meliaUpdates.map((item) =>
          this.porbMeliaRepository.update(item.id, { porb_aow_id: item.porb_aow_id }),
        ),
      );
    }
    const newMeliaRows = validMeliaRows.filter(
      (row) =>
        !existingMeliaKeys.has(
          `${String(row.toc_id)}::${Number(row.center_id)}::${Number(row.porb_aow_id || 0)}`,
        ),
    );
    const savedMelias = newMeliaRows.length ? await this.porbMeliaRepository.save(newMeliaRows) : [];
    await this.syncTocDeletedFlags(
      this.porbMeliaRepository,
      existingMeliaRows as any,
      new Set(validMeliaRows.map((row: any) => String(row.toc_id))),
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
                      if (!existing.results.includes(data.title)) {
                        existing.results += ', ' + data.title;
                      }
                    } else {
                      projectMap.set(key, {
                        id: project.id,
                        parent_id: data.group,
                        result: data.title,
                        category: 'Project',
                        projects_indicator_values:
                          data.projects_indicator_values?.[project.id],
                        title: project.name,
                        ...project,
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
  
}
