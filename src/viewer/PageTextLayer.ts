import { TextLayer, type PDFPageProxy } from "pdfjs-dist";

/** A range of a page's text (offsets into the page text built by `pageTextOffsets`). */
export interface HighlightRange {
  start: number;
  end: number;
  selected: boolean;
}

/**
 * Invisible, selectable text over a rendered page, built at scale 1 and scaled by the
 * `--total-scale-factor` CSS variable, so zooming never rebuilds it.
 */
export class PageTextLayer {
  readonly div = document.createElement("div");
  #layer: TextLayer | null = null;
  #highlighted = new Set<number>();

  constructor(parent: HTMLElement) {
    this.div.className = "textLayer";
    parent.append(this.div);
  }

  get ready(): boolean {
    return this.#layer !== null;
  }

  async build(page: PDFPageProxy): Promise<void> {
    const layer = new TextLayer({
      textContentSource: page.streamTextContent(),
      container: this.div,
      viewport: page.getViewport({ scale: 1 }),
    });
    await layer.render();
    this.#layer = layer;
  }

  /**
   * Marks ranges in the text. `offsets[i]` is where text item i starts in the page text.
   * Returns the element of the selected range, if any.
   */
  highlight(ranges: HighlightRange[], offsets: number[] | undefined): HTMLElement | null {
    const layer = this.#layer;
    if (!layer) return null;
    const divs = layer.textDivs;
    const strings = layer.textContentItemsStr;
    for (const i of this.#highlighted) divs[i].textContent = strings[i];
    this.#highlighted.clear();
    if (!offsets || !ranges.length) return null;

    // Per text item, the (local) pieces to wrap.
    const pieces = new Map<number, { from: number; to: number; selected: boolean }[]>();
    for (const range of ranges) {
      for (let i = itemAt(offsets, range.start); i < strings.length && offsets[i] < range.end; i++) {
        const from = Math.max(range.start - offsets[i], 0);
        const to = Math.min(range.end - offsets[i], strings[i].length);
        if (to <= from) continue;
        if (!pieces.has(i)) pieces.set(i, []);
        pieces.get(i)!.push({ from, to, selected: range.selected });
      }
    }

    let selectedEl: HTMLElement | null = null;
    for (const [i, list] of pieces) {
      const text = strings[i];
      const div = divs[i];
      div.textContent = "";
      let pos = 0;
      for (const { from, to, selected } of list.sort((a, b) => a.from - b.from)) {
        if (from < pos) continue;
        if (from > pos) div.append(text.slice(pos, from));
        const mark = document.createElement("span");
        mark.className = selected ? "highlight selected" : "highlight";
        mark.textContent = text.slice(from, to);
        div.append(mark);
        if (selected) selectedEl ??= mark;
        pos = to;
      }
      if (pos < text.length) div.append(text.slice(pos));
      this.#highlighted.add(i);
    }
    return selectedEl;
  }

  destroy(): void {
    this.#layer?.cancel();
    this.#layer = null;
    this.div.remove();
  }
}

/** Index of the text item containing `offset` (binary search over item start offsets). */
function itemAt(offsets: number[], offset: number): number {
  let lo = 0;
  let hi = offsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
