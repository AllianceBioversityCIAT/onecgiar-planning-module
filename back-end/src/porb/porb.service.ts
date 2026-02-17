import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
        private readonly initService: InitiativesService,
        private readonly phasesService: PhasesService,
        private readonly httpService: HttpService,
          private readonly submissionService: SubmissionService,
  ) {}

  getAows(program_id: number) {
    return this.porbAowRepository.find({
      where: { program_id },
      order: { aow_name: 'ASC' },
    });
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

  async getValidation(program_id: number, porb_aow_id?: number, center_id?: number) {
    const sectionNames = ['Pool funding HLO', 'Partners', 'W3/Bilatral', 'MELIA Study', 'Anaplan'];
    const emptyResult: Record<string, { hasError: boolean; message: string }> = {};
    sectionNames.forEach((name) => {
      emptyResult[name] = { hasError: false, message: '' };
    });

    if (porb_aow_id == null || center_id == null) {
      return emptyResult;
    }

    const [hlos, partners, contractedRows, w3Rows, meliaRows] = await Promise.all([
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
    return emptyResult;
  }

  async getValidationSummary(program_id: number, center_id?: number) {
    const centerErrorCodes = new Set<string>();
    const aowErrorIds = new Set<number>();
    const includeAowForCenter = center_id != null;

    const [hlos, bilaterals, melias, partners, contractedRows] = await Promise.all([
      this.porbHloRepository.find({ where: { program_id } }),
      this.porbBilateralRepository.find({ where: { program_id } }),
      this.porbMeliaRepository.find({ where: { program_id } }),
      this.porbPartnerRepository.find({ where: { program_id } }),
      this.porbContractedPartnerRepository.find({ where: { program_id } }),
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

  async importTocToPorbTables(programId: number, officialCode: string) {
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

    if (!aowRows.length) {
      throw new BadRequestException('No AOW (WP) rows found in TOC data.');
    }

    const existingAows = await this.porbAowRepository.find({
      where: { program_id: programId },
    });
    const existingAowByTocId = new Map<string, PorbAow>();
    existingAows.forEach((row) => existingAowByTocId.set(String(row.toc_id), row));

    const newAowRows = aowRows.filter((row: any) => !existingAowByTocId.has(String(row.toc_id)));
    const savedAows = newAowRows.length ? await this.porbAowRepository.save(newAowRows) : [];
    const allAows = [...existingAows, ...savedAows];

    const aowByTocId = new Map<string, PorbAow>();
    for (const aow of allAows) {
      aowByTocId.set(String(aow.toc_id), aow);
    }
    await this.syncTocDeletedFlags(
      this.porbAowRepository,
      existingAows as any,
      new Set(aowRows.map((row: any) => String(row.toc_id))),
    );

    const outputNodes = results.filter((item: any) => item?.category === 'OUTPUT');
    const hloRows: any[] = [];
    for (const item of outputNodes) {
      const parentAow = aowByTocId.get(String(item?.group || ''));
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
    const existingHloKeys = new Set(
      existingHlos.map((row) => `${String(row.toc_id)}::${Number(row.center_id)}`),
    );
    const newHloRows = hloRows.filter(
      (row) => !existingHloKeys.has(`${String(row.toc_id)}::${Number(row.center_id)}`),
    );
    const savedHlos = newHloRows.length ? await this.porbHloRepository.save(newHloRows) : [];
    await this.syncTocDeletedFlags(
      this.porbHloRepository,
      existingHlos as any,
      new Set(hloRows.map((row: any) => String(row.toc_id))),
    );

    const partnerNodes = results.filter((item: any) => item?.category === 'partners');
    const partnerRows = partnerNodes.map((item: any) => {
      const parentAow = aowByTocId.get(String(item?.parent_id || item?.group || ''));
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
      const parentAow = aowByTocId.get(String(item?.parent_id || item?.group || ''));
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
    const existingBilateralKeys = new Set(
      existingBilaterals.map((row) => `${String(row.toc_id)}::${Number(row.center_id)}`),
    );
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
    const meliaRows = meliaNodes.map((item: any) => {
      const parentAow = aowByTocId.get(String(item?.parent_id || item?.group || ''));
      const centerId = Number(item?.center?.code);
      if (!Number.isFinite(centerId)) {
        return null;
      }
      return this.porbMeliaRepository.create({
        program_id: programId,
        porb_aow_id: parentAow?.id ?? null,
        toc_id: String(item?.id || ''),
        center_id: centerId,
        melia_name: item?.title || item?.name || 'Melia',
        melia_outputs: this.stripHtml(item?.supported_outcome || ''),
        melia_budget: 0,
        melia_assumption: '',
        toc_is_deleted: false,
      });
    });
    const validMeliaRows = meliaRows.filter(Boolean);
    const existingMeliaRows = await this.porbMeliaRepository.find({
      where: { program_id: programId },
    });
    const existingMeliaKeys = new Set(
      existingMeliaRows.map((row) => `${String(row.toc_id)}::${Number(row.center_id)}`),
    );
    const newMeliaRows = validMeliaRows.filter(
      (row) => !existingMeliaKeys.has(`${String(row.toc_id)}::${Number(row.center_id)}`),
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
