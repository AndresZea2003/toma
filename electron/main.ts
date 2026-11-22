// Toma como app de escritorio: una ventana con la interfaz y el servidor dentro.
import { app, BaseWindow, dialog, Menu, safeStorage, session, shell, WebContentsView } from "electron";
import { autoUpdater } from "electron-updater";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { startServer } from "../server/standalone";

// Puerto fijo: los videos guardados (almacenamiento del navegador) dependen de la dirección.
const PORT = 47615;
const URL_APP = `http://127.0.0.1:${PORT}/`;

app.setName("Toma");
const dataDir = app.getPath("userData");
// El perfil de Chrome del piloto y las descargas viven en los datos del usuario
process.env.TOMA_DATA_DIR = dataDir;
// Skills de estilo que vienen con la app
process.env.TOMA_STYLES_DIR = path.join(__dirname, "..", "styles");

/** Clave de IA y ajustes opcionales: archivo .env en la carpeta de datos de Toma */
function loadEnv() {
  const file = path.join(dataDir, ".env");
  if (!existsSync(file)) {
    writeFileSync(file, "# Pon aquí tu clave para guiones con IA y reinicia Toma\nANTHROPIC_API_KEY=\n");
    return;
  }
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

/**
 * Actualizaciones: al abrir, Toma mira si hay una versión nueva publicada, la descarga
 * en segundo plano y la instala al cerrar. Solo actúa en la app instalada.
 */
type UpdateState = "idle" | "checking" | "none" | "downloading" | "ready" | "error";
const update: { state: UpdateState; version: string; next?: string; percent?: number; error?: string } = { state: "idle", version: app.getVersion() };

function setupUpdates() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("checking-for-update", () => Object.assign(update, { state: "checking", error: undefined }));
  autoUpdater.on("update-not-available", () => Object.assign(update, { state: "none" }));
  autoUpdater.on("update-available", (info) => Object.assign(update, { state: "downloading", next: info.version, percent: 0 }));
  autoUpdater.on("download-progress", (p) => Object.assign(update, { state: "downloading", percent: Math.round(p.percent) }));
  autoUpdater.on("update-downloaded", (info) => Object.assign(update, { state: "ready", next: info.version, percent: 100 }));
  autoUpdater.on("error", (e) => Object.assign(update, { state: "error", error: String(e?.message ?? e).slice(0, 200) }));
}

function checkForUpdates() {
  if (!app.isPackaged) {
    Object.assign(update, { state: "error", error: "Las actualizaciones solo funcionan en la app instalada." });
    return;
  }
  // Sin caché: si no, la app puede seguir viendo «la última versión» de hace un rato y decir «Al día»
  autoUpdater.requestHeaders = { "Cache-Control": "no-cache" };
  const clear = [session.defaultSession, session.fromPartition("electron-updater")].map((s) => s.clearCache().catch(() => undefined));
  // Sin conexión o sin versión publicada: el estado queda en «error» y la app sigue igual
  void Promise.all(clear).then(() => autoUpdater.checkForUpdates().catch(() => undefined));
}

// El botón «Actualizar» de la interfaz habla con esto a través del servidor local
(globalThis as { __tomaUpdate?: unknown }).__tomaUpdate = {
  get: () => ({ desktop: true, ...update }),
  check: checkForUpdates,
  install: () => update.state === "ready" && autoUpdater.quitAndInstall(),
};

let win: BaseWindow | null = null;
let ui: WebContentsView | null = null;

function layout() {
  if (!win || !ui) return;
  const { width, height } = win.getContentBounds();
  ui.setBounds({ x: 0, y: 0, width, height });
}

function createWindow() {
  win = new BaseWindow({
    width: 1500,
    height: 940,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#eceef6",
    title: "Toma",
  });
  if (process.platform !== "darwin") Menu.setApplicationMenu(null);
  ui = new WebContentsView({ webPreferences: { contextIsolation: true, nodeIntegration: false } });
  win.contentView.addChildView(ui);
  // Los enlaces externos se abren en el navegador del usuario
  ui.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  ui.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(URL_APP)) {
      e.preventDefault();
      void shell.openExternal(url);
    }
  });
  void ui.webContents.loadURL(URL_APP);
  layout();
  win.on("resize", layout);
  win.on("closed", () => {
    win = null;
    ui = null;
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  void app.whenReady().then(async () => {
    loadEnv();
    // Las claves de Configuración se cifran con el almacén seguro del sistema
    if (safeStorage.isEncryptionAvailable()) {
      (globalThis as { __tomaCrypt?: unknown }).__tomaCrypt = {
        enc: (s: string) => safeStorage.encryptString(s).toString("base64"),
        dec: (s: string) => safeStorage.decryptString(Buffer.from(s, "base64")),
      };
    }
    try {
      await startServer(path.join(__dirname, "..", "dist"), PORT);
    } catch (e) {
      dialog.showErrorBox("Toma no pudo arrancar", `El puerto ${PORT} está ocupado o hubo un error.\n\n${e instanceof Error ? e.message : e}`);
      app.quit();
      return;
    }
    createWindow();
    setupUpdates();
    if (app.isPackaged) checkForUpdates();
  });
  app.on("window-all-closed", () => app.quit());
}
