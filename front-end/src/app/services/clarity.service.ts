import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClarityService {
  private initialized = false;

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.init();
  }

  private init(): void {
    // only run in prod, only run once
    if (!environment.production || this.initialized || !environment.clarityProjectId) {
      return;
    }

    this.initialized = true;

    // --- this is basically the Clarity snippet but added dynamically ---
    (function(c: any, l: any, a: any, r: any, i: any, t?: any, y?: any) {
      c[a] =
        c[a] ||
        function() {
          (c[a].q = c[a].q || []).push(arguments);
        };
      t = l.createElement(r);
      t.async = true;
      t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0];
      y.parentNode?.insertBefore(t, y);
    })(window, this.document, 'clarity', 'script', environment.clarityProjectId);
  }
}
