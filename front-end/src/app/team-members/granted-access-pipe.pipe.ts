import { Pipe, PipeTransform } from '@angular/core';
import { ROLES } from '../shared/roles';

@Pipe({
    name: 'grantedAccessPipe',
    standalone: false
})
export class GrantedAccessPipePipe implements PipeTransform {

  private readonly specialRoles: string[] = [
    'MELIA Focal Point',
    ROLES.Financial_Focal_Point,
  ];

  transform(data: any[], role: string = ''): string {
    if (!Array.isArray(data) || data.length === 0) {
      if (this.specialRoles.includes(role)) {
        return role;
      } else {
        return 'Full access';
      }
    }
    return data.map((d: any) => d.name).join(', ');
  }
}
