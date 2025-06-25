import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'grantedAccessPipe'
})
export class GrantedAccessPipePipe implements PipeTransform {

  transform(data: any[], role: string = ''): string {
    if (!Array.isArray(data) || data.length === 0) {
      if(role == "MELIA Focal Point") {
        return 'MELIA Focal Point';
      } else {
        return 'Full access';
      }
    }
    return data.map((d: any) => d.name).join(', ');
  }
}
