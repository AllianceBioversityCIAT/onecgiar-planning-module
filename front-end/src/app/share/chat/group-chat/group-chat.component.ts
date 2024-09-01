import { Component, Inject, OnInit, Optional, ViewChild } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { ChatBoxComponent } from "../chat-box/chat-box.component";
import { ChatInputComponent } from "../chat-input/chat-input.component";
import { ChatMessage } from "../chat/chat.component";
import { ChatSocket } from "../module/chat-socket";

@Component({
  selector: "app-group-chat",
  templateUrl: "./group-chat.component.html",
  styleUrls: ["./group-chat.component.scss"],
})
export class GroupChatComponent implements OnInit {
  @ViewChild(ChatBoxComponent) private chatBoxComponent: ChatBoxComponent;
  @ViewChild(ChatInputComponent) private chatInputComponent: ChatInputComponent;
  index = 2;
  replyMessages: ChatMessage | null = null;
  chatMessages: ChatMessage[] = [];
  constructor(
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    public data: { flow: any; node: any; socket: ChatSocket; role: string, user:any },
    @Optional() public dialogRef: MatDialogRef<any>
  ) {}

  ngOnInit(): void {
    this.getMessages();
  }

  addMessage({ data, clearInput }: { data: any; clearInput: any }) {
    if (data?.id) {
      this.updateMessage(
        data?.id,
        {
          resource_id: this.data.node.chat_group_id,
          group_id: this.data.node.chat_group_id,
          resource_type: "diagramNodeChat",
          replied_message: this.replyMessages,
          ...data,
        },
        clearInput
      );
    } else {
      this.data.socket
        .addChatMassage({
          flowId: this.data.flow.id,
          body: {
            resource_id: this.data.node.chat_group_id,
            group_id: this.data.node.chat_group_id,
            resource_type: "diagramNodeChat",
            replied_message: this.replyMessages,
            ...data,
          },
        })
        .subscribe((message: ChatMessage) => {
          this.chatMessages.push(message);
          if (clearInput) clearInput();
          if (this.chatBoxComponent) this.chatBoxComponent.scrollToBottom();
        });
    }
  }

  updateMessage(id: string, body: any, clearInput: any) {
    this.data.socket
      .updateChatMassage({
        id,
        flowId: this.data.flow.id,
        body,
        group_id: this.data.node.chat_group_id,
      })
      .subscribe((message: ChatMessage) => {
        const index = this.chatMessages.findIndex((m) => m.id == id);
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
    this.data.socket
      .getMessages({
        resource_id: this.data.node.chat_group_id,
        resource_type: "diagramNodeChat",
      })
      .subscribe((response) => {
        this.chatMessages = response.data;
        setTimeout(() => {
          if (this.chatBoxComponent) this.chatBoxComponent.scrollToBottom();
        }, 10);
      });
  }

  deleteMessage(data: ChatMessage) {
    this.data.socket
      .deleteMessage({
        flowId: this.data.flow.id,
        group_id: this.data.node.chat_group_id,
        id: data.id,
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

  reply(message: ChatMessage) {
    this.replyMessages = message;
  }

  clearReply() {
    this.replyMessages = null;
  }
}
