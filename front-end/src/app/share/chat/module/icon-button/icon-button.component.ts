import {
  Component,
  EventEmitter,
  forwardRef,
  Input,
  Output,
  ViewChild,
} from "@angular/core";
import { BehaviorSubject, of } from "rxjs";
import { delay } from "rxjs/operators";
import { InjectionToken } from "@angular/core";

export interface ButtonWithLoader {
  start: () => void;
  stop: () => void;
  fucus: () => void;
}

export const BUTTON_LOADER = new InjectionToken<ButtonWithLoader>(
  "BUTTON_LOADER"
);

@Component({
  selector: "app-icon-button",
  templateUrl: "./icon-button.component.html",
  styleUrls: ["./icon-button.component.scss"],
  providers: [
    {
      provide: BUTTON_LOADER,
      useExisting: forwardRef(() => IconButtonComponent),
      multi: true,
    },
  ],
})
export class IconButtonComponent implements ButtonWithLoader {
  @Input() appRouterLink: any = null;
  @Input() queryParams: any = {};

  @Input() src: string | null = null;
  @Input() type: "icon" | "image" = "icon";

  @ViewChild("button", { static: false }) button: HTMLButtonElement;
  @Input() disabled: boolean = false;
  @Input() classes: string = "button";
  @Input() icon: string = "menu";
  @Input() color: string = "";
  @Output() clicked = new EventEmitter<IconButtonComponent>();
  private _loading$ = new BehaviorSubject(false);
  get loading$() {
    return this._loading$.asObservable();
  }

  click() {
    this.clicked.emit(this);
  }

  start() {
    this._loading$.next(true);
  }

  stop() {
    of(null)
      .pipe(delay(300))
      .subscribe(() => this._loading$.next(false));
  }

  fucus() {
    this.button.focus();
  }
}
