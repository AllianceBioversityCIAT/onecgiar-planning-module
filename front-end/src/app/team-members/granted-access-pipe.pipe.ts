import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'grantedAccessPipe'
})
export class GrantedAccessPipePipe implements PipeTransform {

  transform(data: any[], role: string = ''): string {
     let newRoles = ['MELIA Focal Point', 'Financial Focal Point'];
    if (!Array.isArray(data) || data.length === 0) {
      if(newRoles.includes(role)) {
        return role;
      } else {
        return 'Full access';
      }
    }
    return data.map((d: any) => d.name).join(', ');
  }
}
