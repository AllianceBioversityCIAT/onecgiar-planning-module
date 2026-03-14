import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { PorbService } from "src/app/services/porb.service";
import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged, switchMap } from "rxjs/operators";

@Component({
  selector: "app-partner-resolve-dialog",
  templateUrl: "./partner-resolve-dialog.component.html",
  styleUrls: ["./partner-resolve-dialog.component.scss"],
})
export class PartnerResolveDialogComponent {
  searchResults: any[] = [];
  selectedPartner: any = null;
  searching = false;
  resolving = false;
  searchTerm$ = new Subject<string>();

  constructor(
    public dialogRef: MatDialogRef<PartnerResolveDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { partnerId: number },
    private porbService: PorbService
  ) {
    this.searchTerm$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          if (!term || term.length < 2) {
            this.searchResults = [];
            this.searching = false;
            return [];
          }
          this.searching = true;
          return this.porbService.searchClarisaPartners(term);
        })
      )
      .subscribe((results: any) => {
        this.searchResults = Array.isArray(results) ? results : [];
        this.searching = false;
      });
  }

  onSearch(event: any) {
    const term = typeof event === 'string' ? event : event?.term || '';
    this.searchTerm$.next(term);
  }

  async resolve() {
    if (!this.selectedPartner || this.resolving) return;
    this.resolving = true;
    try {
      const result = await this.porbService.resolvePartner(
        this.data.partnerId,
        this.selectedPartner.code
      );
      if (result) {
        this.dialogRef.close({ resolved: true });
      }
    } finally {
      this.resolving = false;
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
