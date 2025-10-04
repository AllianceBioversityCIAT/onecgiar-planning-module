import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { AppSocket } from "../../socket.service";

@Component({
  selector: "app-geographic-location",
  templateUrl: "./geographic-location.component.html",
  styleUrls: ["./geographic-location.component.scss"],
})
export class GeographicLocationComponent implements OnInit {
  constructor(public socket: AppSocket) {}
  selectedCountryObjects: { [code: number]: any[] } = {};

  @Input() countries: any[] = [];
  @Input() selectedCountries: any[] = [];
  @Input() savedCountries: any[] = [];
  @Input() allCenterCountryValues: any[] = [];
  @Input() center: any;
  @Input() workPackage: any;
  @Input() initiative_id: any;
  @Input() item_id: any;
  @Input() disabled: any;

  @Output() selectedCountriesChange = new EventEmitter<string[]>();
  @Output() savedCountriesChange = new EventEmitter<any[]>();
  filteredCountries: any[] = [];

  ngOnInit() {
    this.filteredCountries = this.countries;
    this.filterSavedCountries();

    this.socket.on("setSelectedCountryPartner", (payload: any) => {
      const { partner, wp, result_id, selectedCountries } = payload || {};
      if (result_id == this.item_id && partner.code == this.center.code)
        this.selectedCountryObjects[this.center.code] = selectedCountries;
    });
  }

  onChange(newSelection: any[]): void {
    this.selectedCountryObjects[this.center.code] = [...newSelection];
  
    const mappedWrappers = newSelection.map((w: any) => ({
      ...w,
      country: w.country ?? w,
      initiative_id: w.initiative_id ?? this.initiative_id,
      partner_code: this.center?.code,
      result_id: this.item_id,
      wp_id: this.workPackage,
    }));
  
    this.selectedCountriesChange.emit(mappedWrappers);
  }

  compareCountries = (c1: any, c2: any) => {
    return c1 && c2 ? c1.code === c2.code : c1 === c2;
  };

  filterSavedCountries() {
    if (!this.allCenterCountryValues?.length) return;

    this.savedCountries = this.allCenterCountryValues.filter(
      (val) =>
        val.initiative_id === this.initiative_id &&
        val.center_code === this.center.code &&
        val.result_id === this.item_id &&
        val.workPackage.wp_official_code ===
          this.workPackage?.ost_wp.wp_official_code + "-partners"
    );

    this.selectedCountryObjects[this.center.code] =
      this.savedCountries?.map((s) => s.country) || [];
  }

  applyFilter(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value?.toLowerCase() || '';
    console.log(value)
    console.log(this.filteredCountries)
    this.filteredCountries = this.countries.filter(c =>
      c.name.toLowerCase().startsWith(value) ||
      c.name.toLowerCase().includes(value)
    );
  }
}
