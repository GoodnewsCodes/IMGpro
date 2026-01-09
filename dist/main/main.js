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
        autoHideMenuBar: true,
    });
    // Remove the menu bar
    mainWindow.setMenu(null);
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
electron_1.ipcMain.handle("resize-image", async (_event, { inputPath, buffer, width, height, fit = "cover", format, quality = 80, }) => {
    try {
        let pipeline = inputPath ? (0, sharp_1.default)(inputPath) : (0, sharp_1.default)(Buffer.from(buffer));
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
    }
    catch (error) {
        console.error("Resizing error:", error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle("manipulate-image", async (_event, { buffer, crop, rotate, flip, flop, }) => {
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
        const outputBuffer = await pipeline.toBuffer();
        return { success: true, buffer: outputBuffer };
    }
    catch (error) {
        console.error("Manipulation error:", error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle("mirror-image", async (_event, { buffer, type, }) => {
    try {
        const original = (0, sharp_1.default)(Buffer.from(buffer));
        const metadata = await original.metadata();
        const width = metadata.width;
        const height = metadata.height;
        let pipeline;
        if (type === "left-to-right") {
            const halfWidth = Math.floor(width / 2);
            const leftHalf = await original
                .clone()
                .extract({ left: 0, top: 0, width: halfWidth, height })
                .toBuffer();
            pipeline = (0, sharp_1.default)(leftHalf)
                .flop()
                .extend({
                left: halfWidth,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
                .composite([{ input: leftHalf, left: 0, top: 0 }]);
        }
        else if (type === "right-to-left") {
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
            pipeline = (0, sharp_1.default)(rightHalf)
                .flop()
                .extend({
                right: halfWidth,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
                .composite([{ input: rightHalf, left: halfWidth, top: 0 }]);
        }
        else if (type === "top-to-bottom") {
            const halfHeight = Math.floor(height / 2);
            const topHalf = await original
                .clone()
                .extract({ left: 0, top: 0, width, height: halfHeight })
                .toBuffer();
            pipeline = (0, sharp_1.default)(topHalf)
                .flip()
                .extend({
                top: halfHeight,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
                .composite([{ input: topHalf, left: 0, top: 0 }]);
        }
        else {
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
            pipeline = (0, sharp_1.default)(bottomHalf)
                .flip()
                .extend({
                bottom: halfHeight,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
                .composite([{ input: bottomHalf, left: 0, top: halfHeight }]);
        }
        const outputBuffer = await pipeline.toBuffer();
        return { success: true, buffer: outputBuffer };
    }
    catch (error) {
        console.error("Mirror error:", error);
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
