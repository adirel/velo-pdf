import type { PDFDocumentProxy } from "pdfjs-dist";

export interface SearchMatch {
  /** Zero-based page index. */
  page: number;
  start: number;
  end: number;
}

interface PageText {
  /** Lower-cased page text: items joined, with a space at line ends. */
  text: string;
  /** Start offset of each text item in `text` (aligned with the text layer's divs). */
  offsets: number[];
}

/**
 * Full-text search over every page. Page text is extracted on demand and cached, and
 * matches stream in page by page so the first hit shows up long before the end of a
 * 10,000-page document.
 */
export class PdfSearch {
  #texts = new Map<number, PageText>();
  #run = 0;

  constructor(private readonly doc: PDFDocumentProxy) {}

  offsets(page: number): number[] | undefined {
    return this.#texts.get(page)?.offsets;
  }

  cancel(): void {
    this.#run++;
  }

  /**
   * Searches all pages starting at `fromPage` (wrapping around). `onProgress` gets the
   * matches found so far, in document order, and the number of pages searched.
   * Resolves false if a newer search or cancel() superseded this one.
   */
  async find(
    query: string,
    fromPage: number,
    onProgress: (matches: SearchMatch[], searched: number) => void,
  ): Promise<boolean> {
    const run = ++this.#run;
    const needle = query.toLowerCase();
    const count = this.doc.numPages;
    const byPage: (SearchMatch[] | undefined)[] = new Array(count);
    let lastReport = 0;

    for (let k = 0; k < count; k++) {
      const page = (fromPage + k) % count;
      const { text } = await this.#pageText(page);
      if (run !== this.#run) return false;
      const found: SearchMatch[] = [];
      for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + needle.length)) {
        found.push({ page, start: i, end: i + needle.length });
      }
      byPage[page] = found;
      // Report on the first hit, then at most every 100ms.
      const now = performance.now();
      if ((found.length && lastReport === 0) || now - lastReport > 100 || k === count - 1) {
        lastReport = now;
        onProgress(byPage.flatMap((m) => m ?? []), k + 1);
      }
    }
    return true;
  }

  async #pageText(page: number): Promise<PageText> {
    const cached = this.#texts.get(page);
    if (cached) return cached;
    const content = await (await this.doc.getPage(page + 1)).getTextContent();
    let text = "";
    const offsets: number[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      offsets.push(text.length);
      text += item.str;
      if (item.hasEOL) text += " ";
    }
    const entry = { text: text.toLowerCase(), offsets };
    this.#texts.set(page, entry);
    return entry;
  }
}
