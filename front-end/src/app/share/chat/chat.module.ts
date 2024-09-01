import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ChatComponent } from "./chat/chat.component";
import { ChatMessageComponent } from "./chat-message/chat-message.component";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { GroupChatComponent } from "./group-chat/group-chat.component";
import { EditorModule } from "../editor/editor.module";
import { IconButtonModule } from "./module/icon-button/icon-button.module";
import { TrustHTMLModule } from "../trust-html/trust-html.module";
import { TimeagoModule } from "ngx-timeago";
import { ChatBoxComponent } from "./chat-box/chat-box.component";
import { ChatInputComponent } from "./chat-input/chat-input.component";
import { MatButtonModule } from "@angular/material/button";
import { ChatSpinnerComponent } from "./chat-spinner/chat-spinner.component";

@NgModule({
  declarations: [
    ChatComponent,
    ChatBoxComponent,
    ChatInputComponent,
    ChatMessageComponent,
    GroupChatComponent,
    ChatSpinnerComponent,
  ],
  exports: [ChatComponent, ChatBoxComponent, ChatInputComponent],
  imports: [
    CommonModule,
    EditorModule,
    IconButtonModule,
    MatIconModule,
    MatMenuModule,
    TimeagoModule,
    TrustHTMLModule,
    MatButtonModule,
    MatIconModule,
  ],
})
export class ChatModule {}
