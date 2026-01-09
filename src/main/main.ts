import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  IpcMainInvokeEvent,
} from "electron";
import * as path from "path";
import sharp from "sharp";
import * as fs from "fs";
import pngToIco from "png-to-ico";

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

  // Remove the menu bar
  mainWindow.setMenu(null);

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

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

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
    }: {
      inputPath?: string;
      buffer?: Uint8Array;
      width?: number;
      height?: number;
      fit?: keyof sharp.FitEnum;
      format?: string;
      quality?: number;
    }
  ) => {
    try {
      let pipeline = inputPath ? sharp(inputPath) : sharp(Buffer.from(buffer!));

      if (width || height) {
        pipeline = pipeline.resize({
          width,
          height,
          fit,
        });
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
    }: {
      buffer: Uint8Array;
      crop?: { left: number; top: number; width: number; height: number };
      rotate?: number;
      flip?: boolean;
      flop?: boolean;
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

      const outputBuffer = await pipeline.toBuffer();
      return { success: true, buffer: outputBuffer };
    } catch (error: any) {
      console.error("Manipulation error:", error);
      return { success: false, error: error.message };
    }
  }
);

ipcMain.handle(
  "mirror-image",
  async (
    _event: IpcMainInvokeEvent,
    {
      buffer,
      type,
    }: {
      buffer: Uint8Array;
      type:
        | "left-to-right"
        | "right-to-left"
        | "top-to-bottom"
        | "bottom-to-top";
    }
  ) => {
    try {
      const original = sharp(Buffer.from(buffer));
      const metadata = await original.metadata();
      const width = metadata.width!;
      const height = metadata.height!;

      let pipeline;

      if (type === "left-to-right") {
        const halfWidth = Math.floor(width / 2);
        const leftHalf = await original
          .clone()
          .extract({ left: 0, top: 0, width: halfWidth, height })
          .toBuffer();
        pipeline = sharp(leftHalf)
          .flop()
          .extend({
            left: halfWidth,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .composite([{ input: leftHalf, left: 0, top: 0 }]);
      } else if (type === "right-to-left") {
        const halfWidth = Math.floor(width / 2);
        const rightHalf = await original
          .clone()
          .extract({
            left: width - halfWidth,
            top: 0,
            width: halfWidth,
            height,
          })
          .toBuffer();
        pipeline = sharp(rightHalf)
          .flop()
          .extend({
            right: halfWidth,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .composite([{ input: rightHalf, left: halfWidth, top: 0 }]);
      } else if (type === "top-to-bottom") {
        const halfHeight = Math.floor(height / 2);
        const topHalf = await original
          .clone()
          .extract({ left: 0, top: 0, width, height: halfHeight })
          .toBuffer();
        pipeline = sharp(topHalf)
          .flip()
          .extend({
            top: halfHeight,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .composite([{ input: topHalf, left: 0, top: 0 }]);
      } else {
        // bottom-to-top
        const halfHeight = Math.floor(height / 2);
        const bottomHalf = await original
          .clone()
          .extract({
            left: 0,
            top: height - halfHeight,
            width,
            height: halfHeight,
          })
          .toBuffer();
        pipeline = sharp(bottomHalf)
          .flip()
          .extend({
            bottom: halfHeight,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .composite([{ input: bottomHalf, left: 0, top: halfHeight }]);
      }

      const outputBuffer = await pipeline.toBuffer();
      return { success: true, buffer: outputBuffer };
    } catch (error: any) {
      console.error("Mirror error:", error);
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
          extensions: ["jpg", "png", "webp", "tiff", "gif", "avif"],
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
      const nodeBuffers = buffers.map((b) => Buffer.from(b));
      const icoBuffer = await pngToIco(nodeBuffers);
      return { success: true, buffer: icoBuffer };
    } catch (error: any) {
      console.error("ICO generation error:", error);
      return { success: false, error: error.message };
    }
  }
);
