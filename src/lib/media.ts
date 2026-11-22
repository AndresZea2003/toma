// Almacén de imágenes y clips importados (IndexedDB: aguanta archivos grandes).
import type { MediaRef } from "../types";
import { uid } from "./util";

const DB = "toma-media";
const STORE = "files";

let dbPromise: Promise<IDBDatabase> | null = null;
function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const r = fn(d.transaction(STORE, mode).objectStore(STORE));
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      }),
  );
}

export const MAX_MEDIA_BYTES = 300 * 1024 * 1024;

export async function saveMedia(file: File): Promise<MediaRef> {
  const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : null;
  if (!kind) throw new Error("Solo se aceptan imágenes, videos o audios.");
  if (file.size > MAX_MEDIA_BYTES) throw new Error("El archivo es demasiado grande (máx. 300 MB).");
  const id = uid();
  await tx("readwrite", (s) => s.put(file, id));
  return { id, kind, name: file.name };
}

export async function getMediaBlob(id: string): Promise<Blob | undefined> {
  return tx<Blob | undefined>("readonly", (s) => s.get(id));
}

export async function deleteMedia(id: string) {
  await tx("readwrite", (s) => s.delete(id));
  const el = elements.get(id);
  if (el) {
    URL.revokeObjectURL(el.src);
    elements.delete(id);
  }
}

// ---------- Elementos listos para dibujar ----------

const elements = new Map<string, HTMLImageElement | HTMLVideoElement>();

// Avisa cuando un clip termina de colocarse en un fotograma (para redibujar en pausa)
const frameListeners = new Set<() => void>();
export function onMediaFrame(fn: () => void) {
  frameListeners.add(fn);
  return () => void frameListeners.delete(fn);
}
const notify = () => frameListeners.forEach((f) => f());
const loading = new Map<string, Promise<HTMLImageElement | HTMLVideoElement | null>>();

export function mediaElement(id: string) {
  return elements.get(id);
}

export function loadMedia(ref: MediaRef): Promise<HTMLImageElement | HTMLVideoElement | null> {
  const ready = elements.get(ref.id);
  if (ready) return Promise.resolve(ready);
  let p = loading.get(ref.id);
  if (!p) {
    p = getMediaBlob(ref.id).then(
      (blob) =>
        new Promise((resolve) => {
          if (!blob) return resolve(null);
          const url = URL.createObjectURL(blob);
          if (ref.kind === "video") {
            const v = document.createElement("video");
            v.muted = true;
            v.loop = true;
            v.playsInline = true;
            v.preload = "auto";
            v.onloadeddata = () => {
              elements.set(ref.id, v);
              resolve(v);
              notify();
            };
            v.addEventListener("seeked", notify);
            v.onerror = () => resolve(null);
            v.src = url;
          } else {
            const img = new Image();
            img.onload = () => {
              elements.set(ref.id, img);
              resolve(img);
              notify();
            };
            img.onerror = () => resolve(null);
            img.src = url;
          }
        }),
    );
    loading.set(ref.id, p);
  }
  return p;
}

// ---------- Audio decodificado para la mezcla ----------

const buffers = new Map<string, Promise<AudioBuffer | null>>();
let decoder: OfflineAudioContext | null = null;

/** Decodifica el audio de un archivo (audio o el sonido de un video) una sola vez */
export function audioBuffer(id: string): Promise<AudioBuffer | null> {
  let p = buffers.get(id);
  if (!p) {
    decoder ??= new OfflineAudioContext(2, 44100, 44100);
    p = getMediaBlob(id)
      .then((b) => (b ? b.arrayBuffer() : null))
      .then((ab) => (ab ? decoder!.decodeAudioData(ab) : null))
      .catch(() => null);
    buffers.set(id, p);
  }
  return p;
}

export function audioBufferNow(id: string) {
  return cachedBuffers.get(id) ?? null;
}
const cachedBuffers = new Map<string, AudioBuffer>();
export async function preloadAudio(ids: string[]) {
  await Promise.all(
    ids.map(async (id) => {
      const b = await audioBuffer(id);
      if (b) cachedBuffers.set(id, b);
    }),
  );
}
