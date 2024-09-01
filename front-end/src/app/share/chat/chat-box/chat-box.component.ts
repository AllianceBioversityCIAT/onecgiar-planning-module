import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { v4 as uuid } from "uuid";
import { AuthService } from "src/app/services/auth.service";
import { ChatMessage } from "../chat/chat.component";

@Component({
  selector: "app-chat-box",
  templateUrl: "./chat-box.component.html",
  styleUrls: ["./chat-box.component.scss"],
})
export class ChatBoxComponent implements OnInit {
  readonly lastId = uuid();

  @Output() replyMessage = new EventEmitter<any>();
  @Output() deleteMessage = new EventEmitter<any>();
  @Output() editMessage = new EventEmitter<any>();
  @Output() loadMore = new EventEmitter<any>();

  @Input() chatMassages: Array<ChatMessage> = [];
  @Input() role: string = "user";
  @Input() user: any;
  loggedInUser: any;
  constructor(public authService: AuthService) {
    this.loggedInUser = this.authService.getLoggedInUser();
  }
  ngOnInit(): void {}

  scrollToBottom(): void {
    try {
      setTimeout(() => {
        const ele = document.getElementById(this.lastId);
        if (ele) ele.scrollTo({ behavior: "smooth", top: ele.scrollHeight });
      }, 50);
    } catch (err) {}
  }

  onScroll(e: Event) {
    if ((e?.target as HTMLDivElement).scrollTop === 0) {
      console.log((e?.target as HTMLDivElement).scrollTop);
      this.loadMore.emit();
    }
  }
}
