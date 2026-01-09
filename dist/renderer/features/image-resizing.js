"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initImageResizing = initImageResizing;
function initImageResizing() {
    const dropZone = document.getElementById("resize-drop-zone");
    const fileInput = document.getElementById("resize-file-input");
    const previewContainer = document.getElementById("resize-preview-container");
    const originalPreview = document.getElementById("resize-original-preview");
    const originalInfo = document.getElementById("resize-original-info");
    const resultPreview = document.getElementById("resize-result-preview");
    const resultWrapper = document.getElementById("resize-result-wrapper");
    const loadingOverlay = document.getElementById("resize-loading-overlay");
    const processBtn = document.getElementById("resize-process-btn");
    const downloadBtn = document.getElementById("resize-download-btn");
    const resetBtn = document.getElementById("resize-reset-btn");
    if (!dropZone || !fileInput || !processBtn)
        return;
    const widthInput = document.getElementById("resize-width");
    const heightInput = document.getElementById("resize-height");
    const lockAspectRatio = document.getElementById("lock-aspect-ratio");
    const fitSelect = document.getElementById("resize-fit");
    const formatSelect = document.getElementById("resize-format");
    let currentFile = null;
    let convertedBuffer = null;
    let originalWidth = 0;
    let originalHeight = 0;
    // Upload Logic
    dropZone?.addEventListener("click", () => fileInput.click());
    dropZone?.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
    });
    dropZone?.addEventListener("dragleave", () => {
        dropZone.classList.remove("drag-over");
    });
    dropZone?.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    });
    fileInput.addEventListener("change", () => {
        if (fileInput.files && fileInput.files.length > 0) {
            handleFile(fileInput.files[0]);
        }
    });
    function handleFile(file) {
        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file.");
            return;
        }
        currentFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (originalPreview) {
                originalPreview.src = e.target?.result;
                originalPreview.onload = () => {
                    originalWidth = originalPreview.naturalWidth;
                    originalHeight = originalPreview.naturalHeight;
                    if (originalInfo) {
                        originalInfo.textContent = `Original Size: ${originalWidth} x ${originalHeight} px`;
                    }
                    widthInput.value = originalWidth.toString();
                    heightInput.value = originalHeight.toString();
                };
                previewContainer?.classList.remove("hidden");
                dropZone?.classList.add("hidden");
            }
        };
        reader.readAsDataURL(file);
    }
    // Aspect Ratio Logic
    widthInput.addEventListener("input", () => {
        if (lockAspectRatio.checked && originalWidth > 0) {
            const ratio = originalHeight / originalWidth;
            heightInput.value = Math.round(parseInt(widthInput.value) * ratio).toString();
        }
    });
    heightInput.addEventListener("input", () => {
        if (lockAspectRatio.checked && originalHeight > 0) {
            const ratio = originalWidth / originalHeight;
            widthInput.value = Math.round(parseInt(heightInput.value) * ratio).toString();
        }
    });
    // Process Logic
    processBtn.addEventListener("click", async () => {
        if (!currentFile)
            return;
        loadingOverlay?.classList.remove("hidden");
        resultWrapper?.classList.remove("hidden");
        processBtn.disabled = true;
        try {
            const arrayBuffer = await currentFile.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);
            const width = parseInt(widthInput.value);
            const height = parseInt(heightInput.value);
            const fit = fitSelect.value;
            const format = formatSelect.value || undefined;
            const result = await window.electronAPI.resizeImage({
                buffer,
                width,
                height,
                fit,
                format,
            });
            if (result.success && result.buffer) {
                convertedBuffer = result.buffer;
                const outFormat = format || currentFile.type.split("/")[1];
                const blob = new Blob([result.buffer], {
                    type: `image/${outFormat}`,
                });
                const url = URL.createObjectURL(blob);
                if (resultPreview) {
                    resultPreview.src = url;
                    downloadBtn.classList.remove("hidden");
                }
            }
            else {
                alert("Resizing failed: " + result.error);
            }
        }
        catch (error) {
            console.error(error);
            alert("An error occurred during resizing.");
        }
        finally {
            loadingOverlay?.classList.add("hidden");
            processBtn.disabled = false;
        }
    });
    // Download Logic
    downloadBtn.addEventListener("click", async () => {
        if (!convertedBuffer || !currentFile)
            return;
        const format = formatSelect.value || currentFile.name.split(".").pop() || "png";
        const originalName = currentFile.name.split(".")[0];
        const defaultPath = `${originalName}_resized.${format}`;
        const savePath = await window.electronAPI.selectSavePath(defaultPath);
        if (savePath) {
            const result = await window.electronAPI.saveFile({
                filePath: savePath,
                buffer: convertedBuffer,
            });
            if (!result.success) {
                alert("Failed to save file: " + result.error);
            }
        }
    });
    // Reset Logic
    resetBtn.addEventListener("click", () => {
        currentFile = null;
        convertedBuffer = null;
        if (fileInput)
            fileInput.value = "";
        if (originalPreview)
            originalPreview.src = "";
        if (resultPreview)
            resultPreview.src = "";
        if (originalInfo)
            originalInfo.textContent = "";
        previewContainer?.classList.add("hidden");
        dropZone?.classList.remove("hidden");
        downloadBtn.classList.add("hidden");
        resultWrapper?.classList.add("hidden");
        widthInput.value = "";
        heightInput.value = "";
    });
}
