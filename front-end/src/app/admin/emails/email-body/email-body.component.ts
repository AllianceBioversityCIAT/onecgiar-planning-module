import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-email-body',
  templateUrl: './email-body.component.html',
  styleUrls: ['./email-body.component.scss']
})
export class EmailBodyComponent {
  dataCoverted: any;
  constructor(
    public dialogRef: MatDialogRef<EmailBodyComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private sanitizer:DomSanitizer
  ) { }

  onNoClick(): void {
    this.dialogRef.close();
  }
  
  ngOnInit(): void {
    this.dataCoverted = this.sanitizer.bypassSecurityTrustHtml(this.data);
  }
}
 