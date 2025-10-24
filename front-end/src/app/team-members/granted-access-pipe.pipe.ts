import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'grantedAccessPipe'
})
export class GrantedAccessPipePipe implements PipeTransform {

  transform(data: any[]): string {

    return data.map((d: any) => d.name).join(', ');
  }
}
