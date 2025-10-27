import {
  Directive,
  ElementRef,
  Renderer2,
  OnInit,
  OnDestroy,
  AfterViewInit
} from '@angular/core';

@Directive({
  selector: '[stickyOnScroll]'
})
export class StickyOnScrollDirective implements OnInit, AfterViewInit, OnDestroy {
  private observer?: IntersectionObserver;
  private wrapperEl: HTMLElement;
  private stickyEl: HTMLElement | null;
  private stickyHeight = 0;
  private isActive = false;
  private timeoutId?: any;

  constructor(private host: ElementRef, private renderer: Renderer2) {
    this.wrapperEl = this.host.nativeElement as HTMLElement;
    this.stickyEl = this.wrapperEl.firstElementChild as HTMLElement | null;
  }

  ngOnInit(): void {
    // Keep wrapper in layout flow
    this.renderer.setStyle(this.wrapperEl, 'position', 'relative');
  }

  ngAfterViewInit(): void {
    // 🕒 Delay setup by 5 seconds to allow layout to stabilize
    this.timeoutId = setTimeout(() => {
      // Measure sticky element height
      if (this.stickyEl) {
        this.stickyHeight = this.stickyEl.getBoundingClientRect().height;
      }

      // Set up IntersectionObserver
      this.observer = new IntersectionObserver(
        ([entry]) => {
          this.updateState(entry);
        },
        { threshold: [0.2] }
      );

      this.observer.observe(this.wrapperEl);

      // Initial check after delay
      const rect = this.wrapperEl.getBoundingClientRect();
      const initialRatio = this.computeInitialRatio(rect);
      this.updateState({ intersectionRatio: initialRatio } as IntersectionObserverEntry);
    }, 1000); // 5 seconds
  }

  private computeInitialRatio(rect: DOMRect): number {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const visibleTop = Math.max(rect.top, 0);
    const visibleBottom = Math.min(rect.bottom, viewportHeight);
    const visibleHeight = Math.max(visibleBottom - visibleTop, 0);
    const totalHeight = rect.height || 1;
    return visibleHeight / totalHeight;
  }

  private updateState(entry: IntersectionObserverEntry) {
    const shouldStick = entry.intersectionRatio < 1;

    if (shouldStick && !this.isActive) {
      this.activateSticky();
    } else if (!shouldStick && this.isActive) {
      this.deactivateSticky();
    }
  }

  private activateSticky() {
    this.isActive = true;
    this.renderer.addClass(this.wrapperEl, 'is-sticky');

    if (this.stickyHeight > 0) {
      this.renderer.setStyle(this.wrapperEl, 'height', this.stickyHeight + 'px');
    }
  }

  private deactivateSticky() {
    this.isActive = false;
    this.renderer.removeClass(this.wrapperEl, 'is-sticky');
    this.renderer.removeStyle(this.wrapperEl, 'height');
  }

  ngOnDestroy(): void {
    // Cleanup observer and timeout
    if (this.observer) this.observer.disconnect();
    if (this.timeoutId) clearTimeout(this.timeoutId);
  }
}
