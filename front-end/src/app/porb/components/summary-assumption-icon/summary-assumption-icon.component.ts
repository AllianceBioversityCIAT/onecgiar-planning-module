import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-summary-assumption-icon',
    templateUrl: './summary-assumption-icon.component.html',
    styleUrls: ['./summary-assumption-icon.component.scss'],
    standalone: false
})
export class SummaryAssumptionIconComponent {
  @Input() assumption: string;
}
