import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrustHTMLPipe } from './trust-html.pipe';

@NgModule({
  declarations: [TrustHTMLPipe],
  exports: [TrustHTMLPipe],
  imports: [CommonModule],
})
export class TrustHTMLModule {}
