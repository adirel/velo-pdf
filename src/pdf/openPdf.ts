import {
  getDocument,
  GlobalWorkerOptions,
  PasswordResponses,
  PDFDataRangeTransport,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerUrl;

// Files up to this size are read into memory in one go (fastest for small docs).
// Larger files are read lazily, one byte range at a time, straight from disk.
const IN_MEMORY_LIMIT = 16 * 1024 * 1024;
const RANGE_CHUNK = 256 * 1024;
const ASSETS = `${import.meta.env.BASE_URL}pdfjs/`;

/** Feeds pdf.js byte ranges sliced from a local File, so a 2GB PDF never sits in RAM. */
class BlobRangeTransport extends PDFDataRangeTransport {
  #blob: Blob;
  #aborted = false;

  constructor(blob: Blob, initialData: Uint8Array) {
    super(blob.size, initialData);
    this.#blob = blob;
  }

  override requestDataRange(begin: number, end: number): void {
    this.#blob
      .slice(begin, end)
      .arrayBuffer()
      .then(
        (buf) => {
          if (!this.#aborted) this.onDataRange(begin, new Uint8Array(buf));
        },
        (err) => console.error(`Failed reading bytes ${begin}-${end}`, err),
      );
  }

  override abort(): void {
    this.#aborted = true;
  }
}

export async function openPdf(file: File): Promise<PDFDocumentProxy> {
  const common = {
    cMapUrl: `${ASSETS}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${ASSETS}standard_fonts/`,
    wasmUrl: `${ASSETS}wasm/`,
    iccUrl: `${ASSETS}iccs/`,
    enableHWA: true,
    isEvalSupported: false,
  };

  const task =
    file.size <= IN_MEMORY_LIMIT
      ? getDocument({ ...common, data: new Uint8Array(await file.arrayBuffer()) })
      : getDocument({
          ...common,
          range: new BlobRangeTransport(
            file,
            new Uint8Array(await file.slice(0, RANGE_CHUNK).arrayBuffer()),
          ),
          rangeChunkSize: RANGE_CHUNK,
          disableAutoFetch: true,
          disableStream: true,
        });

  task.onPassword = (update: (password: string) => void, reason: number) => {
    const message =
      reason === PasswordResponses.INCORRECT_PASSWORD
        ? "Incorrect password. Try again:"
        : `"${file.name}" is password protected. Password:`;
    const password = prompt(message);
    if (password === null) void task.destroy();
    else update(password);
  };

  return task.promise;
}
