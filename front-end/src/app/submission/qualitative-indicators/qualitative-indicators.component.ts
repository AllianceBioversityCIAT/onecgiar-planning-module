import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-qualitative-indicators',
    templateUrl: './qualitative-indicators.component.html',
    styleUrls: ['./qualitative-indicators.component.scss'],
    standalone: false
})
export class QualitativeIndicatorsComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

}
