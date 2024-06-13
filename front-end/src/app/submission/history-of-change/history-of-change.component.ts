import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { InitiativesService } from 'src/app/services/initiatives.service';

@Component({
  selector: 'app-history-of-change',
  templateUrl: './history-of-change.component.html',
  styleUrls: ['./history-of-change.component.scss']
})
export class HistoryOfChangeComponent {
  constructor(
    private dialogRef: MatDialogRef<HistoryOfChangeComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private initService: InitiativesService
  ) {}

  histories: any[];
  async ngOnInit()  {
    this.histories = await this.initService.getInitiativeHistory(this.data.initiative_id);
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
