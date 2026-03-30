import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { InitiativesService } from 'src/app/services/initiatives.service';
import { LoaderService } from 'src/app/services/loader.service';

interface HistoryGroup {
  label: string;
  entries: any[];
}

@Component({
    selector: 'app-history-of-change',
    templateUrl: './history-of-change.component.html',
    styleUrls: ['./history-of-change.component.scss'],
    standalone: false
})
export class HistoryOfChangeComponent {
  emptyRecords = false;
  loading = true;
  histories: any[] = [];
  groupedHistories: HistoryGroup[] = [];
  searchTerm = '';

  constructor(
    private dialogRef: MatDialogRef<HistoryOfChangeComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private initService: InitiativesService,
    public load: LoaderService
  ) {}

  async ngOnInit() {
    this.loading = true;
    const result = await this.initService.getInitiativeHistory(
      this.data.initiative_id
    );
    this.histories = Array.isArray(result) ? result : [];
    this.loading = false;
    if (!this.histories.length) {
      this.emptyRecords = true;
    } else {
      this.buildGroups();
    }
  }

  closeDialog() {
    this.dialogRef.close();
  }

  onSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.buildGroups();
  }

  clearSearch() {
    this.searchTerm = '';
    this.buildGroups();
  }

  getChangeType(history: any): string {
    if (!history.user) return 'system';
    if (history.old_value && history.new_value) return 'modified';
    if (history.new_value) return 'added';
    return 'removed';
  }

  getCategory(history: any): string {
    const rp = history.resource_property || '';
    if (rp.startsWith('HLO')) return 'HLO';
    if (rp.startsWith('W3/Bilateral')) return 'W3/Bilateral';
    if (rp.startsWith('MELIA')) return 'MELIA';
    if (rp.startsWith('Anaplan')) return 'Anaplan';
    if (rp.startsWith('Partner')) return 'Partner';
    if (rp.includes('Cross Cutting') || rp === 'New Cross Cutting Item')
      return 'Cross Cutting';
    if (rp.startsWith('System Import')) return 'Import';
    if (rp.includes('period') || rp.includes('Period')) return 'Period';
    return 'General';
  }

  getCategoryClass(history: any): string {
    const classMap: Record<string, string> = {
      HLO: 'cat-hlo',
      'W3/Bilateral': 'cat-bilateral',
      MELIA: 'cat-melia',
      Anaplan: 'cat-anaplan',
      Partner: 'cat-partner',
      'Cross Cutting': 'cat-cross',
      Import: 'cat-import',
      Period: 'cat-period',
      General: 'cat-general',
    };
    return classMap[this.getCategory(history)] || 'cat-general';
  }

  getContextText(history: any): string {
    const parts: string[] = [];
    if (
      history.item_name &&
      history.item_name !== 'Approved' &&
      history.item_name !== 'Rejected'
    ) {
      parts.push(history.item_name);
    }
    if (history.organization?.acronym) {
      parts.push(history.organization.acronym);
    }
    if (history.work_package) {
      parts.push(history.work_package.acronym || history.work_package.name);
    }
    return parts.join(' \u2014 ');
  }

  isSpecialEntry(history: any): boolean {
    const rp = history.resource_property || '';
    return (
      rp === 'Checked period' ||
      rp === 'unchecked period' ||
      rp === 'Checked result as no budget assigned' ||
      rp === 'unchecked result as no budget assigned'
    );
  }

  isPositiveSpecial(history: any): boolean {
    const rp = history.resource_property || '';
    return (
      rp === 'Checked period' ||
      rp === 'Checked result as no budget assigned'
    );
  }

  hasValues(history: any): boolean {
    return (
      !!(history.old_value || history.new_value) &&
      !this.isSpecialEntry(history)
    );
  }

  private buildGroups() {
    let filtered = this.histories;
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = this.histories.filter(
        (h) =>
          (h.user?.full_name || 'System').toLowerCase().includes(term) ||
          (h.item_name || '').toLowerCase().includes(term) ||
          (h.resource_property || '').toLowerCase().includes(term) ||
          (h.old_value || '').toLowerCase().includes(term) ||
          (h.new_value || '').toLowerCase().includes(term) ||
          (h.organization?.acronym || '').toLowerCase().includes(term)
      );
    }

    const groups = new Map<string, any[]>();
    for (const h of filtered) {
      const label = this.getDateLabel(new Date(h.createdAt));
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(h);
    }
    this.groupedHistories = Array.from(groups.entries()).map(
      ([label, entries]) => ({ label, entries })
    );
  }

  private getDateLabel(date: Date): string {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (this.isSameDay(date, today)) return 'Today';
    if (this.isSameDay(date, yesterday)) return 'Yesterday';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
}
