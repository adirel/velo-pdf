import {
  RenderingCancelledException,
  type PDFDocumentProxy,
  type PDFPageProxy,
  type RenderTask,
} from "pdfjs-dist";

/** A region of the page, in device pixels at the request's scale. */
export interface Clip {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderRequest {
  page: number;
  /** Device pixels per PDF unit. */
  scale: number;
  /** Render only this region (a high-zoom "detail" render). */
  clip?: Clip;
}

// A page's whole-page render and its detail render are independent jobs.
const keyOf = (r: RenderRequest) => (r.clip ? `${r.page}:detail` : `${r.page}`);

const sameClip = (a?: Clip, b?: Clip) =>
  a === b ||
  (!!a && !!b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height);

interface Running {
  request: RenderRequest;
  task: RenderTask | null;
  cancelled: boolean;
}

// pdf.js renders in ~15ms slices; by default it chains them as microtasks, which
// never yields to input. Hopping through a macrotask between slices keeps scrolling
// and clicks responsive while a heavy page renders.
const channel = new MessageChannel();
const continuations: (() => void)[] = [];
channel.port1.onmessage = () => continuations.shift()?.();
const yieldToEventLoop = (cont: () => void) => {
  continuations.push(cont);
  channel.port2.postMessage(null);
};

/**
 * Renders pages in priority order with limited concurrency. Every call to
 * setWanted() replaces the queue and cancels in-flight renders that are no longer
 * wanted, so fast scrolling never leaves a backlog of off-screen work.
 */
export class RenderQueue {
  #pending: RenderRequest[] = [];
  #running = new Map<string, Running>();

  constructor(
    private readonly doc: PDFDocumentProxy,
    private readonly concurrency: number,
    private readonly onPage: (page: PDFPageProxy) => void,
    private readonly onRendered: (request: RenderRequest, canvas: HTMLCanvasElement) => void,
  ) {}

  /** Requests in priority order (most important first). */
  setWanted(requests: RenderRequest[]): void {
    const wanted = new Map(requests.map((r) => [keyOf(r), r]));
    for (const [key, running] of this.#running) {
      const next = wanted.get(key);
      // A smaller (preview) render may finish; anything else stale gets cancelled.
      if (!next || next.scale < running.request.scale || !sameClip(next.clip, running.request.clip)) {
        this.#cancel(running);
      }
    }
    this.#pending = requests.filter((r) => !this.#running.has(keyOf(r)));
    this.#pump();
  }

  cancelAll(): void {
    this.#pending = [];
    for (const running of this.#running.values()) this.#cancel(running);
  }

  #cancel(running: Running): void {
    running.cancelled = true;
    running.task?.cancel();
    this.#running.delete(keyOf(running.request));
  }

  #pump(): void {
    while (this.#running.size < this.concurrency && this.#pending.length) {
      const request = this.#pending.shift()!;
      if (!this.#running.has(keyOf(request))) void this.#render(request);
    }
  }

  async #render(request: RenderRequest): Promise<void> {
    const key = keyOf(request);
    const running: Running = { request, task: null, cancelled: false };
    this.#running.set(key, running);
    const canvas = document.createElement("canvas");
    try {
      const page = await this.doc.getPage(request.page + 1);
      this.onPage(page);
      if (running.cancelled) return;

      const { clip } = request;
      const viewport = page.getViewport({
        scale: request.scale,
        offsetX: clip ? -clip.x : 0,
        offsetY: clip ? -clip.y : 0,
      });
      canvas.width = Math.max(1, clip ? clip.width : Math.floor(viewport.width));
      canvas.height = Math.max(1, clip ? clip.height : Math.floor(viewport.height));
      running.task = page.render({ canvas, viewport });
      running.task.onContinue = yieldToEventLoop;
      await running.task.promise;
      if (!running.cancelled) this.onRendered(request, canvas);
    } catch (err) {
      if (!(err instanceof RenderingCancelledException) && !running.cancelled) {
        console.error(`Failed to render page ${request.page + 1}`, err);
      }
    } finally {
      if (running.cancelled) canvas.width = canvas.height = 0;
      if (this.#running.get(key) === running) this.#running.delete(key);
      this.#pump();
    }
  }
}
