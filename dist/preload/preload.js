"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    ping: () => electron_1.ipcRenderer.invoke("ping"),
    convertImage: (data) => electron_1.ipcRenderer.invoke("convert-image", data),
    selectSavePath: (defaultPath) => electron_1.ipcRenderer.invoke("select-save-path", defaultPath),
    saveFile: (data) => electron_1.ipcRenderer.invoke("save-file", data),
    resizeImage: (data) => electron_1.ipcRenderer.invoke("resize-image", data),
    manipulateImage: (data) => electron_1.ipcRenderer.invoke("manipulate-image", data),
    mirrorImage: (data) => electron_1.ipcRenderer.invoke("mirror-image", data),
    generateIco: (buffers) => electron_1.ipcRenderer.invoke("generate-ico", buffers),
});
