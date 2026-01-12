import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  ping: () => ipcRenderer.invoke("ping"),
  convertImage: (data: {
    inputPath?: string;
    buffer?: Uint8Array;
    format: string;
    quality?: number;
  }) => ipcRenderer.invoke("convert-image", data),
  optimizeImage: (data: {
    buffer: Uint8Array;
    format?: string;
    quality?: number;
    preset?: "small" | "balanced" | "high";
  }) => ipcRenderer.invoke("optimize-image", data),
  selectSavePath: (defaultPath: string) =>
    ipcRenderer.invoke("select-save-path", defaultPath),
  saveFile: (data: { filePath: string; buffer: Uint8Array }) =>
    ipcRenderer.invoke("save-file", data),
  resizeImage: (data: {
    inputPath?: string;
    buffer?: Uint8Array;
    width?: number;
    height?: number;
    fit?: string;
    format?: string;
    quality?: number;
  }) => ipcRenderer.invoke("resize-image", data),
  manipulateImage: (data: {
    buffer: Uint8Array;
    crop?: { left: number; top: number; width: number; height: number };
    rotate?: number;
    flip?: boolean;
    flop?: boolean;
  }) => ipcRenderer.invoke("manipulate-image", data),
  mirrorImage: (data: { buffer: Uint8Array; type: string }) =>
    ipcRenderer.invoke("mirror-image", data),
  generateIco: (buffers: Uint8Array[]) =>
    ipcRenderer.invoke("generate-ico", buffers),
  getRemoveBgKey: () => ipcRenderer.invoke("get-remove-bg-key"),
  setRemoveBgKey: (key: string) => ipcRenderer.invoke("set-remove-bg-key", key),
  removeBgApi: (buffer: Uint8Array) =>
    ipcRenderer.invoke("remove-bg-api", buffer),
  clearCache: () => ipcRenderer.invoke("clear-cache"),
});
