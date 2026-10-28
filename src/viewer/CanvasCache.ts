export interface CachedRender {
  canvas: HTMLCanvasElement;
  /** Device pixels per PDF unit this canvas was rendered at. */
  scale: number;
}

/**
 * LRU of rendered page canvases with a memory budget in bytes (not a page count),
 * so memory stays flat no matter how big the document is. The canvases themselves
 * are cached and moved into the DOM, so showing a cached page costs no pixel copy.
 */
export class CanvasCache {
  #entries = new Map<number, CachedRender>();
  #bytes = 0;

  constructor(
    private readonly budgetBytes: number,
    private readonly isPinned: (page: number) => boolean,
    private readonly onEvict: (page: number) => void,
  ) {}

  get(page: number): CachedRender | undefined {
    return this.#entries.get(page);
  }

  /** Marks a page as recently used. */
  touch(page: number): void {
    const entry = this.#entries.get(page);
    if (!entry) return;
    this.#entries.delete(page);
    this.#entries.set(page, entry);
  }

  set(page: number, entry: CachedRender): void {
    this.#drop(page);
    this.#entries.set(page, entry);
    this.#bytes += sizeOf(entry);
    this.#evict();
  }

  clear(): void {
    for (const page of [...this.#entries.keys()]) this.#drop(page);
  }

  #evict(): void {
    for (const page of this.#entries.keys()) {
      if (this.#bytes <= this.budgetBytes) return;
      if (this.isPinned(page)) continue;
      this.#drop(page);
      this.onEvict(page);
    }
  }

  #drop(page: number): void {
    const entry = this.#entries.get(page);
    if (!entry) return;
    this.#entries.delete(page);
    this.#bytes -= sizeOf(entry);
    entry.canvas.remove();
    // Zeroing the size releases the backing store immediately instead of at GC.
    entry.canvas.width = entry.canvas.height = 0;
  }
}

const sizeOf = (entry: CachedRender) => entry.canvas.width * entry.canvas.height * 4;
