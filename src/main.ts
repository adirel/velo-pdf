import "@fontsource-variable/inter";
import "@fontsource/orbitron/600.css";
import "@fontsource/orbitron/800.css";
import "./style.css";
import { openPdf } from "./pdf/openPdf";
import {
  clearRecent,
  fileFromRecent,
  listRecent,
  removeRecent,
  saveRecent,
  updatePage,
  type RecentFile,
} from "./recentFiles";
import { PdfViewer, type ViewerState } from "./viewer/PdfViewer";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const scroller = $<HTMLElement>("scroller");
const empty = $<HTMLElement>("empty");
const status = $<HTMLDivElement>("status");
const docChip = $<HTMLDivElement>("doc-chip");
const fileName = $<HTMLSpanElement>("file-name");
const fileInput = $<HTMLInputElement>("file-input");
const pageInput = $<HTMLInputElement>("page-input");
const pageCount = $<HTMLSpanElement>("page-count");
const zoomValue = $<HTMLSpanElement>("zoom-value");
const sidebar = $<HTMLElement>("sidebar");
const scrim = $<HTMLDivElement>("scrim");
const menuButton = $<HTMLButtonElement>("menu-btn");
const recentList = $<HTMLUListElement>("recent-list");
const heroRecent = $<HTMLUListElement>("hero-recent");

const viewer = new PdfViewer(scroller);
viewer.onStateChange = showState;

/** History id of the open document, used to remember the last page viewed. */
let currentId: string | null = null;
let savePageTimer = 0;

function showState({ page, pageCount: count, scale }: ViewerState): void {
  if (document.activeElement !== pageInput) pageInput.value = String(page);
  pageCount.textContent = `/ ${count}`;
  zoomValue.textContent = `${Math.round(scale * 100)}%`;
  if (currentId) {
    const id = currentId;
    clearTimeout(savePageTimer);
    savePageTimer = window.setTimeout(() => void updatePage(id, page), 500);
  }
}

let statusTimer = 0;
function showStatus(text: string | null, autoHideMs = 0): void {
  clearTimeout(statusTimer);
  status.hidden = text === null;
  status.textContent = text ?? "";
  if (text && autoHideMs) statusTimer = window.setTimeout(() => showStatus(null), autoHideMs);
}

let openToken = 0;

async function openFile(file: File, handle?: FileSystemFileHandle): Promise<void> {
  const token = ++openToken;
  closeMenu();
  showStatus(`Opening ${file.name}…`);
  try {
    const doc = await openPdf(file);
    if (token !== openToken) return void doc.loadingTask.destroy();
    currentId = null;
    await viewer.load(doc);
    empty.hidden = true;
    $("nav").hidden = $("zoom").hidden = docChip.hidden = false;
    fileName.textContent = file.name;
    docChip.title = file.name;
    document.title = `${file.name} · Velo PDF`;

    const entry = await saveRecent(file, handle);
    if (entry.page > 1) viewer.goToPage(entry.page);
    currentId = entry.id;
    showState(viewer.state);
    showStatus(null);
    scroller.focus();
    void renderRecent();
  } catch (err) {
    if (token !== openToken) return;
    console.error(err);
    showStatus(`Could not open ${file.name}: ${(err as Error).message}`, 5000);
  }
}

function goHome(): void {
  openToken++;
  currentId = null;
  viewer.close();
  empty.hidden = false;
  $("nav").hidden = $("zoom").hidden = docChip.hidden = true;
  document.title = "Velo PDF";
  closeMenu();
  void renderRecent();
}

async function pickFile(): Promise<void> {
  if (!window.showOpenFilePicker) return fileInput.click();
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: "PDF documents", accept: { "application/pdf": [".pdf"] } }],
    });
    await openFile(await handle.getFile(), handle);
  } catch (err) {
    if ((err as DOMException).name !== "AbortError") console.error(err);
  }
}

async function openRecent(entry: RecentFile): Promise<void> {
  try {
    await openFile(await fileFromRecent(entry), entry.handle);
  } catch (err) {
    if (!entry.handle) return void pickFile();
    const message = (err as DOMException).name === "NotFoundError" ? "File was moved or deleted." : (err as Error).message;
    showStatus(`${entry.name}: ${message}`, 5000);
  }
}

// ---- Recent files ----------------------------------------------------------------

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function formatAgo(time: number): string {
  const minutes = Math.round((Date.now() - time) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days} d ago` : new Date(time).toLocaleDateString();
}

function recentItem(entry: RecentFile): HTMLLIElement {
  const li = document.createElement("li");
  li.classList.toggle("active", entry.id === currentId);
  const open = document.createElement("button");
  open.className = "recent-item";
  open.title = entry.handle ? `Open ${entry.name}` : `${entry.name} (choose the file again to reopen)`;
  open.innerHTML = `<svg><use href="#i-file" /></svg><span class="r-text"><span class="r-name"></span><span class="r-meta"></span></span>`;
  open.querySelector(".r-name")!.textContent = entry.name;
  open.querySelector(".r-meta")!.textContent =
    `${formatSize(entry.size)} · p. ${entry.page} · ${formatAgo(entry.openedAt)}`;
  open.addEventListener("click", () => void openRecent(entry));

  const remove = document.createElement("button");
  remove.className = "r-remove icon-btn";
  remove.setAttribute("aria-label", `Remove ${entry.name} from history`);
  remove.innerHTML = `<svg><use href="#i-close" /></svg>`;
  remove.addEventListener("click", async () => {
    await removeRecent(entry.id);
    void renderRecent();
  });
  li.append(open, remove);
  return li;
}

async function renderRecent(): Promise<void> {
  const entries = await listRecent();
  recentList.replaceChildren(...entries.map(recentItem));
  heroRecent.replaceChildren(...entries.slice(0, 6).map(recentItem));
  $("recent-empty").hidden = entries.length > 0;
  $("clear-recent").hidden = entries.length === 0;
  $("hero-recent-wrap").hidden = entries.length === 0;
}

$("clear-recent").addEventListener("click", async () => {
  await clearRecent();
  void renderRecent();
});

// ---- Sidebar ---------------------------------------------------------------------

function openMenu(): void {
  sidebar.classList.add("open");
  sidebar.inert = false;
  scrim.hidden = false;
  menuButton.setAttribute("aria-expanded", "true");
  void renderRecent();
  $("menu-close").focus();
}

function closeMenu(): void {
  if (!sidebar.classList.contains("open")) return;
  sidebar.classList.remove("open");
  sidebar.inert = true;
  scrim.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
}

menuButton.addEventListener("click", () => (sidebar.classList.contains("open") ? closeMenu() : openMenu()));
$("menu-close").addEventListener("click", closeMenu);
scrim.addEventListener("click", closeMenu);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});

// ---- Opening files ---------------------------------------------------------------

// Files opened from Windows Explorer ("Open with" / double-click) once installed.
window.launchQueue?.setConsumer(async ({ files }) => {
  const handle = files.find((f): f is FileSystemFileHandle => f.kind === "file");
  if (handle) await openFile(await handle.getFile(), handle);
});

$("open").addEventListener("click", () => void pickFile());
$("sidebar-open").addEventListener("click", () => void pickFile());
$("brand").addEventListener("click", goHome);
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) void openFile(file);
  fileInput.value = "";
});

// Drag and drop anywhere in the window.
let dragDepth = 0;
window.addEventListener("dragenter", (e) => {
  e.preventDefault();
  if (++dragDepth === 1) document.body.classList.add("dragging");
});
window.addEventListener("dragleave", () => {
  if (--dragDepth === 0) document.body.classList.remove("dragging");
});
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => {
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove("dragging");
  const isPdf = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
  const item = [...(e.dataTransfer?.items ?? [])].find((i) => i.kind === "file" && isPdf(i.getAsFile()!));
  const file = item?.getAsFile();
  if (!item || !file) return;
  // The handle must be requested synchronously, while the drop data is still accessible.
  const handlePromise = item.getAsFileSystemHandle?.() ?? Promise.resolve(null);
  void handlePromise
    .catch(() => null)
    .then((handle) => openFile(file, handle?.kind === "file" ? (handle as FileSystemFileHandle) : undefined));
});

// ---- Navigation and zoom ---------------------------------------------------------

pageInput.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  viewer.goToPage(Number.parseInt(pageInput.value, 10) || 1);
  scroller.focus();
});
pageInput.addEventListener("focus", () => pageInput.select());
pageInput.addEventListener("blur", () => showState(viewer.state));

$("zoom-in").addEventListener("click", () => viewer.zoomBy(1.25));
$("zoom-out").addEventListener("click", () => viewer.zoomBy(0.8));
$("fit-width").addEventListener("click", () => viewer.fitWidth());
$("fit-page").addEventListener("click", () => viewer.fitPage());

const hasDocument = () => empty.hidden;

// The mouse wheel (and touchpad pinch, which arrives as ctrl+wheel) zooms around the cursor.
// Scrolling is done by dragging, the scrollbars or the keyboard.
scroller.addEventListener(
  "wheel",
  (e) => {
    if (!hasDocument()) return;
    e.preventDefault();
    if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) return viewer.zoomBy(e.deltaY < 0 ? 1.25 : 0.8, e.clientX, e.clientY);
    const delta = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? e.deltaY * 33 : e.deltaY;
    viewer.zoomBy(Math.exp(-delta * 0.002), e.clientX, e.clientY);
  },
  { passive: false },
);

// Left-button drag pans the document, with a short glide after release.
const GLIDE_FRICTION = 0.92;
let drag: { x: number; y: number; time: number; vx: number; vy: number } | null = null;
let glideFrame = 0;

scroller.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || e.pointerType === "touch" || !hasDocument()) return;
  // Leave clicks on the scrollbars alone.
  const rect = scroller.getBoundingClientRect();
  if (e.clientX - rect.left >= scroller.clientWidth || e.clientY - rect.top >= scroller.clientHeight) return;
  e.preventDefault();
  cancelAnimationFrame(glideFrame);
  scroller.setPointerCapture(e.pointerId);
  scroller.classList.add("panning");
  scroller.focus();
  drag = { x: e.clientX, y: e.clientY, time: e.timeStamp, vx: 0, vy: 0 };
});

scroller.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  const dt = Math.max(1, e.timeStamp - drag.time);
  scroller.scrollLeft -= dx;
  scroller.scrollTop -= dy;
  // Smoothed velocity (px/ms) for the glide.
  drag.vx = 0.8 * (dx / dt) + 0.2 * drag.vx;
  drag.vy = 0.8 * (dy / dt) + 0.2 * drag.vy;
  drag.x = e.clientX;
  drag.y = e.clientY;
  drag.time = e.timeStamp;
});

const endDrag = (e: PointerEvent) => {
  if (!drag) return;
  scroller.classList.remove("panning");
  // No glide if the pointer stopped before release.
  let vx = e.timeStamp - drag.time < 80 ? drag.vx * 16 : 0;
  let vy = e.timeStamp - drag.time < 80 ? drag.vy * 16 : 0;
  drag = null;
  const glide = () => {
    if (Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5) return;
    scroller.scrollLeft -= vx;
    scroller.scrollTop -= vy;
    vx *= GLIDE_FRICTION;
    vy *= GLIDE_FRICTION;
    glideFrame = requestAnimationFrame(glide);
  };
  glideFrame = requestAnimationFrame(glide);
};
scroller.addEventListener("pointerup", endDrag);
scroller.addEventListener("pointercancel", endDrag);

window.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const actions: Record<string, () => void> = {
    o: () => void pickFile(),
    "=": () => viewer.zoomBy(1.25),
    "+": () => viewer.zoomBy(1.25),
    "-": () => viewer.zoomBy(0.8),
    "0": () => viewer.fitPage(),
  };
  const action = actions[e.key.toLowerCase()];
  if (action) {
    e.preventDefault();
    action();
  }
});

// ---- Install ---------------------------------------------------------------------

// Install buttons show only when the browser offers installation (not yet installed).
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
const installButtons = [$<HTMLButtonElement>("install"), $<HTMLButtonElement>("sidebar-install")];
let installPrompt: BeforeInstallPromptEvent | null = null;
const setInstallable = (prompt: BeforeInstallPromptEvent | null) => {
  installPrompt = prompt;
  for (const button of installButtons) button.hidden = !prompt;
};
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  setInstallable(e as BeforeInstallPromptEvent);
});
for (const button of installButtons) {
  button.addEventListener("click", async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallable(null);
  });
}
window.addEventListener("appinstalled", () => {
  setInstallable(null);
  showStatus("Velo PDF installed. PDFs can now be opened with it from Windows.", 5000);
});

void renderRecent();
// Keep "x min ago" labels fresh.
setInterval(() => void renderRecent(), 60_000);
