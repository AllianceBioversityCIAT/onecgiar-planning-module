import { Pipe, PipeTransform } from '@angular/core';
/*
 * Raise the value exponentially
 * Takes an exponent argument that defaults to 1.
 * Usage:
 *   value | exponentialStrength:exponent
 * Example:
 *   {{ 2 | exponentialStrength:10 }}
 *   formats to: 1024
 */
@Pipe({
    name: 'inQue', pure: false,
    standalone: false
})
export class InQuePipe implements PipeTransform {
  transform(value: boolean[]): boolean {
    return Boolean(Object.values(value).indexOf(true) == -1);
    // if (value) return Boolean(Object.values(value).indexOf(true) != -1);
    // else false;
    // return false;
  }
}
