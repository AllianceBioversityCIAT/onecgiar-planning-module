import { Component, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
export class ConfirmDialogModel {

  constructor(public title: string, public message: string) {
  }
}
@Component({
    selector: 'app-confirm',
    templateUrl: './confirm.component.html',
    styleUrls: ['./confirm.component.scss'],
    standalone: false
})
export class ConfirmComponent {
  title: string;
  message: string;
  constructor(
    public dialogRef: MatDialogRef<ConfirmComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogModel
  ) {
    // Update view with given values
    this.title = data.title;
    this.message = data.message;
  }

  onConfirm(): void {
    // Close the dialog, return true
    this.dialogRef.close(true);
  }

  onDismiss(): void {
    // Close the dialog, return false
    this.dialogRef.close(false);
  }
}
