import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { LoaderService } from './services/loader.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private totalRequests = 0;

  constructor(private loaderService: LoaderService) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    this.totalRequests++;
    setTimeout(() => {
      const url = request.url.split('/').slice(-1)[0];
        if(url != 'history')
          this.loaderService.setLoading(this.totalRequests != 0);
        else
          this.loaderService.setLoading(this.totalRequests != 0, 'Loading');
    }, 0);

    return next.handle(request).pipe(
      finalize(() => {
        this.totalRequests--;
          this.loaderService.setLoading(this.totalRequests != 0);
      })
    );
  }
}
