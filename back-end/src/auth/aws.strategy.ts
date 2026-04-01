import { Strategy } from 'passport-custom';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Request, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { catchError, firstValueFrom, map } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
var querystring = require('querystring');
@Injectable()
export class AwsStrategy extends PassportStrategy(Strategy, 'AWS') {
  constructor(
    private readonly jwtService: JwtService,
    private http: HttpService,
    private userService: UsersService,
  ) {
    super();
  }

  async validate(@Request() req) {
    const client_id = process.env.Gognito_client_id;
    const client_secret = process.env.Gognito_client_secret;
    const redirect_uri = process.env.Gognito_client_redirect_uri;
    const code = req.body.code;
    const access_token = await firstValueFrom(
      this.http
        .post(
          `${process.env.Cognito_API}/oauth2/token`,
          querystring.stringify({
            grant_type: 'authorization_code',
            client_id,
            client_secret,
            code,
            redirect_uri,
          }),
          {
            auth: {
              username: client_id,
              password: client_secret,
            },
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        )
        .pipe(map((d) => d.data.access_token)),
    ).catch((e) => false);

    if (!access_token)
      throw new UnauthorizedException(
        'Authorization Code does not exist or expired',
      );

    const profile = await firstValueFrom(
      this.http
        .get(`${process.env.Cognito_API}/oauth2/userInfo`, {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        })
        .pipe(map((d) => d.data)),
    ).catch((e) => false);

    if (!profile) throw new UnauthorizedException();
    console.log('[Cognito userInfo]', JSON.stringify(profile, null, 2));
    let userInfo = null;
    const email = (<string>profile.email || '').toLowerCase();
    const profileName = profile?.name?.includes('@') ? null : profile?.name;
    const first_name = profile?.given_name || profileName?.split(' ')[0] || email.split('@')[0];
    const last_name = profile?.family_name || profileName?.split(' ').slice(1).join(' ') || '';

    const user = await this.userService.findOneByEmail(email);

    if (user) {
      // Only update name if user doesn't already have one set
      if (!user.first_name && !user.last_name) {
        user.first_name = first_name;
        user.last_name = last_name;
        await this.userService.userRepository.save(user);
      }
      // Re-fetch to get the generated full_name column
      userInfo = await this.userService.findOneByEmail(email);
    } else {
      await this.userService.userRepository.save(
        this.userService.userRepository.create({ email, first_name, last_name }),
      );
      userInfo = await this.userService.findOneByEmail(email);
    }

    if (userInfo) {
      let access_token = this.jwtService.sign({...userInfo}, {
        expiresIn: 10 * 365 * 24 * 60 * 60,
      });
      return {
        expires_in: (this.jwtService.decode(access_token) as any).exp,
        access_token,
      };
    } else throw new UnauthorizedException();
  }
}
