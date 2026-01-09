"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const fs = __importStar(require("fs"));
const png_to_ico_1 = __importDefault(require("png-to-ico"));
function createWindow() {
    const mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "../preload/preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
        show: false,
        backgroundColor: "#0f172a", // Slate 900
        autoHideMenuBar: false,
    });
    // Remove the menu bar
    // mainWindow.setMenu(null);
    // Set headers for cross-origin isolation (required for SharedArrayBuffer)
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                "Cross-Origin-Opener-Policy": ["same-origin"],
                "Cross-Origin-Embedder-Policy": ["require-corp"],
            },
        });
    });
    // Load the index.html from the renderer folder
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
    mainWindow.once("ready-to-show", () => {
        mainWindow.show();
    });
    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
// IPC handlers
electron_1.ipcMain.handle("ping", () => "pong");
electron_1.ipcMain.handle("convert-image", async (_event, { inputPath, buffer, format, quality = 80, }) => {
    try {
        let pipeline = inputPath ? (0, sharp_1.default)(inputPath) : (0, sharp_1.default)(Buffer.from(buffer));
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
                const metadata = await (0, sharp_1.default)(pngBuffer).metadata();
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
    }
    catch (error) {
        console.error("Conversion error:", error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle("resize-image", async (_event, { inputPath, buffer, width, height, fit = "cover", format, quality = 80, mask, }) => {
    try {
        let pipeline = inputPath ? (0, sharp_1.default)(inputPath) : (0, sharp_1.default)(Buffer.from(buffer));
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
                maskSvg = `<svg width="${w}" height="${h}"><circle cx="${w / 2}" cy="${h / 2}" r="${r}" /></svg>`;
            }
            else if (mask === "rounded") {
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
    }
    catch (error) {
        console.error("Resizing error:", error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle("manipulate-image", async (_event, { buffer, crop, rotate, flip, flop, round, }) => {
    try {
        let pipeline = (0, sharp_1.default)(Buffer.from(buffer));
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
            const circleSvg = Buffer.from(`<svg width="${width}" height="${height}"><circle cx="${width / 2}" cy="${height / 2}" r="${radius}" /></svg>`);
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
    }
    catch (error) {
        console.error("Manipulation error:", error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle("select-save-path", async (_event, defaultPath) => {
    const { filePath } = await electron_1.dialog.showSaveDialog({
        defaultPath,
        filters: [
            {
                name: "Images",
                extensions: ["jpg", "png", "webp", "tiff", "gif", "avif"],
            },
        ],
    });
    return filePath;
});
electron_1.ipcMain.handle("save-file", async (_event, { filePath, buffer }) => {
    try {
        await fs.promises.writeFile(filePath, Buffer.from(buffer));
        return { success: true };
    }
    catch (error) {
        console.error("Save error:", error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle("generate-ico", async (_event, buffers) => {
    try {
        const nodeBuffers = buffers.map((b) => Buffer.from(b));
        const icoBuffer = await (0, png_to_ico_1.default)(nodeBuffers);
        return { success: true, buffer: icoBuffer };
    }
    catch (error) {
        console.error("ICO generation error:", error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle("optimize-image", async (_event, { buffer, format, quality = 80, preset = "balanced", }) => {
    try {
        let pipeline = (0, sharp_1.default)(Buffer.from(buffer));
        const metadata = await pipeline.metadata();
        const targetFormat = (format || metadata.format || "png").toLowerCase();
        // Optimization settings based on preset
        let effort = 4; // Default effort for WebP/AVIF
        if (preset === "small")
            effort = 6;
        if (preset === "high")
            effort = 2;
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
                if (targetFormat === "webp")
                    pipeline = pipeline.webp({ quality });
                else if (targetFormat === "avif")
                    pipeline = pipeline.avif({ quality });
                else if (targetFormat === "png")
                    pipeline = pipeline.png();
                else
                    pipeline = pipeline.jpeg({ quality });
        }
        const outputBuffer = await pipeline.toBuffer();
        return { success: true, buffer: outputBuffer };
    }
    catch (error) {
        console.error("Optimization error:", error);
        return { success: false, error: error.message };
    }
});
// remove.bg API handlers
const REMOVE_BG_KEY_PATH = path.join(electron_1.app.getPath("userData"), "removebg_key");
electron_1.ipcMain.handle("get-remove-bg-key", async () => {
    try {
        if (!fs.existsSync(REMOVE_BG_KEY_PATH))
            return null;
        const encryptedKey = await fs.promises.readFile(REMOVE_BG_KEY_PATH);
        if (!electron_1.safeStorage.isEncryptionAvailable())
            return null;
        return electron_1.safeStorage.decryptString(encryptedKey);
    }
    catch (error) {
        console.error("Failed to get remove.bg key:", error);
        return null;
    }
});
electron_1.ipcMain.handle("set-remove-bg-key", async (_event, key) => {
    try {
        if (!electron_1.safeStorage.isEncryptionAvailable()) {
            throw new Error("Encryption is not available on this system.");
        }
        const encryptedKey = electron_1.safeStorage.encryptString(key);
        await fs.promises.writeFile(REMOVE_BG_KEY_PATH, encryptedKey);
        return { success: true };
    }
    catch (error) {
        console.error("Failed to set remove.bg key:", error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle("remove-bg-api", async (_event, buffer) => {
    try {
        if (!fs.existsSync(REMOVE_BG_KEY_PATH)) {
            throw new Error("API key not found. Please set it in settings.");
        }
        const encryptedKey = await fs.promises.readFile(REMOVE_BG_KEY_PATH);
        if (!electron_1.safeStorage.isEncryptionAvailable()) {
            throw new Error("Encryption is not available.");
        }
        const apiKey = electron_1.safeStorage.decryptString(encryptedKey);
        const formData = new FormData();
        formData.append("size", "auto");
        formData.append("image_file", new Blob([Buffer.from(buffer)], { type: "image/png" }), "image.png");
        const response = await fetch("https://api.remove.bg/v1.0/removebg", {
            method: "POST",
            headers: {
                "X-Api-Key": apiKey,
            },
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.errors?.[0]?.title || "Failed to remove background via API");
        }
        const arrayBuffer = await response.arrayBuffer();
        return { success: true, buffer: new Uint8Array(arrayBuffer) };
    }
    catch (error) {
        console.error("remove.bg API error:", error);
        return { success: false, error: error.message };
    }
});
