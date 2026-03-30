import { Component, Inject, OnDestroy } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { PorbService } from "src/app/services/porb.service";
import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged, switchMap } from "rxjs/operators";

type LocationType = "country" | "region" | "global";

@Component({
  selector: "app-location-add-dialog",
  templateUrl: "./location-add-dialog.component.html",
  styleUrls: ["./location-add-dialog.component.scss"],
  standalone: false,
})
export class LocationAddDialogComponent implements OnDestroy {
  selectedType: LocationType = "country";
  searchResults: any[] = [];
  searching = false;
  adding = false;
  searchQuery = "";
  searchTerm$ = new Subject<string>();

  constructor(
    public dialogRef: MatDialogRef<LocationAddDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      existingLocations: Array<{ name: string; type: string }>;
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
          return this.porbService.searchLocations(term, this.selectedType);
        })
      )
      .subscribe((results: any) => {
        const raw = Array.isArray(results) ? results : [];
        const existing = new Set(
          (this.data.existingLocations || [])
            .filter((l) => l.type === this.selectedType)
            .map((l) => l.name.toLowerCase())
        );
        this.searchResults = raw.filter(
          (r: any) => !existing.has(String(r.name || "").toLowerCase())
        );
        this.searching = false;
      });
  }

  onTypeChange(type: LocationType) {
    this.selectedType = type;
    this.searchQuery = "";
    this.searchResults = [];
    this.searching = false;
  }

  onSearch(value: string) {
    this.searchQuery = value;
    this.searchTerm$.next(value);
  }

  get globalAlreadyExists(): boolean {
    return (this.data.existingLocations || []).some(
      (l) => l.type === "global"
    );
  }

  async selectLocation(location: any) {
    if (this.adding) return;
    this.adding = true;
    try {
      const result = await this.porbService.addManualLocation({
        program_id: this.data.programId,
        porb_aow_id: this.data.porbAowId,
        center_id: this.data.centerId,
        location_name: String(location.name),
        location_type: this.selectedType,
      });
      if (result) {
        this.dialogRef.close(result);
      }
    } finally {
      this.adding = false;
    }
  }

  async addGlobal() {
    if (this.adding || this.globalAlreadyExists) return;
    this.adding = true;
    try {
      const result = await this.porbService.addManualLocation({
        program_id: this.data.programId,
        porb_aow_id: this.data.porbAowId,
        center_id: this.data.centerId,
        location_name: "Global",
        location_type: "global",
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
