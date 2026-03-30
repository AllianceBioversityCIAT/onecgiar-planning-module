import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { Meta, Title } from "@angular/platform-browser";
import { Subscription } from "rxjs";
import { HeaderService } from "src/app/header.service";
import { AppSocket } from "src/app/socket.service";

interface OnlineUser {
  socketId: string;
  userId: number;
  fullName: string;
  email: string;
  sp?: string;
  initiative_id?: number;
  connectedAt: string;
}

@Component({
    selector: "app-online-users",
    templateUrl: "./online-users.component.html",
    styleUrls: ["./online-users.component.scss"],
    standalone: false
})
export class OnlineUsersComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ["fullName", "sp", "connectedAt"];
  dataSource = new MatTableDataSource<OnlineUser>([]);
  private onlineUsersSub?: Subscription;
  private reconnectSub?: Subscription;

  constructor(
    private headerService: HeaderService,
    private socket: AppSocket,
    private title: Title,
    private meta: Meta
  ) {
    this.headerService.background =
      "linear-gradient(to right, #04030F, #04030F)";
    this.headerService.backgroundNavMain =
      "linear-gradient(to right, #2A2E45, #212537)";
    this.headerService.backgroundUserNavButton =
      "linear-gradient(to right, #2A2E45, #212537)";
    this.headerService.backgroundFooter =
      "linear-gradient(to top right, #2A2E45, #212537)";
  }

  ngOnInit(): void {
    this.title.setTitle("Online users");
    this.meta.updateTag({
      name: "description",
      content: "Live view of online users and their SP.",
    });

    this.onlineUsersSub = this.socket
      .fromEvent<OnlineUser[]>("onlineUsers")
      .subscribe((users) => {
        this.dataSource.data = users ?? [];
      });

    this.reconnectSub = this.socket
      .fromEvent("connect")
      .subscribe(() => this.requestOnlineUsers());

    this.socket.connect();
    this.requestOnlineUsers();
  }

  ngOnDestroy(): void {
    this.onlineUsersSub?.unsubscribe();
    this.reconnectSub?.unsubscribe();
  }

  requestOnlineUsers() {
    this.socket.emit("getOnlineUsers");
  }
}
