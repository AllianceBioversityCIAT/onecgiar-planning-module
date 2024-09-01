import { Component, Input, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { AngularEditorConfig } from '@kolkov/angular-editor';
@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
})
export class EditorComponent implements OnInit {
  @Input() form: FormGroup = new FormGroup({});
  @Input() controller: string = '';
  @Input() type?: string;
  @Input() label?: string;
  @Input() placeholder?: string;
  @Input() validators?: ValidatorFn[];
  @Input() theme?: string;
  @Input() maximumNumberForShowingError?: number;
  @Input() dynamic?: Boolean = false;
  @Input('aria-labelledby') ariaLabelledby?: string;
  @Input() min?: number = Number.NEGATIVE_INFINITY;
  @Input() max?: number = Number.POSITIVE_INFINITY;
  @Input() direction: string = '';
  @Input() height: string = '';
  @Input() minHeight: string = '400px';
  @Input() withoutUpload: boolean = false;
  @Input() showToolbar: boolean = false;
  private _readonly = false;
  @Input() set readonly(value) {
    this._readonly = value;
    if (this.editorConfig) {
      this.editorConfig.editable = !this.readonly;
      this.editorConfig = { ...this.editorConfig };
    }
  }

  get readonly() {
    return this._readonly;
  }

  get editable() {
    return !this._readonly;
  }
  editorConfig: AngularEditorConfig;

  constructor() {}

  ngOnInit(): void {
    if (this.dynamic && this.form && this.controller) {
      this.form.addControl(this.controller, new FormControl());
      if (this.controller && this.validators && this.form) {
        this.form.get(this.controller)?.setValidators(this.validators);
      }
    }
    this.editorConfig = {
      editable: this.editable,
      spellcheck: true,
      height: this.height,
      minHeight: '0',
      maxHeight: this.minHeight,
      width: 'auto',
      minWidth: '0',
      translate: 'yes',
      enableToolbar: true,
      showToolbar: this.showToolbar,

      placeholder: '...',
      defaultParagraphSeparator: '',
      defaultFontName: '',

      defaultFontSize: '2',
      // fonts: [
      //   { class: 'arial', name: 'Arial' },
      //   { class: 'times-new-roman', name: 'Times New Roman' },
      //   { class: 'calibri', name: 'Calibri' },
      //   { class: 'comic-sans-ms', name: 'Comic Sans MS' },
      // ],
      // customClasses: [
      //   {
      //     name: 'quote',
      //     class: 'quote',
      //   },
      //   {
      //     name: 'redText',
      //     class: 'redText',
      //   },
      //   {
      //     name: 'titleText',
      //     class: 'titleText',
      //     tag: 'h1',
      //   },
      // ],
      // uploadUrl: 'v1/image',
      // upload: (file: File) => { ... }
      uploadWithCredentials: false,
      sanitize: true,
      toolbarPosition: 'top',
      toolbarHiddenButtons: this.configType,
    };
  }
  get configType() {
    if (String(this.withoutUpload) == 'false')
      return [['bold', 'italic'], ['fontSize']];
    else
      return [
        [
          // 'undo',
          // 'redo',
          // 'bold',
          // 'italic',
          // 'underline',
          'strikeThrough',
          'subscript',
          'superscript',
          // 'justifyLeft',
          // 'justifyCenter',
          // 'justifyRight',
          // 'justifyFull',
          'indent',
          'outdent',
          // 'insertUnorderedList',
          // 'insertOrderedList',
          // 'heading',
          'fontName',
        ],
        [
          // 'fontSize',
          // 'textColor',
          // 'backgroundColor',
          'customClasses',
          // 'link',
          // 'unlink',
          'insertImage',
          'insertVideo',
          // 'insertHorizontalRule',
          // 'removeFormat',
          'toggleEditorMode',
        ],
      ];
  }
  get errors(): ValidationErrors | undefined | null {
    if (this.form && this.controller && this.form.get(this.controller)) {
      return this.form.get(this.controller)?.errors;
    } else {
      return {};
    }
  }

  ngOnDestroy(): void {
    if (this.dynamic && this.controller) {
      if (this.form && this.form.get(this.controller)) {
        this.form.removeControl(this.controller);
      }
    }
  }
}
