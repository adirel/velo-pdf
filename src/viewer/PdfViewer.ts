import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { CanvasCache } from "./CanvasCache";
import { PAGE_GAP, PageLayout } from "./PageLayout";
import { RenderQueue, type Clip, type RenderRequest } from "./RenderQueue";

const CACHE_BUDGET_BYTES = 384 * 1024 * 1024;
// Browsers get slow (or refuse) above ~16M pixels per canvas.
const MAX_CANVAS_PIXELS = 4096 * 4096;
const PREVIEW_FACTOR = 0.25;
const RENDER_CONCURRENCY = 2;
const PREFETCH_PAGES = 2;
// Above this speed (px/ms) we only render cheap previews until the user slows down.
const FAST_SCROLL_SPEED = 3;
const SETTLE_MS = 140;
const SIZE_BATCH = 50;
// Detail renders cover the viewport plus this fraction on each side.
const DETAIL_MARGIN = 0.15;

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 8;

/** A sharp render of just the visible part of a page, used when the whole page would exceed MAX_CANVAS_PIXELS. */
interface Detail {
  canvas: HTMLCanvasElement;
  scale: number;
  clip: Clip;
}

interface Slot {
  el: HTMLDivElement;
  canvas: HTMLCanvasElement | null;
  detail: Detail | null;
}

interface Anchor {
  page: number;
  fx: number;
  fy: number;
  x: number;
  y: number;
}

export interface ViewerState {
  page: number;
  pageCount: number;
  scale: number;
}

/**
 * Virtualized continuous-scroll PDF view. Only pages near the viewport have DOM
 * nodes; scrolling and zooming are pure layout/CSS (instant), while sharp renders
 * arrive asynchronously in priority order.
 */
export class PdfViewer {
  readonly #scroller: HTMLElement;
  readonly #content: HTMLDivElement;
  #doc: PDFDocumentProxy | null = null;
  #layout: PageLayout | null = null;
  #queue: RenderQueue | null = null;
  #cache: CanvasCache;
  #slots = new Map<number, Slot>();
  #scale = 1;
  #frame = 0;
  #lastScroll = { top: 0, time: 0 };
  #direction = 1;
  #interacting = false;
  #settleTimer = 0;
  #currentPage = 0;
  #sizesFixed = false;
  #generation = 0;

  onStateChange: (state: ViewerState) => void = () => {};

  constructor(scroller: HTMLElement) {
    this.#scroller = scroller;
    this.#content = document.createElement("div");
    this.#content.className = "pdf-content";
    scroller.append(this.#content);
    this.#cache = new CanvasCache(
      CACHE_BUDGET_BYTES,
      (page) => this.#slots.has(page),
      (page) => void this.#doc?.getPage(page + 1).then((p) => p.cleanup()),
    );
    scroller.addEventListener("scroll", () => this.#onScroll(), { passive: true });
    new ResizeObserver(() => this.#relayout()).observe(scroller);
  }

  get state(): ViewerState {
    return {
      page: this.#currentPage + 1,
      pageCount: this.#layout?.count ?? 0,
      scale: this.#scale,
    };
  }

  async load(doc: PDFDocumentProxy): Promise<void> {
    this.close();
    const generation = this.#generation;
    const first = (await doc.getPage(1)).getViewport({ scale: 1 });
    if (generation !== this.#generation) return;

    this.#doc = doc;
    this.#layout = new PageLayout(doc.numPages, first.width, first.height);
    this.#queue = new RenderQueue(
      doc,
      RENDER_CONCURRENCY,
      (page) => this.#learnSize(page),
      (request, canvas) => this.#onRendered(request, canvas),
    );
    this.#scale = this.#fitWidthScale(0, 1.5);
    this.#layout.compute(this.#scale, this.#scroller.clientWidth);
    this.#applyContentSize();
    this.#scroller.scrollTo(0, 0);
    this.#scheduleUpdate();
    void this.#loadAllSizes(generation);
  }

  close(): void {
    this.#generation++;
    this.#queue?.cancelAll();
    this.#queue = null;
    this.#cache.clear();
    for (const [page, slot] of this.#slots) this.#removeSlot(page, slot);
    void this.#doc?.loadingTask.destroy();
    this.#doc = null;
    this.#layout = null;
    this.#sizesFixed = false;
    this.#currentPage = 0;
    this.#content.style.width = this.#content.style.height = "0";
  }

  goToPage(pageNumber: number): void {
    const layout = this.#layout;
    if (!layout) return;
    const index = Math.min(Math.max(pageNumber - 1, 0), layout.count - 1);
    this.#scroller.scrollTop = layout.top(index) - PAGE_GAP;
  }

  /** Zooms keeping the document point under (clientX, clientY) fixed; defaults to the viewport center. */
  setScale(scale: number, clientX?: number, clientY?: number): void {
    const layout = this.#layout;
    if (!layout) return;
    scale = Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE);
    if (scale === this.#scale) return;
    const rect = this.#scroller.getBoundingClientRect();
    const x = clientX === undefined ? this.#scroller.clientWidth / 2 : clientX - rect.left;
    const y = clientY === undefined ? this.#scroller.clientHeight / 2 : clientY - rect.top;
    const anchor = this.#anchorAt(x, y);
    this.#scale = scale;
    this.#markInteracting();
    this.#relayout(anchor);
    this.onStateChange(this.state);
  }

  zoomBy(factor: number, clientX?: number, clientY?: number): void {
    this.setScale(this.#scale * factor, clientX, clientY);
  }

  fitWidth(): void {
    if (this.#layout) this.setScale(this.#fitWidthScale(this.#currentPage, MAX_SCALE));
  }

  fitPage(): void {
    const layout = this.#layout;
    if (!layout) return;
    const i = this.#currentPage;
    const byHeight = (this.#scroller.clientHeight - 2 * PAGE_GAP) / layout.baseHeight(i);
    this.setScale(Math.min(this.#fitWidthScale(i, MAX_SCALE), byHeight));
    this.goToPage(i + 1);
  }

  #fitWidthScale(index: number, max: number): number {
    const available = this.#scroller.clientWidth - 2 * PAGE_GAP;
    return Math.min(max, available / this.#layout!.baseWidth(index));
  }

  #anchorAt(x: number, y: number): Anchor {
    const layout = this.#layout!;
    const docY = this.#scroller.scrollTop + y;
    const docX = this.#scroller.scrollLeft + x;
    const page = layout.indexAt(docY);
    return {
      page,
      fx: (docX - layout.left(page)) / layout.width(page),
      fy: (docY - layout.top(page)) / layout.height(page),
      x,
      y,
    };
  }

  #relayout(anchor?: Anchor): void {
    const layout = this.#layout;
    if (!layout) return;
    anchor ??= this.#anchorAt(0, 0);
    layout.compute(this.#scale, this.#scroller.clientWidth);
    this.#applyContentSize();
    const p = anchor.page;
    this.#scroller.scrollTop = layout.top(p) + anchor.fy * layout.height(p) - anchor.y;
    this.#scroller.scrollLeft = layout.left(p) + anchor.fx * layout.width(p) - anchor.x;
    this.#positionSlots();
    this.#scheduleUpdate();
  }

  #applyContentSize(): void {
    const layout = this.#layout!;
    this.#content.style.width = `${layout.contentWidth}px`;
    this.#content.style.height = `${layout.contentHeight}px`;
  }

  #onScroll(): void {
    const now = performance.now();
    const top = this.#scroller.scrollTop;
    const dt = now - this.#lastScroll.time;
    const dy = top - this.#lastScroll.top;
    if (dy) this.#direction = Math.sign(dy);
    if (dt > 0 && dt < 100 && Math.abs(dy) / dt > FAST_SCROLL_SPEED) this.#markInteracting();
    this.#lastScroll = { top, time: now };
    this.#scheduleUpdate();
  }

  /** Defers full-resolution renders until scrolling/zooming settles. */
  #markInteracting(): void {
    this.#interacting = true;
    clearTimeout(this.#settleTimer);
    this.#settleTimer = window.setTimeout(() => {
      this.#interacting = false;
      this.#scheduleUpdate();
    }, SETTLE_MS);
  }

  #scheduleUpdate(): void {
    if (this.#frame) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0;
      this.#update();
    });
  }

  #update(): void {
    const layout = this.#layout;
    if (!layout || !this.#queue) return;
    const top = this.#scroller.scrollTop;
    const bottom = top + this.#scroller.clientHeight;
    const first = layout.indexAt(top);
    const last = layout.indexAt(bottom);

    // DOM only for visible pages plus one on each side.
    const keepFrom = Math.max(0, first - 1);
    const keepTo = Math.min(layout.count - 1, last + 1);
    for (const [page, slot] of this.#slots) {
      if (page < keepFrom || page > keepTo) this.#removeSlot(page, slot);
    }
    for (let page = keepFrom; page <= keepTo; page++) {
      if (!this.#slots.has(page)) this.#createSlot(page);
      this.#cache.touch(page);
    }

    const center = (top + bottom) / 2;
    const current = layout.indexAt(center);
    if (current !== this.#currentPage) {
      this.#currentPage = current;
      this.onStateChange(this.state);
    }

    const wanted = this.#wantedRenders(first, last, center);
    for (let page = first; page <= last; page++) {
      const detail = this.#detailRequest(page);
      if (detail) wanted.push(detail);
    }
    this.#queue.setWanted(wanted);
  }

  /** Requests a sharp render of the visible region when the whole-page render is resolution-capped. */
  #detailRequest(page: number): RenderRequest | null {
    const slot = this.#slots.get(page)!;
    const full = this.#scale * devicePixelRatio;
    if (this.#targetScale(page) >= full * 0.999) {
      this.#setDetail(slot, null);
      return null;
    }
    if (this.#interacting) return null;

    const layout = this.#layout!;
    const sc = this.#scroller;
    const marginX = sc.clientWidth * DETAIL_MARGIN;
    const marginY = sc.clientHeight * DETAIL_MARGIN;
    const left = layout.left(page);
    const top = layout.top(page);
    const visible = (x0: number, y0: number, x1: number, y1: number) => ({
      x0: Math.max(0, x0 - left),
      y0: Math.max(0, y0 - top),
      x1: Math.min(layout.width(page), x1 - left),
      y1: Math.min(layout.height(page), y1 - top),
    });
    const view = visible(sc.scrollLeft, sc.scrollTop, sc.scrollLeft + sc.clientWidth, sc.scrollTop + sc.clientHeight);
    if (view.x1 <= view.x0 || view.y1 <= view.y0) return null;

    // The current detail still covers what's on screen at this zoom: keep it.
    const ratio = full / this.#scale;
    const current = slot.detail;
    if (
      current &&
      Math.abs(current.scale - full) / full < 0.001 &&
      current.clip.x <= view.x0 * ratio &&
      current.clip.y <= view.y0 * ratio &&
      current.clip.x + current.clip.width >= view.x1 * ratio - 1 &&
      current.clip.y + current.clip.height >= view.y1 * ratio - 1
    ) {
      return null;
    }

    const area = visible(
      sc.scrollLeft - marginX,
      sc.scrollTop - marginY,
      sc.scrollLeft + sc.clientWidth + marginX,
      sc.scrollTop + sc.clientHeight + marginY,
    );
    const x = Math.floor(area.x0 * ratio);
    const y = Math.floor(area.y0 * ratio);
    return {
      page,
      scale: full,
      clip: { x, y, width: Math.ceil(area.x1 * ratio) - x, height: Math.ceil(area.y1 * ratio) - y },
    };
  }

  #setDetail(slot: Slot, detail: Detail | null): void {
    if (slot.detail === detail) return;
    if (slot.detail) {
      slot.detail.canvas.remove();
      slot.detail.canvas.width = slot.detail.canvas.height = 0;
    }
    slot.detail = detail;
    if (detail) slot.el.append(detail.canvas);
  }

  #showDetail(page: number, slot: Slot, detail: Detail): void {
    const layout = this.#layout!;
    const pageWidth = layout.baseWidth(page) * detail.scale;
    const pageHeight = layout.baseHeight(page) * detail.scale;
    const { x, y, width, height } = detail.clip;
    // Positioned in page percentages, so it stays aligned while a zoom stretches it.
    const style = detail.canvas.style;
    detail.canvas.className = "detail";
    style.left = `${(x / pageWidth) * 100}%`;
    style.top = `${(y / pageHeight) * 100}%`;
    style.width = `${(width / pageWidth) * 100}%`;
    style.height = `${(height / pageHeight) * 100}%`;
    this.#setDetail(slot, detail);
  }

  #wantedRenders(first: number, last: number, center: number): RenderRequest[] {
    const layout = this.#layout!;
    const visible: number[] = [];
    for (let i = first; i <= last; i++) visible.push(i);
    visible.sort(
      (a, b) =>
        Math.abs(layout.top(a) + layout.height(a) / 2 - center) -
        Math.abs(layout.top(b) + layout.height(b) / 2 - center),
    );
    const prefetch: number[] = [];
    for (let k = 1; k <= PREFETCH_PAGES; k++) {
      const i = this.#direction > 0 ? last + k : first - k;
      if (i >= 0 && i < layout.count) prefetch.push(i);
    }

    const previews: RenderRequest[] = [];
    const sharp: RenderRequest[] = [];
    for (const page of [...visible, ...prefetch]) {
      const target = this.#targetScale(page);
      const cached = this.#cache.get(page);
      if (!cached) {
        // Something on screen immediately, even mid-fling; sharp version follows.
        previews.push({ page, scale: target * PREVIEW_FACTOR });
      } else if (!this.#interacting && Math.abs(cached.scale - target) / target > 0.02) {
        sharp.push({ page, scale: target });
      }
    }
    return [...previews, ...sharp];
  }

  #targetScale(page: number): number {
    const layout = this.#layout!;
    const scale = this.#scale * devicePixelRatio;
    const pixelsAtScale1 = layout.baseWidth(page) * layout.baseHeight(page);
    return Math.min(scale, Math.sqrt(MAX_CANVAS_PIXELS / pixelsAtScale1));
  }

  #createSlot(page: number): void {
    const el = document.createElement("div");
    el.className = "pdf-page";
    el.dataset.page = String(page + 1);
    const slot: Slot = { el, canvas: null, detail: null };
    this.#slots.set(page, slot);
    this.#positionSlot(page, slot);
    this.#showCached(page, slot);
    this.#content.append(el);
  }

  #removeSlot(page: number, slot: Slot): void {
    this.#setDetail(slot, null);
    slot.el.remove();
    this.#slots.delete(page);
  }

  #positionSlots(): void {
    for (const [page, slot] of this.#slots) this.#positionSlot(page, slot);
  }

  #positionSlot(page: number, slot: Slot): void {
    const layout = this.#layout!;
    const style = slot.el.style;
    style.transform = `translate(${layout.left(page)}px, ${layout.top(page)}px)`;
    style.width = `${layout.width(page)}px`;
    style.height = `${layout.height(page)}px`;
  }

  #showCached(page: number, slot: Slot): void {
    const cached = this.#cache.get(page);
    if (!cached || slot.canvas === cached.canvas) return;
    slot.canvas?.remove();
    slot.canvas = cached.canvas;
    slot.el.append(cached.canvas);
  }

  #onRendered(request: RenderRequest, canvas: HTMLCanvasElement): void {
    if (request.clip) {
      const slot = this.#slots.get(request.page);
      if (slot) this.#showDetail(request.page, slot, { canvas, scale: request.scale, clip: request.clip });
      else canvas.width = canvas.height = 0;
      return;
    }
    const cached = this.#cache.get(request.page);
    // A late preview must not replace a sharper render.
    if (cached && cached.scale > request.scale && cached.scale <= this.#targetScale(request.page) * 1.02) {
      canvas.width = canvas.height = 0;
      return;
    }
    this.#cache.set(request.page, { canvas, scale: request.scale });
    const slot = this.#slots.get(request.page);
    if (slot) this.#showCached(request.page, slot);
    this.#scheduleUpdate();
  }

  #learnSize(page: PDFPageProxy): void {
    if (this.#sizesFixed) return;
    const { width, height } = page.getViewport({ scale: 1 });
    if (this.#layout?.setBaseSize(page.pageNumber - 1, width, height)) {
      this.#relayout();
    }
  }

  /** Reads every page's real size in idle time, then fixes the layout in one pass. */
  async #loadAllSizes(generation: number): Promise<void> {
    const doc = this.#doc!;
    const layout = this.#layout!;
    let changed = false;
    for (let start = 0; start < layout.count; start += SIZE_BATCH) {
      await new Promise((resolve) => requestIdleCallback(resolve, { timeout: 500 }));
      if (generation !== this.#generation) return;
      const end = Math.min(start + SIZE_BATCH, layout.count);
      const pages = await Promise.all(
        Array.from({ length: end - start }, (_, k) => doc.getPage(start + k + 1)),
      );
      if (generation !== this.#generation) return;
      for (const page of pages) {
        const { width, height } = page.getViewport({ scale: 1 });
        changed = layout.setBaseSize(page.pageNumber - 1, width, height) || changed;
      }
      // Relayout in batches so a mixed-size document converges quickly without thrashing.
      if (changed) {
        this.#relayout();
        changed = false;
      }
    }
    this.#sizesFixed = true;
  }
}
