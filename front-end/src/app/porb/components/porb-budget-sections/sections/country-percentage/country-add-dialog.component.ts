import { Component, Inject, OnDestroy } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { PorbService } from "src/app/services/porb.service";
import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged, switchMap } from "rxjs/operators";

@Component({
  selector: "app-country-add-dialog",
  templateUrl: "./country-add-dialog.component.html",
  styleUrls: ["./country-add-dialog.component.scss"],
  standalone: false,
})
export class CountryAddDialogComponent implements OnDestroy {
  searchResults: any[] = [];
  searching = false;
  adding = false;
  searchQuery = "";
  searchTerm$ = new Subject<string>();

  constructor(
    public dialogRef: MatDialogRef<CountryAddDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      existingCountries: string[];
      programId: number;
      porbAowId: number;
      centerId: number;
    },
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
          return this.porbService.searchClarisaCountries(term);
        })
      )
      .subscribe((results: any) => {
        const raw = Array.isArray(results) ? results : [];
        const existing = new Set(
          (this.data.existingCountries || []).map((c) => c.toLowerCase())
        );
        this.searchResults = raw.filter(
          (r: any) => !existing.has(String(r.name || "").toLowerCase())
        );
        this.searching = false;
      });
  }

  onSearch(value: string) {
    this.searchQuery = value;
    this.searchTerm$.next(value);
  }

  async selectCountry(country: any) {
    if (this.adding) return;
    this.adding = true;
    try {
      const result = await this.porbService.addManualCountry({
        program_id: this.data.programId,
        porb_aow_id: this.data.porbAowId,
        center_id: this.data.centerId,
        country_name: String(country.name),
      });
      if (result) {
        this.dialogRef.close(result);
      }
    } finally {
      this.adding = false;
    }
  }

  cancel() {
    this.dialogRef.close();
  }

  ngOnDestroy() {
    this.searchTerm$.complete();
  }
}
