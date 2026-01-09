"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initImageConversion = initImageConversion;
const settings_1 = require("./settings");
function initImageConversion() {
    const dropZone = document.getElementById("conv-drop-zone");
    const fileInput = document.getElementById("conv-file-input");
    const previewContainer = document.getElementById("conv-preview-container");
    const originalPreview = document.getElementById("conv-original-preview");
    const resultPreview = document.getElementById("conv-result-preview");
    const resultWrapper = document.getElementById("conv-result-wrapper");
    const loadingOverlay = document.getElementById("conv-loading-overlay");
    const processBtn = document.getElementById("conv-process-btn");
    const downloadBtn = document.getElementById("conv-download-btn");
    const resetBtn = document.getElementById("conv-reset-btn");
    if (!dropZone || !fileInput || !processBtn)
        return;
    const formatSelect = document.getElementById("format-select");
    const qualitySlider = document.getElementById("quality-slider");
    const qualityValue = document.getElementById("quality-value");
    const qualityGroup = document.getElementById("quality-group");
    let currentFile = null;
    let convertedBuffer = null;
    // Apply default settings
    const settings = (0, settings_1.getSettings)();
    if (formatSelect)
        formatSelect.value = settings.defaultFormat;
    if (qualitySlider) {
        qualitySlider.value = settings.defaultQuality.toString();
        if (qualityValue)
            qualityValue.textContent = settings.defaultQuality.toString();
    }
    // Trigger visibility check
    const initialFormat = formatSelect.value;
    if (initialFormat === "png" ||
        initialFormat === "gif" ||
        initialFormat === "svg") {
        qualityGroup?.classList.add("hidden");
    }
    else {
        qualityGroup?.classList.remove("hidden");
    }
    // Handle quality slider visibility
    formatSelect.addEventListener("change", () => {
        const format = formatSelect.value;
        if (format === "png" || format === "gif" || format === "svg") {
            qualityGroup?.classList.add("hidden");
        }
        else {
            qualityGroup?.classList.remove("hidden");
        }
    });
    qualitySlider.addEventListener("input", () => {
        if (qualityValue)
            qualityValue.textContent = qualitySlider.value;
    });
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
                previewContainer?.classList.remove("hidden");
                dropZone?.classList.add("hidden");
            }
        };
        reader.readAsDataURL(file);
    }
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
            const format = formatSelect.value;
            const quality = parseInt(qualitySlider.value);
            const result = await window.electronAPI.convertImage({
                buffer,
                format,
                quality,
            });
            if (result.success && result.buffer) {
                convertedBuffer = result.buffer;
                const blob = new Blob([result.buffer], {
                    type: `image/${format}`,
                });
                const url = URL.createObjectURL(blob);
                if (resultPreview) {
                    resultPreview.src = url;
                    downloadBtn.classList.remove("hidden");
                }
            }
            else {
                alert("Conversion failed: " + result.error);
            }
        }
        catch (error) {
            console.error(error);
            alert("An error occurred during conversion.");
        }
        finally {
            loadingOverlay?.classList.add("hidden");
            processBtn.disabled = false;
        }
    });
    // Download/Save Logic
    downloadBtn.addEventListener("click", async () => {
        if (!convertedBuffer || !currentFile)
            return;
        const format = formatSelect.value;
        const originalName = currentFile.name.split(".")[0];
        const defaultPath = `${originalName}_converted.${format}`;
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
        previewContainer?.classList.add("hidden");
        dropZone?.classList.remove("hidden");
        downloadBtn.classList.add("hidden");
        resultWrapper?.classList.add("hidden");
    });
}
