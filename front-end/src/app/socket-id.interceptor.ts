import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppSocket } from './socket.service';

@Injectable()
export class SocketIdInterceptor implements HttpInterceptor {
  constructor(private socket: AppSocket) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    const socketId: string | undefined = (this.socket as any).ioSocket?.id;
    if (!socketId) {
      return next.handle(request);
    }
    const cloned = request.clone({
      setHeaders: { 'x-socket-id': socketId },
    });
    return next.handle(cloned);
  }
}
