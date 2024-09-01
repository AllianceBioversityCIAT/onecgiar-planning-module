import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { verify } from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { isEmpty } from 'class-validator';
import { UsersService } from './users/users.service';
@Injectable()
export class WsGuard implements CanActivate {
  constructor(private userService: UsersService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | any | Promise<boolean | any> | Observable<boolean | any> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    if (isEmpty(client.handshake.query.Authorization)) return false;
    const bearerToken = (client.handshake.query.Authorization as string).split(
      ' ',
    )[1];
    try {
      const decoded = verify(bearerToken, process.env.JWT_SECRET_KEY) as any;

      return new Promise((resolve, reject) => {
        return this.userService.findOne(decoded.id).then((user) => {
          if (user) {
            context.switchToHttp().getRequest().user = user;
            resolve(user);
          } else {
            reject(false);
          }
        });
      });
    } catch (ex) {
      console.error(ex);
      return false;
    }
  }
}
