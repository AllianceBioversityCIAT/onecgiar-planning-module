import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AnticipatedYearService } from 'src/app/services/anticipated-year.service';
import { InitiativesService } from 'src/app/services/initiatives.service';
import { MeliaTypeService } from 'src/app/services/melia-type.service';
import { SubmissionService } from 'src/app/services/submission.service';

@Component({
  selector: 'app-initiative-melia-dialog',
  templateUrl: './initiative-melia-dialog.component.html',
  styleUrls: ['./initiative-melia-dialog.component.scss'],
})
export class InitiativeMeliaDialogComponent implements OnInit {
  meliaForm: any;
  meliaTypes: any[] = [];
  confirmation: any = '';
  initiatives: any = [];
  AnticipatedYear: any;
  initiativeMelias: any = [];

  constructor(
    public fb: FormBuilder,
    private dialogRef: MatDialogRef<InitiativeMeliaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any = {},
    private meliaTypeService: MeliaTypeService,
    private submissionService: SubmissionService,
    private initiativesService: InitiativesService,
    private anticipatedYearService: AnticipatedYearService
  ) {}

  async ngOnInit() {
    this.populateMeliaForm();
  }

  async populateMeliaForm() {
    this.meliaForm = this.fb.group({
      initiative_id: [this.data.initiative_id, Validators.required],
      melia_type_id: [this.data?.melia_type_id],
      methodology: [this.data?.methodology],
      experimental: [this.data?.experimental],
      questionnaires: [this.data?.questionnaires],
      completion_year: [this.data?.completion_year],
      management_decisions: [this.data?.management_decisions],
      other_initiatives: [this.data?.other_initiatives],
    });
    this.meliaTypes = await this.submissionService.getMeliaTypes();
    this.initiativeMelias = await this.meliaTypeService.getInitiativeMelias(
      this.data.initiative_id,
      null
    );
    const existTypesIds = this.initiativeMelias.map((d: any) => d.meliaType.id);
    this.meliaTypes = this.meliaTypes.filter(
      (d: any) =>
        !existTypesIds.includes(d.id) || d.id == this.data?.melia_type_id
    );
    this.initiatives = await this.initiativesService.getInitiativesOnly();
    this.AnticipatedYear =
      await this.anticipatedYearService.getAnticipatedYear();
    this.AnticipatedYear = this.AnticipatedYear.filter((d: any) => {
      return d.phase?.active == true;
    });
  }

  showerror: boolean = false;
  submit() {
    this.meliaForm.markAllAsTouched();
    this.meliaForm.updateValueAndValidity();
    if (this.meliaForm.valid) {
      this.showerror = false;
      this.dialogRef.close({
        // role: this.data.role,
        formValue: this.meliaForm.value,
      });
    } else {
      this.showerror = true;
    }
  }

  onCloseDialog() {
    this.dialogRef.close();
  }

  compareId(item: any, selected: any) {
    return item.id === selected.id;
  }

  onToppingRemoved(initiative: any) {
    const toppings = this.meliaForm?.value?.other_initiatives as any[];
    this.removeFirst(toppings, initiative);
    this.meliaForm.controls?.['other_initiatives'].setValue(toppings); // To trigger change detection
  }

  private removeFirst<T>(array: T[], toRemove: T): void {
    const index = array.indexOf(toRemove);
    if (index !== -1) {
      array.splice(index, 1);
    }
  }
}
