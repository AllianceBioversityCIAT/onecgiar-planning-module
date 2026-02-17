import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PorbService } from './porb.service';

@Controller('porb')
export class PorbController {
  constructor(private readonly porbService: PorbService) {}

  private parseOptionalNumber(value?: string): number | undefined {
    if (value == null || value === '') {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  @Get('aow/:program_id')
  getAows(@Param('program_id', ParseIntPipe) program_id: number) {
    return this.porbService.getAows(program_id);
  }

  @Get('hlo')
  getHlos(
    @Query('program_id', ParseIntPipe) program_id: number,
    @Query('porb_aow_id') porb_aow_id?: string,
    @Query('center_id') center_id?: string,
  ) {
    return this.porbService.getHlos(
      program_id,
      this.parseOptionalNumber(porb_aow_id),
      this.parseOptionalNumber(center_id),
    );
  }

  @Get('partner')
  getPartners(
    @Query('program_id', ParseIntPipe) program_id: number,
    @Query('porb_aow_id') porb_aow_id?: string,
    @Query('center_id') center_id?: string,
  ) {
    return this.porbService.getPartners(
      program_id,
      this.parseOptionalNumber(porb_aow_id),
      this.parseOptionalNumber(center_id),
    );
  }

  @Get('bilateral')
  getBilaterals(
    @Query('program_id', ParseIntPipe) program_id: number,
    @Query('porb_aow_id') porb_aow_id?: string,
    @Query('center_id') center_id?: string,
  ) {
    return this.porbService.getBilaterals(
      program_id,
      this.parseOptionalNumber(porb_aow_id),
      this.parseOptionalNumber(center_id),
    );
  }

  @Get('melia')
  getMelia(
    @Query('program_id', ParseIntPipe) program_id: number,
    @Query('porb_aow_id') porb_aow_id?: string,
    @Query('center_id') center_id?: string,
  ) {
    return this.porbService.getMelia(
      program_id,
      this.parseOptionalNumber(porb_aow_id),
      this.parseOptionalNumber(center_id),
    );
  }

  @Get('consolidation')
  getConsolidation(
    @Query('program_id', ParseIntPipe) program_id: number,
    @Query('porb_aow_id') porb_aow_id?: string,
    @Query('center_id') center_id?: string,
  ) {
    return this.porbService.getConsolidation(
      program_id,
      this.parseOptionalNumber(porb_aow_id),
      this.parseOptionalNumber(center_id),
    );
  }

  @Get('validation')
  getValidation(
    @Query('program_id', ParseIntPipe) program_id: number,
    @Query('porb_aow_id') porb_aow_id?: string,
    @Query('center_id') center_id?: string,
  ) {
    return this.porbService.getValidation(
      program_id,
      this.parseOptionalNumber(porb_aow_id),
      this.parseOptionalNumber(center_id),
    );
  }

  @Get('validation-summary')
  getValidationSummary(
    @Query('program_id', ParseIntPipe) program_id: number,
    @Query('center_id') center_id?: string,
  ) {
    return this.porbService.getValidationSummary(
      program_id,
      this.parseOptionalNumber(center_id),
    );
  }

  @Get('anaplan')
  getAnaplan(
    @Query('program_id', ParseIntPipe) program_id: number,
    @Query('porb_aow_id') porb_aow_id?: string,
    @Query('center_id') center_id?: string,
  ) {
    return this.porbService.getAnaplan(
      program_id,
      this.parseOptionalNumber(porb_aow_id),
      this.parseOptionalNumber(center_id),
    );
  }

  @Patch('hlo/:id')
  updateHlo(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { hlo_budget?: number; hlo_assumption?: string },
  ) {
    return this.porbService.updateHlo(id, {
      hlo_budget: data.hlo_budget,
      hlo_assumption: data.hlo_assumption,
    });
  }

  @Patch('partner/:id')
  updatePartner(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    data: {
      partner_is_contracted?: boolean | string;
      center_id?: number | string;
      partner_geo?: string;
      partner_country_codes?: Array<number | string>;
      partner_budget?: number | null;
      partner_assumption?: string;
    },
  ) {
    return this.porbService.updatePartner(id, {
      partner_is_contracted: data.partner_is_contracted,
      center_id: data.center_id,
      partner_geo: data.partner_geo,
      partner_country_codes: data.partner_country_codes,
      partner_budget: data.partner_budget,
      partner_assumption: data.partner_assumption,
    });
  }

  @Patch('bilateral/:id')
  updateBilateral(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { bilateral_budget?: number; bilateral_assumption?: string },
  ) {
    return this.porbService.updateBilateral(id, {
      bilateral_budget: data.bilateral_budget,
      bilateral_assumption: data.bilateral_assumption,
    });
  }

  @Patch('melia/:id')
  updateMelia(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { melia_budget?: number; melia_assumption?: string },
  ) {
    return this.porbService.updateMelia(id, {
      melia_budget: data.melia_budget,
      melia_assumption: data.melia_assumption,
    });
  }

  @Patch('anaplan')
  updateAnaplan(
    @Body()
    data: {
      program_id: number;
      porb_aow_id: number;
      center_id: number;
      anaplan_id: number;
      budget?: number | null;
    },
  ) {
    return this.porbService.updateAnaplan({
      program_id: Number(data.program_id),
      porb_aow_id: Number(data.porb_aow_id),
      center_id: Number(data.center_id),
      anaplan_id: Number(data.anaplan_id),
      budget:
        data.budget != null && data.budget !== ('' as any)
          ? Number(data.budget)
          : null,
    });
  }

  // Temporary endpoint for TOC -> PORB import
  @Post('temp/import-toc')
  tempImportToc(
    @Body() data: { program_id?: number; official_code?: string } = {},
  ) {
    const programId = Number(data?.program_id ?? 45);
    const officialCode = data?.official_code || 'SP01';
    return this.porbService.importTocToPorbTables(programId, officialCode);
  }
}
