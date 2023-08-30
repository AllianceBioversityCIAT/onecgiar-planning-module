import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import {
  catchError,
  delay,
  distinctUntilChanged,
  map,
  tap,
} from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _permission: any;
  constructor(
    private http: HttpClient,
    @Inject(DOCUMENT) private document: Document,
    private router: Router
  ) {}

  async logintoAWS(code: any, redirect_url: any  = null) {
    let { access_token, expires_in } = await this.http
      .post('api/auth/aws', { code })
      .pipe(
        map((d: any) => d),
        catchError((e)=>{
          this.goToLogin(redirect_url, 'AWS');
          return e
        }
        )
      )
      .toPromise();
    if (access_token) {
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('access_expires_in', expires_in);
      if (redirect_url) this.router.navigateByUrl(redirect_url);
      else this.router.navigateByUrl('/dashboard');
    }
  }

  goToLogin(redirect_url: string = '', type:any = null) {
    this.document.location.href =
      environment.aws_cognito_link +
      `/login?client_id=${
        environment.aws_cognito_client_id
      }&response_type=code&scope=aws.cognito.signin.user.admin+email+openid+phone+profile&redirect_uri=${
        environment.aws_cognito_client_redirect_uri
      }${redirect_url ? '?redirect_url=' + redirect_url : ''}`;
  }
}
