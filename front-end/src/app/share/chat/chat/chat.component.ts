import {
  AfterViewInit,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  Optional,
  ViewChild,
} from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { ChatBoxComponent } from "../chat-box/chat-box.component";
import { ChatInputComponent } from "../chat-input/chat-input.component";
import { AuthService } from "src/app/services/auth.service";
import { ChatSocket } from "../module/chat-socket";
import { switchMap } from "rxjs";

export type ChatMessage = {
  replied_message: ChatMessage | null;
  message: string;
  id: string;
  user: any;
  create_date: string;
  version_id: number;
  initiative_id: number;
};

@Component({
  selector: "app-chat",
  templateUrl: "./chat.component.html",
  styleUrls: ["./chat.component.scss"],
})
export class ChatComponent implements AfterViewInit, OnDestroy {
  @ViewChild(ChatBoxComponent) private chatBoxComponent: ChatBoxComponent;
  @ViewChild(ChatInputComponent) private chatInputComponent: ChatInputComponent;
  index = 2;
  page = 1;
  user: any;
  replyMessages: ChatMessage | null;
  chatMessages: ChatMessage[] = [];
  isLoading = true;
  constructor(
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    public data: { initiative_id: number; version_id: number },
    @Optional() public dialogRef: MatDialogRef<any>,
    private socket: ChatSocket,
    private authService: AuthService
  ) {
    this.user = this.authService.getLoggedInUser();
  }

  ngAfterViewInit(): void {
    this.socket.initSocket();
    this.socket.onConnect$
      .pipe(
        switchMap(() => this.socket.joinChat(this.data.initiative_id))
      )
      .subscribe(() => this.getMessages());

    this.socket.onConnectError$.subscribe(() => {
      console.error("connect_error");
      this.socket.socket.connect();
    });

    this.socket.messageHasBeenAdded$.subscribe((message: any) => {
      this.chatMessages.push(message);
      if (this.chatBoxComponent) this.chatBoxComponent.scrollToBottom();
    });

    this.socket.messageHasBeenUpdated$.subscribe((message: any) => {
      const index = this.chatMessages.findIndex((m) => m.id === message.id);
      if (index) this.chatMessages[index] = message;
    });

    this.socket.messageHasBeenDeleted$.subscribe((message: any) => {
      const index = this.chatMessages.findIndex((m) => m.id === message.id);
      if (index) this.chatMessages.splice(index, 1);
    });
  }

  addMessage({ data, clearInput }: { data: any; clearInput: any }) {
    console.log(data, clearInput);
    if (data?.id) {
      this.updateMessage(
        {
          replied_message: this.replyMessages,
          ...data,
        },
        clearInput
      );
    } else {
      this.socket
        .addChatMassage({
          replied_message: this.replyMessages,
          message: data.message,
          initiative_id: this.data.initiative_id,
        })
        .subscribe((message: ChatMessage) => {
          this.chatMessages.push(message);
          if (clearInput) clearInput();
          if (this.chatBoxComponent) {
            console.log(this.chatBoxComponent);
            setTimeout(() => this.chatBoxComponent.scrollToBottom(), 10);
          }
        });
    }
  }

  updateMessage(body: any, clearInput: any) {
    this.socket.updateChatMassage(body).subscribe((message: ChatMessage) => {
      const index = this.chatMessages.findIndex((m) => m.id == body.id);
      this.chatMessages[index] = message;
      this.chatMessages = [...this.chatMessages];
      clearInput();
    });
  }

  addFromCode(message: ChatMessage) {
    this.chatMessages.push(message);
    if (this.chatBoxComponent) this.chatBoxComponent.scrollToBottom();
  }

  updateFromCode(message: ChatMessage) {
    const index = this.chatMessages.findIndex((m) => m.id == message.id);
    this.chatMessages[index] = message;
    this.chatMessages = [...this.chatMessages];
  }

  deletedFromCode(id: string) {
    this.chatMessages = [...this.chatMessages.filter((m) => m.id != id)];
  }

  getMessages() {
    this.socket
      .getMessages({
        initiative_id: this.data.initiative_id,
        version_id: this.data.version_id,
        page: this.page,
      })
      .subscribe({
        next: (response) => {
          const isInitLoad = this.chatMessages.length === 0;
          this.chatMessages = [
            ...response.data.reverse(),
            ...this.chatMessages,
          ];
          console.log("scroll to bottom 1");
          console.log(this.chatBoxComponent, isInitLoad);
          if (this.chatBoxComponent && isInitLoad) {
            console.log("scroll to bottom 2");
            this.chatBoxComponent.scrollToBottom();
          }
        },
        complete: () => (this.isLoading = false),
      });
  }

  deleteMessage(data: ChatMessage) {
    this.socket
      .deleteMessage({
        message_id: data.id,
      })
      .subscribe(() => {
        this.chatMessages = [
          ...this.chatMessages.filter((m) => m.id != data.id),
        ];
      });
  }

  editMessage(data: ChatMessage) {
    this.replyMessages = data.replied_message;
    this.chatInputComponent.form.patchValue(data);
  }

  ngOnDestroy(): void {
    this.socket
      .leaveChat(this.data.initiative_id)
      .subscribe(() => this.socket.socket.disconnect());
  }

  reply(message: ChatMessage) {
    this.replyMessages = message;
  }

  clearReply() {
    this.replyMessages = null;
  }

  loadMore() {
    this.page++;
    this.getMessages();
  }
}
