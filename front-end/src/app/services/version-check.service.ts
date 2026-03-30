import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppSocket } from '../socket.service';

@Injectable({ providedIn: 'root' })
export class VersionCheckService {
  updateAvailable$ = new BehaviorSubject<boolean>(false);
  private initialVersion: string | null = null;

  constructor(private socket: AppSocket) {
    this.socket.fromEvent<{ version: string }>('appVersion').subscribe(({ version }) => {
      if (!version || version === 'dev') return;
      if (this.initialVersion === null) {
        this.initialVersion = version;
        return;
      }
      if (version !== this.initialVersion) {
        this.updateAvailable$.next(true);
      }
    });
  }
}
