"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initOptimization = initOptimization;
const settings_1 = require("./settings");
function initOptimization() {
    const fileInput = document.getElementById("opt-file-input");
    const dropZone = document.getElementById("opt-drop-zone");
    const previewContainer = document.getElementById("opt-preview-container");
    const originalPreview = document.getElementById("opt-original-preview");
    const originalInfo = document.getElementById("opt-original-info");
    const resultPreview = document.getElementById("opt-result-preview");
    const resultInfo = document.getElementById("opt-result-info");
    const resultWrapper = document.getElementById("opt-result-wrapper");
    const loadingOverlay = document.getElementById("opt-loading-overlay");
    const processBtn = document.getElementById("opt-process-btn");
    const downloadBtn = document.getElementById("opt-download-btn");
    const resetBtn = document.getElementById("opt-reset-btn");
    const qualitySlider = document.getElementById("opt-quality-slider");
    const qualityValue = document.getElementById("opt-quality-value");
    const formatSelect = document.getElementById("opt-format-select");
    const presetSelect = document.getElementById("opt-preset-select");
    let currentFile = null;
    let resultBuffer = null;
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0)
            return "0 Bytes";
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
    }
    // Drag and drop handlers
    dropZone?.addEventListener("click", () => fileInput.click());
    dropZone?.addEventListener("dragenter", (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
    });
    dropZone?.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
    });
    dropZone?.addEventListener("dragleave", (e) => {
        const relatedTarget = e.relatedTarget;
        if (!relatedTarget || !dropZone.contains(relatedTarget)) {
            dropZone.classList.remove("drag-over");
        }
    });
    dropZone?.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
        if (e.dataTransfer?.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    fileInput?.addEventListener("change", (e) => {
        if (fileInput.files?.length) {
            handleFile(fileInput.files[0]);
        }
    });
    // Quality slider
    qualitySlider?.addEventListener("input", () => {
        if (qualityValue)
            qualityValue.textContent = qualitySlider.value;
    });
    // Process button
    processBtn?.addEventListener("click", async () => {
        if (!currentFile)
            return;
        if (loadingOverlay)
            loadingOverlay.classList.remove("hidden");
        if (resultWrapper)
            resultWrapper.classList.remove("hidden");
        if (resultInfo)
            resultInfo.textContent = "Optimizing...";
        try {
            const arrayBuffer = await currentFile.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);
            const quality = parseInt(qualitySlider.value);
            const format = formatSelect.value || undefined;
            const preset = presetSelect.value || "balanced";
            const result = await window.electronAPI.optimizeImage({
                buffer,
                format,
                quality,
                preset,
            });
            if (result.success && result.buffer) {
                resultBuffer = result.buffer;
                const targetFormat = format || currentFile.name.split(".").pop() || "png";
                const blob = new Blob([resultBuffer], {
                    type: `image/${targetFormat === "jpg" ? "jpeg" : targetFormat}`,
                });
                resultPreview.src = URL.createObjectURL(blob);
                if (resultInfo) {
                    const originalSize = currentFile.size;
                    const optimizedSize = resultBuffer.length;
                    const saved = originalSize - optimizedSize;
                    const percentage = ((saved / originalSize) * 100).toFixed(1);
                    resultInfo.innerHTML = `
            Optimized Size: <strong>${formatBytes(optimizedSize)}</strong><br>
            <span style="color: var(--success, #10b981)">
              Saved ${formatBytes(saved)} (${percentage}%)
            </span>
          `;
                }
                if (downloadBtn)
                    downloadBtn.classList.remove("hidden");
            }
            else {
                alert("Optimization failed: " + result.error);
                if (resultInfo)
                    resultInfo.textContent = "Error: " + result.error;
            }
        }
        catch (error) {
            console.error(error);
            alert("An error occurred during optimization.");
            if (resultInfo)
                resultInfo.textContent = "An error occurred.";
        }
        finally {
            if (loadingOverlay)
                loadingOverlay.classList.add("hidden");
        }
    });
    // Download button
    downloadBtn?.addEventListener("click", async () => {
        if (!resultBuffer)
            return;
        const format = formatSelect.value || currentFile?.name.split(".").pop() || "png";
        const defaultName = `optimized-${Date.now()}.${format}`;
        const filePath = await window.electronAPI.selectSavePath(defaultName);
        if (filePath) {
            const result = await window.electronAPI.saveFile({
                filePath,
                buffer: resultBuffer,
            });
            if (result.success) {
                alert("File saved successfully!");
            }
            else {
                alert("Failed to save file: " + result.error);
            }
        }
    });
    // Reset button
    resetBtn?.addEventListener("click", () => {
        currentFile = null;
        resultBuffer = null;
        if (dropZone)
            dropZone.classList.remove("hidden");
        if (previewContainer)
            previewContainer.classList.add("hidden");
        if (fileInput)
            fileInput.value = "";
        if (downloadBtn)
            downloadBtn.classList.add("hidden");
        if (resultPreview)
            resultPreview.src = "";
        if (resultInfo)
            resultInfo.innerHTML = "";
    });
    function handleFile(file) {
        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file.");
            return;
        }
        currentFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (originalPreview)
                originalPreview.src = e.target?.result;
            if (originalInfo) {
                originalInfo.innerHTML = `Original Size: <strong>${formatBytes(file.size)}</strong>`;
            }
            if (dropZone)
                dropZone.classList.add("hidden");
            if (previewContainer)
                previewContainer.classList.remove("hidden");
            // Load default settings
            const settings = (0, settings_1.getSettings)();
            if (qualitySlider) {
                qualitySlider.value = settings.defaultQuality.toString();
                if (qualityValue)
                    qualityValue.textContent = settings.defaultQuality.toString();
            }
        };
        reader.readAsDataURL(file);
    }
}
