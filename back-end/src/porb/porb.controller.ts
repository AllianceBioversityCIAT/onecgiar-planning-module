import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from 'src/role/roles.guard';
import { Roles } from 'src/role/roles.decorator';
import { Role } from 'src/role/role.enum';
import { PorbService } from './porb.service';

@UseGuards(JwtAuthGuard)
@ApiTags('porb')
@ApiBearerAuth()
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

  /** Extracts the socket ID forwarded by the frontend SocketIdInterceptor. */
  private getSocketId(req: any): string | undefined {
    return req?.headers?.['x-socket-id'] || undefined;
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

  @Get('partner/search-clarisa')
  searchClarisaPartners(@Query('q') query: string) {
    return this.porbService.searchClarisaPartners(query || '');
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

  @Post('partner')
  createUnknownPartner(
    @Body() data: { program_id: number; porb_aow_id: number; center_id: number },
    @Request() req,
  ) {
    return this.porbService.createUnknownPartner(
      {
        program_id: Number(data.program_id),
        porb_aow_id: Number(data.porb_aow_id),
        center_id: Number(data.center_id),
      },
      this.getSocketId(req),
    );
  }

  @Get('bilateral')
  getBilaterals(
    @Query('program_id', ParseIntPipe) program_id: number,
    @Query('porb_aow_id') porb_aow_id?: string,
    @Query('center_id') center_id?: string,
    @Query('exclude_zero') exclude_zero?: string,
  ) {
    return this.porbService.getBilaterals(
      program_id,
      this.parseOptionalNumber(porb_aow_id),
      this.parseOptionalNumber(center_id),
      exclude_zero === 'true',
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

  @Get('summary-consolidation')
  getSummaryConsolidation(
    @Query('program_id', ParseIntPipe) program_id: number,
    @Query('center_id') center_id?: string,
  ) {
    return this.porbService.getSummaryConsolidation(
      program_id,
      this.parseOptionalNumber(center_id),
    );
  }

  @Get('summary-aow-detail')
  getSummaryAowDetail(
    @Query('program_id', ParseIntPipe) program_id: number,
    @Query('porb_aow_id', ParseIntPipe) porb_aow_id: number,
  ) {
    return this.porbService.getSummaryAowDetail(program_id, porb_aow_id);
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

  @Get('anaplan-consolidated')
  getAnaplanConsolidated(
    @Query('program_id', ParseIntPipe) program_id: number,
    @Query('center_id') center_id?: string,
  ) {
    return this.porbService.getAnaplanConsolidated(
      program_id,
      this.parseOptionalNumber(center_id),
    );
  }

  @Get('w3-consolidated')
  getW3Consolidated(
    @Query('program_id', ParseIntPipe) program_id: number,
  ) {
    return this.porbService.getW3Consolidated(program_id);
  }

  @Get('country-percentage-consolidated')
  getCountryPercentageConsolidated(
    @Query('program_id', ParseIntPipe) program_id: number,
    @Query('center_id') center_id?: string,
  ) {
    return this.porbService.getCountryPercentageConsolidated(
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

  @Get('cross')
  getCross(
    @Query('program_id', ParseIntPipe) program_id: number,
    @Query('porb_aow_id') porb_aow_id?: string,
    @Query('center_id') center_id?: string,
  ) {
    return this.porbService.getCross(
      program_id,
      this.parseOptionalNumber(porb_aow_id),
      this.parseOptionalNumber(center_id),
    );
  }

  @Get('country-percentage/search-clarisa')
  searchClarisaCountries(@Query('q') query: string) {
    return this.porbService.searchClarisaCountries(query || '');
  }

  @Get('country-percentage')
  getCountryPercentage(
    @Query('program_id', ParseIntPipe) program_id: number,
    @Query('porb_aow_id') porb_aow_id?: string,
    @Query('center_id') center_id?: string,
  ) {
    return this.porbService.getCountryPercentage(
      program_id,
      this.parseOptionalNumber(porb_aow_id),
      this.parseOptionalNumber(center_id),
    );
  }

  @Patch('country-percentage')
  updateCountryPercentage(
    @Body()
    data: {
      program_id: number;
      porb_aow_id: number;
      center_id: number;
      country_name: string;
      percentage?: number | null;
    },
    @Request() req,
  ) {
    return this.porbService.updateCountryPercentage(
      {
        program_id: Number(data.program_id),
        porb_aow_id: Number(data.porb_aow_id),
        center_id: Number(data.center_id),
        country_name: String(data.country_name),
        percentage:
          data.percentage != null && data.percentage !== ('' as any)
            ? Number(data.percentage)
            : null,
      },
      req.user,
      this.getSocketId(req),
    );
  }

  @Post('country-percentage')
  addManualCountry(
    @Body() body: { program_id: number; porb_aow_id: number; center_id: number; country_name: string },
    @Request() req,
  ) {
    return this.porbService.addManualCountry(
      {
        program_id: Number(body.program_id),
        porb_aow_id: Number(body.porb_aow_id),
        center_id: Number(body.center_id),
        country_name: String(body.country_name),
      },
      req.user,
      this.getSocketId(req),
    );
  }

  @Delete('country-percentage/:id')
  deleteManualCountry(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.porbService.deleteManualCountry(id, req.user, this.getSocketId(req));
  }

  @Patch('hlo/:id')
  updateHlo(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { hlo_budget?: number; hlo_assumption?: string },
    @Request() req,
  ) {
    return this.porbService.updateHlo(
      id,
      {
        hlo_budget: data.hlo_budget,
        hlo_assumption: data.hlo_assumption,
      },
      req.user,
      this.getSocketId(req),
    );
  }

  @Patch('partner/:id/resolve')
  resolveUnknownPartner(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { clarisa_partner_code: number },
    @Request() req,
  ) {
    return this.porbService.resolveUnknownPartner(
      id,
      Number(data.clarisa_partner_code),
      this.getSocketId(req),
    );
  }

  @Delete('partner/:id')
  deleteUnknownPartner(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.porbService.deleteUnknownPartner(id, this.getSocketId(req));
  }

  @Delete('hlo/:id')
  deleteTocDeletedHlo(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.porbService.deleteTocDeletedHlo(id, this.getSocketId(req));
  }

  @Delete('melia/:id')
  deleteTocDeletedMelia(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.porbService.deleteTocDeletedMelia(id, this.getSocketId(req));
  }

  @Delete('bilateral/:id')
  deleteTocDeletedBilateral(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.porbService.deleteTocDeletedBilateral(id, this.getSocketId(req));
  }

  @Patch('partner/:id')
  updatePartner(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    data: {
      partner_is_contracted?: boolean | string;
      center_id?: number | string;
      partner_country_codes?: Array<number | string>;
      partner_budget?: number | null;
      partner_assumption?: string;
    },
    @Request() req,
  ) {
    return this.porbService.updatePartner(
      id,
      {
        partner_is_contracted: data.partner_is_contracted,
        center_id: data.center_id,
        partner_country_codes: data.partner_country_codes,
        partner_budget: data.partner_budget,
        assumption: data.partner_assumption,
      },
      req.user,
      this.getSocketId(req),
    );
  }

  @Patch('bilateral/:id')
  updateBilateral(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { bilateral_budget?: number; bilateral_assumption?: string },
    @Request() req,
  ) {
    return this.porbService.updateBilateral(
      id,
      {
        bilateral_budget: data.bilateral_budget,
        bilateral_assumption: data.bilateral_assumption,
      },
      req.user,
      this.getSocketId(req),
    );
  }

  @Patch('melia/:id')
  updateMelia(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { melia_budget?: number; melia_assumption?: string },
    @Request() req,
  ) {
    return this.porbService.updateMelia(
      id,
      {
        melia_budget: data.melia_budget,
        melia_assumption: data.melia_assumption,
      },
      req.user,
      this.getSocketId(req),
    );
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
    @Request() req,
  ) {
    return this.porbService.updateAnaplan(
      {
        program_id: Number(data.program_id),
        porb_aow_id: Number(data.porb_aow_id),
        center_id: Number(data.center_id),
        anaplan_id: Number(data.anaplan_id),
        budget:
          data.budget != null && data.budget !== ('' as any)
            ? Number(data.budget)
            : null,
      },
      req.user,
      this.getSocketId(req),
    );
  }

  @Patch('cross')
  updateCross(
    @Body()
    data: {
      program_id: number;
      porb_aow_id: number;
      center_id: number;
      standerd_cross_cutting_id: number;
      budget?: number | null;
      assumption?: string;
    },
    @Request() req,
  ) {
    return this.porbService.updateCross(
      {
        program_id: Number(data.program_id),
        porb_aow_id: Number(data.porb_aow_id),
        center_id: Number(data.center_id),
        standerd_cross_cutting_id: Number(data.standerd_cross_cutting_id),
        budget:
          data.budget != null && data.budget !== ('' as any)
            ? Number(data.budget)
            : null,
        assumption: String(data.assumption || ''),
      },
      req.user,
      this.getSocketId(req),
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post('migrate-cross-to-standard')
  migrateCrossToStandard() {
    return this.porbService.migrateExistingCrossToStandard();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post('migrate-bilateral-to-center')
  migrateBilateralToCenter() {
    return this.porbService.migrateBilateralToCenter();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post('migrate-melia-dedup')
  migrateMeliaDedup() {
    return this.porbService.migrateMeliaDedup();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post('dedup-contracted-partners')
  dedupContractedPartners() {
    return this.porbService.dedupContractedPartners();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post('cleanup-hlo-geo')
  cleanupHloGeo() {
    return this.porbService.cleanupHloGeo();
  }

  @Get('submission/:program_id')
  getSubmission(@Param('program_id', ParseIntPipe) program_id: number) {
    return this.porbService.getLatestSubmission(program_id);
  }

  @Post('submit/:program_id')
  submitPorb(
    @Param('program_id', ParseIntPipe) program_id: number,
    @Request() req,
  ) {
    return this.porbService.submitPorb(program_id, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Patch('status/:id')
  updateSubmissionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { status: string; status_reason?: string },
    @Request() req,
  ) {
    return this.porbService.updateSubmissionStatus(id, data, req.user);
  }

  @Patch('cancel/:id')
  cancelSubmission(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return this.porbService.cancelSubmission(id, req.user);
  }

  @Get('version/:submission_id')
  getVersion(
    @Param('submission_id', ParseIntPipe) submission_id: number,
    @Request() req,
  ) {
    return this.porbService.getSubmissionVersion(submission_id, req.user);
  }

  @Get('version/:submission_id/zip')
  async exportVersionZip(
    @Param('submission_id', ParseIntPipe) submission_id: number,
    @Res({ passthrough: true }) res: Response,
    @Request() req,
  ) {
    return this.porbService.generateVersionZip(submission_id, res, req.user);
  }

  @Patch('center/status')
  updateCenterStatus(@Body() data: any, @Request() req) {
    return this.porbService.updateCenterStatus(data, req.user);
  }

  @Patch('center/validate')
  updateCenterValidate(@Body() data: any, @Request() req) {
    return this.porbService.updateCenterValidate(data, req.user);
  }

  @Get('excel/:program_id')
  async exportExcel(
    @Param('program_id', ParseIntPipe) program_id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.porbService.generatePorbExcel(program_id, undefined, res);
  }

  @Get('excel/:program_id/zip')
  async exportZip(
    @Param('program_id', ParseIntPipe) program_id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.porbService.generatePorbZip(program_id, res);
  }

  @Post('excel/:program_id/center')
  async exportExcelForCenter(
    @Param('program_id', ParseIntPipe) program_id: number,
    @Body() data: { center_id: number },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.porbService.generatePorbExcel(program_id, Number(data.center_id), res);
  }

  @Get('excel/:program_id/anaplan')
  async exportAnaplanExcel(
    @Param('program_id', ParseIntPipe) program_id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.porbService.generateAnaplanExcel(program_id, undefined, res);
  }

  @Post('excel/:program_id/center-anaplan')
  async exportAnaplanExcelForCenter(
    @Param('program_id', ParseIntPipe) program_id: number,
    @Body() data: { center_id: number },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.porbService.generateAnaplanExcel(program_id, Number(data.center_id), res);
  }

  // Temporary endpoint for TOC -> PORB import (single program)
  @Post('temp/import-toc')
  tempImportToc(
    @Body() data: { program_id?: number; official_code?: string } = {},
    @Request() req,
  ) {
    const programId = Number(data?.program_id ?? 45);
    const officialCode = data?.official_code || 'SP01';
    return this.porbService.importTocToPorbTables(programId, officialCode);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post('bulk-import-toc')
  bulkImportToc(@Body() data: { program_ids?: number[] }, @Request() req) {
    return this.porbService.bulkImportToc(data?.program_ids, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post('migrate-submission-data')
  bulkMigrateSubmissionData(
    @Body() data: { program_ids?: number[] },
    @Request() req,
  ) {
    return this.porbService.bulkMigrateSubmissionData(
      data?.program_ids,
      req.user,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post('import-and-migrate')
  importAndMigrate(@Body() data: { program_ids?: number[] }, @Request() req) {
    return this.porbService.bulkImportAndMigrate(data?.program_ids, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Delete('clear-emails')
  async clearEmails() {
    const result = await this.porbService.clearEmails();
    return result;
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Delete('clear-history')
  async clearHistory() {
    const result = await this.porbService.clearHistory();
    return result;
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get('export-list')
  getExportList(
    @Query('phase_id') phase_id?: string,
    @Query('status') status?: string,
  ) {
    return this.porbService.getExportList(
      phase_id ? Number(phase_id) : undefined,
      status,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post('export-bulk')
  async exportBulk(
    @Body() data: { program_ids: number[] },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.porbService.exportBulkZip(data.program_ids, res);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Post('reset-all-to-draft')
  resetAllToDraft() {
    return this.porbService.resetAllToDraft();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Delete('clear-all-data')
  clearAllPorbData(@Query('program_id') program_id?: string) {
    const pid = program_id ? Number(program_id) : undefined;
    return this.porbService.clearAllPorbData(pid);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get('verify-migration/:program_id')
  verifyMigration(@Param('program_id', ParseIntPipe) program_id: number) {
    return this.porbService.verifyMigration(program_id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get('validate-summary')
  validateSummary(@Query('program_id') program_id?: string) {
    const pid = program_id ? Number(program_id) : undefined;
    return this.porbService.validateAgainstSubmission(pid);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get('toc-last-updates')
  tocLastUpdates() {
    return this.porbService.getTocLastUpdates();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Get('toc-auto-sync')
  async getTocAutoSync() {
    return { enabled: await this.porbService.isTocAutoSyncEnabled() };
  }

  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  @Patch('toc-auto-sync')
  setTocAutoSync(@Body() body: { enabled: boolean }) {
    return this.porbService.setTocAutoSync(body.enabled);
  }
}
