export const PAGE_GAP = 12;

/**
 * Vertical page positions. Sizes start as a guess (page 1's size) and are corrected
 * as real page sizes arrive, so opening a 10,000-page file doesn't wait on every page.
 */
export class PageLayout {
  readonly count: number;
  #widths: Float64Array;
  #heights: Float64Array;
  #tops: Float64Array;
  scale = 1;
  contentWidth = 0;
  contentHeight = 0;

  constructor(count: number, width: number, height: number) {
    this.count = count;
    this.#widths = new Float64Array(count).fill(width);
    this.#heights = new Float64Array(count).fill(height);
    this.#tops = new Float64Array(count);
  }

  /** Records a page's real size (at scale 1). Returns true if it differed from the guess. */
  setBaseSize(index: number, width: number, height: number): boolean {
    if (this.#widths[index] === width && this.#heights[index] === height) return false;
    this.#widths[index] = width;
    this.#heights[index] = height;
    return true;
  }

  baseWidth(index: number): number {
    return this.#widths[index];
  }

  baseHeight(index: number): number {
    return this.#heights[index];
  }

  compute(scale: number, viewportWidth: number): void {
    this.scale = scale;
    let y = PAGE_GAP;
    let maxWidth = 0;
    for (let i = 0; i < this.count; i++) {
      this.#tops[i] = y;
      y += this.#heights[i] * scale + PAGE_GAP;
      maxWidth = Math.max(maxWidth, this.#widths[i] * scale);
    }
    this.contentHeight = y;
    this.contentWidth = Math.max(viewportWidth, maxWidth + 2 * PAGE_GAP);
  }

  top(index: number): number {
    return this.#tops[index];
  }

  left(index: number): number {
    return Math.max(PAGE_GAP, (this.contentWidth - this.width(index)) / 2);
  }

  width(index: number): number {
    return this.#widths[index] * this.scale;
  }

  height(index: number): number {
    return this.#heights[index] * this.scale;
  }

  /** Index of the page at vertical offset y (the gap above a page belongs to it). */
  indexAt(y: number): number {
    let lo = 0;
    let hi = this.count - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.#tops[mid] - PAGE_GAP <= y) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }
}
