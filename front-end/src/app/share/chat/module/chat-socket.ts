import { Injectable } from "@angular/core";
import { Socket, SocketIoConfig } from "ngx-socket-io";
import { from, Observable } from "rxjs";
import { ChatMessage } from "../chat/chat.component";
import { environment } from "src/environments/environment";

export interface FilterResult<T> {
  data: T[];
  meta: Meta;
  links: Links;
}

export interface Meta {
  itemsPerPage: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  sortBy: string[][];
  filter: { [key: string]: any };
}

export interface Links {
  current: string;
  next: string;
  last: string;
}

@Injectable({ providedIn: "root" })
export class ChatSocket {
  socket: Socket;
  config = (token: string): SocketIoConfig => {
    return {
      url: environment.socket_url + 'chat',
      options: {
        path: environment.socket_path,
        reconnectionDelay: 200,
        reconnectionDelayMax: 400,
        reconnectionAttempts: 100,
        query: {
          route: "/chat",
          Authorization: "Bearer " + token,
        },
      },
    };
  };

  initSocket() {
    this.socket = new Socket(
      this.config(localStorage.getItem("access_token") ?? "")
    );
    this.socket
      .fromEvent("connect")
      .subscribe(() => console.info("socket connect successfully"));

    this.socket.fromEvent("connect_error").subscribe((r) => {
      console.error("connect_error", r);
      this.socket.connect();
    });

    this.socket.fromEvent("error").subscribe((r) => console.error("error", r));
  }

  get messageHasBeenAdded$() {
    return this.socket.fromEvent("message-has-been-added");
  }

  get messageHasBeenUpdated$() {
    return this.socket.fromEvent("message-has-been-updated");
  }

  get messageHasBeenDeleted$() {
    return this.socket.fromEvent("message-has-been-deleted");
  }

  get onConnect$() {
    return this.socket.fromEvent("connect");
  }

  get onConnectError$() {
    return this.socket.fromEvent("connect_error");
  }

  get error$() {
    return this.socket.fromEvent("error");
  }

  onException() {
    return this.socket.fromEvent("exception");
  }

  addChatMassage(args: Record<string, any>) {
    const promise: Promise<Record<string, any>> = new Promise<any>(
      (res, rej) => {
        this.socket.emit("add-group-chat-message", args, (data: any) =>
          res(data)
        );
      }
    );
    return from<any>(promise) as Observable<any>;
  }

  updateChatMassage(args: Record<string, any>) {
    const promise: Promise<Record<string, any>> = new Promise<any>(
      (res, rej) => {
        this.socket.emit("update-group-chat-message", args, (data: any) =>
          res(data)
        );
      }
    );
    return from<any>(promise) as Observable<any>;
  }

  getMessages(args: Record<string, any>) {
    const promise: Promise<Record<string, any>> = new Promise<any>(
      (res, rej) => {
        this.socket.emit("get-group-chat-messages", args, (data: any) =>
          res(data)
        );
      }
    );
    return from<any>(promise) as Observable<FilterResult<ChatMessage>>;
  }

  deleteMessage(args: Record<string, any>) {
    const promise: Promise<Record<string, any>> = new Promise<any>(
      (res, rej) => {
        this.socket.emit("delete-group-chat-message", args, (data: any) =>
          res(data)
        );
      }
    );
    return from<any>(promise) as Observable<any>;
  }

  joinChat(initiative_id: number) {
    const promise: Promise<Record<string, any>> = new Promise<any>(
      (res, rej) => {
        this.socket.emit("join-group-chat", { initiative_id }, (data: any) =>
          res(data)
        );
      }
    );
    return from<any>(promise) as Observable<any>;
  }

  leaveChat(initiative_id: number) {
    const promise: Promise<Record<string, any>> = new Promise<any>(
      (res, rej) => {
        this.socket.emit("leave-group-chat", { initiative_id }, (data: any) =>
          res(data)
        );
      }
    );
    return from<any>(promise) as Observable<any>;
  }
}
