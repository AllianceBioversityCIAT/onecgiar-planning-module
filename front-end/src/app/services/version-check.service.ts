import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppSocket } from '../socket.service';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class VersionCheckService {
  updateAvailable$ = new BehaviorSubject<boolean>(false);

  constructor(private socket: AppSocket) {
    this.socket.fromEvent<{ version: string }>('appVersion').subscribe(({ version }) => {
      if (
        version !== 'dev' &&
        environment.buildVersion !== 'dev' &&
        version !== environment.buildVersion
      ) {
        this.updateAvailable$.next(true);
      }
    });
  }
}
