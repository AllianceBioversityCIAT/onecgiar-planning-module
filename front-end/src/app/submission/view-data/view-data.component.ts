import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-view-data',
    templateUrl: './view-data.component.html',
    styleUrls: ['./view-data.component.scss'],
    standalone: false
})
export class ViewDataComponent {
  constructor(
    public dialogRef: MatDialogRef<any>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}



  onNoClick(): void {
    this.dialogRef.close(false);
  }
}

