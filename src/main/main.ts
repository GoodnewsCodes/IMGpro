import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  IpcMainInvokeEvent,
  safeStorage,
} from "electron";
import * as path from "path";
import sharp from "sharp";
import * as fs from "fs";

import * as png2icons from "png2icons";

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    backgroundColor: "#0f172a", // Slate 900
    autoHideMenuBar: true,
  });

  mainWindow.maximize();

  // Remove the menu bar
  // mainWindow.setMenu(null);

  // Set headers for cross-origin isolation (required for SharedArrayBuffer)
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Cross-Origin-Opener-Policy": ["same-origin"],
          "Cross-Origin-Embedder-Policy": ["require-corp"],
        },
      });
    }
  );

  // Load the index.html from the renderer folder
  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, _commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      if (windows[0].isMinimized()) windows[0].restore();
      windows[0].focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// IPC handlers
ipcMain.handle("ping", () => "pong");

ipcMain.handle(
  "convert-image",
  async (
    _event: IpcMainInvokeEvent,
    {
      inputPath,
      buffer,
      format,
      quality = 80,
    }: {
      inputPath?: string;
      buffer?: Uint8Array;
      format: string;
      quality?: number;
    }
  ) => {
    try {
      let pipeline = inputPath ? sharp(inputPath) : sharp(Buffer.from(buffer!));

      // Apply format and quality
      switch (format.toLowerCase()) {
        case "jpeg":
        case "jpg":
          pipeline = pipeline.jpeg({ quality });
          break;
        case "png":
          pipeline = pipeline.png();
          break;
        case "webp":
          pipeline = pipeline.webp({ quality });
          break;
        case "tiff":
          pipeline = pipeline.tiff({ quality });
          break;
        case "gif":
          pipeline = pipeline.gif();
          break;
        case "avif":
          pipeline = pipeline.avif({ quality });
          break;
        case "svg":
          // Special case for SVG: wrap the image in an SVG container
          // We'll convert to PNG first to ensure compatibility
          const pngBuffer = await pipeline.png().toBuffer();
          const base64 = pngBuffer.toString("base64");
          const metadata = await sharp(pngBuffer).metadata();
          const svg = `
            <svg width="${metadata.width}" height="${metadata.height}" xmlns="http://www.w3.org/2000/svg">
              <image href="data:image/png;base64,${base64}" width="${metadata.width}" height="${metadata.height}" />
            </svg>
          `;
          return { success: true, buffer: Buffer.from(svg) };
        case "icns":
          // ICNS requires PNG input. We'll convert to PNG first.
          const pngForIcns = await pipeline.png().toBuffer();
          const icnsBuffer = png2icons.createICNS(
            pngForIcns,
            png2icons.HERMITE,
            0
          );
          if (!icnsBuffer) throw new Error("Failed to create ICNS");
          return { success: true, buffer: icnsBuffer };
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      const outputBuffer = await pipeline.toBuffer();
      return { success: true, buffer: outputBuffer };
    } catch (error: any) {
      console.error("Conversion error:", error);
      return { success: false, error: error.message };
    }
  }
);

ipcMain.handle(
  "resize-image",
  async (
    _event: IpcMainInvokeEvent,
    {
      inputPath,
      buffer,
      width,
      height,
      fit = "cover",
      format,
      quality = 80,
      mask,
    }: {
      inputPath?: string;
      buffer?: Uint8Array;
      width?: number;
      height?: number;
      fit?: keyof sharp.FitEnum;
      format?: string;
      quality?: number;
      mask?: "square" | "rounded" | "circle";
    }
  ) => {
    try {
      let pipeline = inputPath ? sharp(inputPath) : sharp(Buffer.from(buffer!));

      if (width || height) {
        pipeline = pipeline.resize({
          width,
          height,
          fit,
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // Ensure transparent background for fit
        });
      }

      if (mask && mask !== "square" && width && height) {
        const w = width;
        const h = height;
        let maskSvg = "";

        if (mask === "circle") {
          const r = Math.min(w, h) / 2;
          maskSvg = `<svg width="${w}" height="${h}"><circle cx="${
            w / 2
          }" cy="${h / 2}" r="${r}" /></svg>`;
        } else if (mask === "rounded") {
          const rx = Math.min(w, h) * 0.2; // 20% radius
          maskSvg = `<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" ry="${rx}" /></svg>`;
        }

        if (maskSvg) {
          pipeline = pipeline.composite([
            {
              input: Buffer.from(maskSvg),
              blend: "dest-in",
            },
          ]);
        }
      }

      if (format) {
        switch (format.toLowerCase()) {
          case "jpeg":
          case "jpg":
            pipeline = pipeline.jpeg({ quality });
            break;
          case "png":
            pipeline = pipeline.png();
            break;
          case "webp":
            pipeline = pipeline.webp({ quality });
            break;
          case "tiff":
            pipeline = pipeline.tiff({ quality });
            break;
          case "gif":
            pipeline = pipeline.gif();
            break;
          case "avif":
            pipeline = pipeline.avif({ quality });
            break;
        }
      }

      const outputBuffer = await pipeline.toBuffer();
      return { success: true, buffer: outputBuffer };
    } catch (error: any) {
      console.error("Resizing error:", error);
      return { success: false, error: error.message };
    }
  }
);

ipcMain.handle(
  "manipulate-image",
  async (
    _event: IpcMainInvokeEvent,
    {
      buffer,
      crop,
      rotate,
      flip,
      flop,
      round,
    }: {
      buffer: Uint8Array;
      crop?: { left: number; top: number; width: number; height: number };
      rotate?: number;
      flip?: boolean;
      flop?: boolean;
      round?: boolean;
    }
  ) => {
    try {
      let pipeline = sharp(Buffer.from(buffer));

      if (rotate) {
        pipeline = pipeline.rotate(rotate);
      }

      if (flip) {
        pipeline = pipeline.flip();
      }

      if (flop) {
        pipeline = pipeline.flop();
      }

      if (crop) {
        pipeline = pipeline.extract({
          left: Math.round(crop.left),
          top: Math.round(crop.top),
          width: Math.round(crop.width),
          height: Math.round(crop.height),
        });
      }

      if (round) {
        // Get the current metadata to know dimensions
        const metadata = await pipeline.metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;
        const radius = Math.min(width, height) / 2;

        const circleSvg = Buffer.from(
          `<svg width="${width}" height="${height}"><circle cx="${
            width / 2
          }" cy="${height / 2}" r="${radius}" /></svg>`
        );

        pipeline = pipeline.composite([
          {
            input: circleSvg,
            blend: "dest-in",
          },
        ]);
        // Force PNG to support transparency
        pipeline = pipeline.png();
      }

      const outputBuffer = await pipeline.toBuffer();
      return { success: true, buffer: outputBuffer };
    } catch (error: any) {
      console.error("Manipulation error:", error);
      return { success: false, error: error.message };
    }
  }
);

ipcMain.handle(
  "select-save-path",
  async (_event: IpcMainInvokeEvent, defaultPath: string) => {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath,
      filters: [
        {
          name: "Images",
          extensions: ["jpg", "png", "webp", "tiff", "gif", "avif", "icns"],
        },
      ],
    });
    return filePath;
  }
);

ipcMain.handle(
  "save-file",
  async (
    _event: IpcMainInvokeEvent,
    { filePath, buffer }: { filePath: string; buffer: Uint8Array }
  ) => {
    try {
      await fs.promises.writeFile(filePath, Buffer.from(buffer));
      return { success: true };
    } catch (error: any) {
      console.error("Save error:", error);
      return { success: false, error: error.message };
    }
  }
);

ipcMain.handle(
  "generate-ico",
  async (_event: IpcMainInvokeEvent, buffers: Uint8Array[]) => {
    try {
      const { default: pngToIco } = await import("png-to-ico");
      const nodeBuffers = buffers.map((b) => Buffer.from(b));
      const icoBuffer = await pngToIco(nodeBuffers);
      return { success: true, buffer: icoBuffer };
    } catch (error: any) {
      console.error("ICO generation error:", error);
      return { success: false, error: error.message };
    }
  }
);

ipcMain.handle(
  "optimize-image",
  async (
    _event: IpcMainInvokeEvent,
    {
      buffer,
      format,
      quality = 80,
      preset = "balanced",
    }: {
      buffer: Uint8Array;
      format?: string;
      quality?: number;
      preset?: "small" | "balanced" | "high";
    }
  ) => {
    try {
      let pipeline = sharp(Buffer.from(buffer));
      const metadata = await pipeline.metadata();
      const targetFormat = (format || metadata.format || "png").toLowerCase();

      // Optimization settings based on preset
      let effort = 4; // Default effort for WebP/AVIF
      if (preset === "small") effort = 6;
      if (preset === "high") effort = 2;

      switch (targetFormat) {
        case "jpeg":
        case "jpg":
          pipeline = pipeline.jpeg({
            quality,
            mozjpeg: true,
            progressive: true,
          });
          break;
        case "png":
          pipeline = pipeline.png({
            compressionLevel: 9,
            palette: preset === "small", // Use palette for smaller PNGs if requested
            quality: preset === "small" ? 80 : 100,
          });
          break;
        case "webp":
          pipeline = pipeline.webp({
            quality,
            effort,
            lossless: false,
            smartSubsample: true,
          });
          break;
        case "avif":
          pipeline = pipeline.avif({
            quality,
            effort,
            chromaSubsampling: preset === "small" ? "4:2:0" : "4:4:4",
          });
          break;
        case "svg":
          // If it's already SVG, we can't do much with sharp without rasterizing.
          // For now, if the input is SVG, we just return it.
          // If not, we don't support converting TO SVG via optimization (use conversion tool instead)
          if (metadata.format === "svg") {
            return { success: true, buffer };
          }
          throw new Error("Cannot optimize to SVG from raster format.");
        default:
          // Fallback to basic conversion
          if (targetFormat === "webp") pipeline = pipeline.webp({ quality });
          else if (targetFormat === "avif")
            pipeline = pipeline.avif({ quality });
          else if (targetFormat === "png") pipeline = pipeline.png();
          else pipeline = pipeline.jpeg({ quality });
      }

      const outputBuffer = await pipeline.toBuffer();
      return { success: true, buffer: outputBuffer };
    } catch (error: any) {
      console.error("Optimization error:", error);
      return { success: false, error: error.message };
    }
  }
);

// remove.bg API handlers
const REMOVE_BG_KEY_PATH = path.join(app.getPath("userData"), "removebg_key");

ipcMain.handle("get-remove-bg-key", async () => {
  try {
    if (!fs.existsSync(REMOVE_BG_KEY_PATH)) return null;
    const encryptedKey = await fs.promises.readFile(REMOVE_BG_KEY_PATH);
    if (!safeStorage.isEncryptionAvailable()) return null;
    return safeStorage.decryptString(encryptedKey);
  } catch (error) {
    console.error("Failed to get remove.bg key:", error);
    return null;
  }
});

ipcMain.handle("set-remove-bg-key", async (_event, key: string) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Encryption is not available on this system.");
    }
    const encryptedKey = safeStorage.encryptString(key);
    await fs.promises.writeFile(REMOVE_BG_KEY_PATH, encryptedKey);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to set remove.bg key:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("remove-bg-api", async (_event, buffer: Uint8Array) => {
  try {
    if (!fs.existsSync(REMOVE_BG_KEY_PATH)) {
      throw new Error("API key not found. Please set it in settings.");
    }
    const encryptedKey = await fs.promises.readFile(REMOVE_BG_KEY_PATH);
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Encryption is not available.");
    }
    const apiKey = safeStorage.decryptString(encryptedKey);

    const formData = new FormData();
    formData.append("size", "auto");
    formData.append(
      "image_file",
      new Blob([Buffer.from(buffer)], { type: "image/png" }),
      "image.png"
    );

    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.errors?.[0]?.title || "Failed to remove background via API"
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return { success: true, buffer: new Uint8Array(arrayBuffer) };
  } catch (error: any) {
    console.error("remove.bg API error:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("clear-cache", async () => {
  try {
    const session = BrowserWindow.getAllWindows()[0]?.webContents.session;
    if (session) {
      await session.clearCache();
      await session.clearStorageData();
    }
    return { success: true };
  } catch (error: any) {
    console.error("Clear cache error:", error);
    return { success: false, error: error.message };
  }
});
