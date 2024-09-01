import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { IconButtonComponent } from "../module/icon-button/icon-button.component";

@Component({
  selector: "app-chat-input",
  templateUrl: "./chat-input.component.html",
  styleUrls: ["./chat-input.component.scss"],
})
export class ChatInputComponent implements OnInit {
  form!: FormGroup;

  @Output() onTyping = new EventEmitter<any>();
  @Output() addMessage = new EventEmitter<any>();
  @Output() clearReply = new EventEmitter<any>();

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      id: [null],
      message: [``],
    });
    this.form.valueChanges.subscribe(() => {
      this.onTyping.emit({});
    });
  }

  submit() {
    if (
      ![undefined, null, ""].includes(
        this.getTextFromHTML(this.form.value.message).trim()
      )
    )
      this.addMessage.emit({
        data: { ...this.form.value },
        clearInput: () => {
          this.form.reset();
          this.clear();
        },
      });
  }

  getTextFromHTML(htmlString: any) {
    if (typeof htmlString == "string") {
      let div = document.createElement("div");
      div.innerHTML = htmlString?.trim();
      return div.innerText;
    } else return "";
  }

  clear(button?: IconButtonComponent) {
    this.form.reset();
    this.clearReply.emit(undefined);
  }
}
