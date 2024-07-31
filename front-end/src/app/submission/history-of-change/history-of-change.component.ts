import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { InitiativesService } from 'src/app/services/initiatives.service';
import { LoaderService } from 'src/app/services/loader.service';

@Component({
  selector: 'app-history-of-change',
  templateUrl: './history-of-change.component.html',
  styleUrls: ['./history-of-change.component.scss']
})
export class HistoryOfChangeComponent {
  constructor(
    private dialogRef: MatDialogRef<HistoryOfChangeComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private initService: InitiativesService,
    public load: LoaderService
  ) {}
  emptyRecords: boolean = false;
  histories: any[];
  async ngOnInit() {
    this.histories = await this.initService.getInitiativeHistory(this.data.initiative_id);
    if(!this.histories.length)
      this.emptyRecords = true;
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
