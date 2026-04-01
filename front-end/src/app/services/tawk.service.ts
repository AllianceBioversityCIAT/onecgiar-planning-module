import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

declare global {
  interface Window {
    Tawk_API: any;
    Tawk_LoadStart: Date;
  }
}

@Injectable({
  providedIn: 'root'
})
export class TawkService {
  private initialized = false;
  private loaded = false;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private authService: AuthService
  ) {
    this.init();
  }

  private init(): void {
    if (this.initialized || !environment.tawkPropertyId || !environment.tawkWidgetId) {
      return;
    }

    this.initialized = true;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    // Pre-populate visitor info if user is already logged in
    const user = this.authService.getLoggedInUser();
    if (user?.full_name || user?.email) {
      window.Tawk_API.visitor = {
        name: user.full_name || '',
        email: user.email || '',
      };
    }

    window.Tawk_API.onLoad = () => {
      this.loaded = true;
    };

    // Inject the Tawk.to script
    const s1 = this.document.createElement('script');
    s1.async = true;
    s1.src = `https://embed.tawk.to/${environment.tawkPropertyId}/${environment.tawkWidgetId}`;
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    const s0 = this.document.getElementsByTagName('script')[0];
    s0.parentNode?.insertBefore(s1, s0);
  }

  setVisitor(name: string, email: string): void {
    if (!window.Tawk_API) return;

    if (this.loaded) {
      window.Tawk_API.setAttributes({ name, email }, (error: any) => {});
    } else {
      window.Tawk_API.visitor = { name, email };
    }
  }
}
