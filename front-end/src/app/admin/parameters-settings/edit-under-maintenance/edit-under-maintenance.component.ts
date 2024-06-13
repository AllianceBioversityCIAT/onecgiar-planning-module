import { Component, Inject, OnInit } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialog } from "@angular/material/dialog";
import { UnderMaintenanceService } from "src/app/services/under-maintenance.service";
import { ToastrService } from "ngx-toastr";
import { AsyncSubject, Subject } from "rxjs";

@Component({
  selector: "app-edit-under-maintenance",
  templateUrl: "./edit-under-maintenance.component.html",
  styleUrls: ["./edit-under-maintenance.component.scss"],
})
export class EditUnderMaintenanceComponent implements OnInit {
  constructor(
    private fb: FormBuilder,
    private toster: ToastrService,
    private dialog: MatDialog,
    private underMaintenanceService: UnderMaintenanceService,
    @Inject(MAT_DIALOG_DATA) public data: { element: any }
  ) {}

  async ngOnInit() {
    // this.setupEditor();
  }
  // editor: Editor | undefined;
  // settings: any;
  // editorSubject: Subject<any> = new AsyncSubject();

  constantForm = this.fb.group({
    id: this.fb.control(this.data.element.id),

    value: this.fb.control(this.data.element.value, [Validators.required]),
  });

  async onSubmit() {
    if (this.constantForm.valid) {
      await this.underMaintenanceService.editUnderMaintenance(
        this.constantForm.value
      );
      this.onCloseDialog();
      this.toster.success("updated successfully");
    }
  }

  // async onSubmit() {
  //   if (this.constantForm.valid) {
  //     await this.underMaintenanceService.editUnderMaintenance(
  //       this.constantForm.value
  //     );
  //   }
  // }

  // onEditorInit(event: any) {
  //   this.editorSubject.next(event.editor);
  //   this.editorSubject.complete();
  // }

  // setupEditor() {
  //   this.settings = {
  //     base_url: "/tinymce",
  //     selector: "textarea",
  //     menubar: false,
  //     suffix: ".min",
  //     toolbar:
  //       "undo redo | blocks fontsize  | bold italic | alignleft aligncenter alignright alignjustify  | bullist numlist outdent indent  | forecolor  |fullscreen",
  //     plugins: "image code link paste fullscreen ",
  //     content_style:
  //       "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
  //     setup: (editor: Editor) => {
  //       this.editor = editor;
  //     },
  //   };
  // }

  onCloseDialog() {
    this.dialog.closeAll();
  }
}
