import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface DialogData {
  message: string;
  message2: string;
}
@Component({
    selector: 'app-submit-message',
    templateUrl: './submit-message.component.html',
    styleUrls: ['./submit-message.component.scss'],
    standalone: false
})
export class SubmitMessageComponent {

  constructor(
    public dialogRef: MatDialogRef<SubmitMessageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  onNoClick(): void {
    this.dialogRef.close(false); 
  }

  onYesClick(): void {
    this.dialogRef.close(true);
  }

}
