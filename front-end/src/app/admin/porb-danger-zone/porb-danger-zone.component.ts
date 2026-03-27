import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { HeaderService } from 'src/app/header.service';
import { Meta, Title } from '@angular/platform-browser';
import { PorbService } from 'src/app/services/porb.service';
import { InitiativesService } from 'src/app/services/initiatives.service';
import { DeleteConfirmDialogComponent } from 'src/app/delete-confirm-dialog/delete-confirm-dialog.component';

@Component({
  selector: 'app-porb-danger-zone',
  templateUrl: './porb-danger-zone.component.html',
  styleUrls: ['./porb-danger-zone.component.scss'],
  standalone: false,
})
export class PorbDangerZoneComponent implements OnInit, OnDestroy {
  programs: any[] = [];
  selectedProgramId: number | null = null;
  loading = false;
  lastResult: any = null;

  // Reset to Draft
  resetDraftLoading = false;
  resetDraftResult: any = null;

  // Clear tables
  clearEmailsLoading = false;
  clearEmailsResult: any = null;
  clearHistoryLoading = false;
  clearHistoryResult: any = null;

  // TOC Import
  importLoading = false;
  importResult: any = null;
  selectedImportProgramIds: number[] = [];

  // TOC Status
  tocStatus: any[] = [];
  tocStatusLoading = false;
  private tocPollInterval: any;

  constructor(
    private porbService: PorbService,
    private initiativesService: InitiativesService,
    private dialog: MatDialog,
    private headerService: HeaderService,
    private toastr: ToastrService,
    private title: Title,
    private meta: Meta,
  ) {
    this.headerService.background =
      'linear-gradient(to bottom, #04030F, #020106)';
    this.headerService.backgroundNavMain =
      'linear-gradient(to top, #0F212F, #09151E)';
    this.headerService.backgroundUserNavButton =
      'linear-gradient(to top, #0F212F, #09151E)';
    this.headerService.backgroundFooter =
      'linear-gradient(to top, #0F212F, #09151E)';
    this.headerService.backgroundDeleteYes = '#FF5A54';
    this.headerService.backgroundDeleteClose = '#04030F';
    this.headerService.backgroundDeleteLr = '#04030F';
    this.headerService.logoutSvg =
      'brightness(0) saturate(100%) invert(4%) sepia(6%) saturate(6779%) hue-rotate(208deg) brightness(80%) contrast(104%)';
  }

  ngOnInit() {
    this.title.setTitle('PORB Danger Zone');
    this.meta.updateTag({
      name: 'description',
      content: 'PORB Danger Zone - Admin Tools',
    });
    this.loadPrograms();
    this.loadTocStatus();
    // Poll every 30s to reflect cron updates
    this.tocPollInterval = setInterval(() => this.loadTocStatus(), 30000);
  }

  ngOnDestroy() {
    if (this.tocPollInterval) {
      clearInterval(this.tocPollInterval);
    }
  }

  async loadPrograms() {
    try {
      const data: any = await this.initiativesService.getInitiatives(null, 1, 999);
      this.programs = data?.result || data || [];
    } catch {
      this.programs = [];
    }
  }

  async loadTocStatus() {
    this.tocStatusLoading = true;
    try {
      const data = await this.porbService.getTocLastUpdates();
      const tocMap = new Map<string, any>();
      for (const t of (data.tocUpdates || [])) {
        tocMap.set(t.id, t);
      }

      this.tocStatus = (data.initiatives || []).map((init: any) => {
        // Try to match by action_area_id
        const tocEntry = tocMap.get(init.action_area_id);
        const tocCounter = tocEntry ? (Number(tocEntry.last_update) || 0) : null;
        const ourCounter = Number(init.our_counter) || 0;
        const needsUpdate = tocCounter !== null && tocCounter > ourCounter;

        return {
          ...init,
          toc_title: tocEntry?.title || null,
          toc_counter: tocCounter,
          our_counter: ourCounter,
          needs_update: needsUpdate,
          matched: !!tocEntry,
        };
      });
    } catch {
      this.tocStatus = [];
    } finally {
      this.tocStatusLoading = false;
    }
  }

  get pendingUpdates(): any[] {
    return this.tocStatus.filter((s) => s.needs_update);
  }

  clearAllData() {
    const target = this.selectedProgramId
      ? this.programs.find((p) => p.id === this.selectedProgramId)?.official_code || `Program #${this.selectedProgramId}`
      : 'ALL PROGRAMS';

    this.dialog
      .open(DeleteConfirmDialogComponent, {
        data: {
          message: `Are you sure you want to permanently delete all PORB data for ${target}? This action cannot be undone.`,
          svg: '../../../assets/shared-image/warning.png',
        },
      })
      .afterClosed()
      .subscribe(async (confirmed) => {
        if (!confirmed) return;
        this.loading = true;
        this.lastResult = null;
        try {
          const result = await this.porbService.clearAllPorbData(
            this.selectedProgramId,
          );
          this.lastResult = result;
          this.toastr.success(
            `Deleted ${result.totalDeleted} rows from PORB tables`,
          );
        } catch (err: any) {
          this.toastr.error(
            err?.error?.message || 'Failed to clear PORB data',
          );
        } finally {
          this.loading = false;
        }
      });
  }

  toggleImportProgram(programId: number) {
    const idx = this.selectedImportProgramIds.indexOf(programId);
    if (idx === -1) {
      this.selectedImportProgramIds.push(programId);
    } else {
      this.selectedImportProgramIds.splice(idx, 1);
    }
  }

  isImportSelected(programId: number): boolean {
    return this.selectedImportProgramIds.includes(programId);
  }

  selectAllImport() {
    if (this.selectedImportProgramIds.length === this.programs.length) {
      this.selectedImportProgramIds = [];
    } else {
      this.selectedImportProgramIds = this.programs.map((p) => p.id);
    }
  }

  importToc() {
    if (!this.selectedImportProgramIds.length) {
      this.toastr.error('Please select at least one program to import');
      return;
    }

    const count = this.selectedImportProgramIds.length;
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        data: {
          message: `Import TOC data for ${count} program(s)? This will create AOWs and budget rows from the TOC API.`,
          svg: '../../../assets/shared-image/sync.png',
        },
      })
      .afterClosed()
      .subscribe(async (confirmed) => {
        if (!confirmed) return;
        this.importLoading = true;
        this.importResult = null;
        try {
          const result = await this.porbService.bulkImportToc(
            this.selectedImportProgramIds,
          );
          this.importResult = result;
          this.toastr.success('TOC import completed');
          this.loadTocStatus();
        } catch (err: any) {
          this.toastr.error(
            err?.error?.message || 'TOC import failed',
          );
        } finally {
          this.importLoading = false;
        }
      });
  }

  resetAllToDraft() {
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        data: {
          message:
            'Are you sure you want to reset ALL PORB submissions to Draft? This will affect every Pending, Approved, and Rejected submission.',
          svg: '../../../assets/shared-image/warning.png',
        },
      })
      .afterClosed()
      .subscribe(async (confirmed) => {
        if (!confirmed) return;
        this.resetDraftLoading = true;
        this.resetDraftResult = null;
        try {
          const result = await this.porbService.resetAllToDraft();
          this.resetDraftResult = result;
          this.toastr.success(
            `${result.updated} submission(s) reset to Draft`,
          );
        } catch (err: any) {
          this.toastr.error(
            err?.error?.message || 'Failed to reset submissions',
          );
        } finally {
          this.resetDraftLoading = false;
        }
      });
  }

  clearEmails() {
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        data: {
          message: 'Are you sure you want to permanently delete all email records?',
          svg: '../../../assets/shared-image/warning.png',
        },
      })
      .afterClosed()
      .subscribe(async (confirmed) => {
        if (!confirmed) return;
        this.clearEmailsLoading = true;
        this.clearEmailsResult = null;
        try {
          await this.porbService.clearEmails();
          this.clearEmailsResult = true;
          this.toastr.success('Emails table cleared');
        } catch (err: any) {
          this.toastr.error(err?.error?.message || 'Failed to clear emails');
        } finally {
          this.clearEmailsLoading = false;
        }
      });
  }

  clearHistory() {
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        data: {
          message: 'Are you sure you want to permanently delete all history records? This also clears latest_history references on initiatives.',
          svg: '../../../assets/shared-image/warning.png',
        },
      })
      .afterClosed()
      .subscribe(async (confirmed) => {
        if (!confirmed) return;
        this.clearHistoryLoading = true;
        this.clearHistoryResult = null;
        try {
          await this.porbService.clearHistory();
          this.clearHistoryResult = true;
          this.toastr.success('History table cleared');
        } catch (err: any) {
          this.toastr.error(err?.error?.message || 'Failed to clear history');
        } finally {
          this.clearHistoryLoading = false;
        }
      });
  }
}
