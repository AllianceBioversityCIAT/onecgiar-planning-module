import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from "@angular/core";

export interface PorbTourStep {
  anchorId: string;
  title: string;
  description: string;
}

@Component({
    selector: "app-porb-tour",
    templateUrl: "./porb-tour.component.html",
    styleUrls: ["./porb-tour.component.scss"],
    standalone: false
})
export class PorbTourComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() open = false;
  @Input() steps: PorbTourStep[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() stepChanged = new EventEmitter<{ index: number; anchorId: string }>();

  currentIndex = 0;
  bubbleTop = 120;
  bubbleLeft = 120;
  bubbleMaxWidth = 420;
  spotlightTop = 0;
  spotlightLeft = 0;
  spotlightRight = 0;
  spotlightBottom = 0;

  private highlightedEl?: HTMLElement;
  private resizeHandler = () => this.positionForCurrentStep();

  constructor(private host: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    window.addEventListener("resize", this.resizeHandler);
    window.addEventListener("scroll", this.resizeHandler, true);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["open"]) {
      if (this.open) {
        this.currentIndex = 0;
        setTimeout(() => this.positionForCurrentStep(), 0);
      } else {
        this.clearHighlight();
      }
    }
  }

  ngOnDestroy(): void {
    this.clearHighlight();
    window.removeEventListener("resize", this.resizeHandler);
    window.removeEventListener("scroll", this.resizeHandler, true);
  }

  get activeStep(): PorbTourStep | null {
    if (!this.steps.length) return null;
    return this.steps[this.currentIndex] || null;
  }

  get hasPrev(): boolean {
    return this.currentIndex > 0;
  }

  get isLast(): boolean {
    return this.currentIndex >= this.steps.length - 1;
  }

  previous() {
    if (!this.hasPrev) return;
    // Search backward for a step whose anchor exists in the DOM.
    for (let i = this.currentIndex - 1; i >= 0; i--) {
      const sel = `[data-tour-anchor="${this.steps[i].anchorId}"]`;
      if (document.querySelector(sel)) {
        this.currentIndex = i;
        this.positionForCurrentStep();
        return;
      }
    }
  }

  next() {
    if (this.isLast) {
      this.finish();
      return;
    }
    this.currentIndex += 1;
    this.positionForCurrentStep();
  }

  skip() {
    this.finish();
  }

  private finish() {
    this.open = false;
    this.clearHighlight();
    this.closed.emit();
  }

  private positionForCurrentStep() {
    if (!this.open || !this.activeStep) {
      return;
    }
    const selector = `[data-tour-anchor="${this.activeStep.anchorId}"]`;
    const target = document.querySelector(selector) as HTMLElement | null;
    if (!target) {
      // Anchor not in DOM (e.g. HLO button hidden on AOW00) — skip to next visible step.
      this.skipToNextVisible(this.currentIndex);
      return;
    }

    this.highlight(target);
    target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    const rect = target.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const bubbleWidth = Math.min(this.bubbleMaxWidth, viewportWidth - 32);

    let left = rect.left;
    if (left + bubbleWidth > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - bubbleWidth - 12);
    }

    // Default placement under target; fallback above if not enough viewport space.
    let top = rect.bottom + 12;
    const bubbleHeight = 210;
    if (top + bubbleHeight > viewportHeight - 12) {
      top = Math.max(12, rect.top - bubbleHeight - 12);
    }

    const pad = 8;
    this.spotlightTop = Math.max(0, rect.top - pad);
    this.spotlightLeft = Math.max(0, rect.left - pad);
    this.spotlightRight = Math.min(viewportWidth, rect.right + pad);
    this.spotlightBottom = Math.min(viewportHeight, rect.bottom + pad);

    this.bubbleLeft = left;
    this.bubbleTop = top;
    this.stepChanged.emit({ index: this.currentIndex, anchorId: this.activeStep!.anchorId });
  }

  private skipToNextVisible(fromIndex: number) {
    // Search forward for a step whose anchor exists in the DOM.
    for (let i = fromIndex + 1; i < this.steps.length; i++) {
      const sel = `[data-tour-anchor="${this.steps[i].anchorId}"]`;
      if (document.querySelector(sel)) {
        this.currentIndex = i;
        this.positionForCurrentStep();
        return;
      }
    }
    // No visible steps remaining — finish the tour.
    this.finish();
  }

  private highlight(target: HTMLElement) {
    this.clearHighlight();
    this.highlightedEl = target;
    this.highlightedEl.classList.add("porb-tour-highlight");
  }

  private clearHighlight() {
    if (this.highlightedEl) {
      this.highlightedEl.classList.remove("porb-tour-highlight");
      this.highlightedEl = undefined;
    }
  }
}
