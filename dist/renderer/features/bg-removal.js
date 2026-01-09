"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initBgRemoval = initBgRemoval;
const background_removal_1 = require("@imgly/background-removal");
function initBgRemoval() {
    const fileInput = document.getElementById("file-input");
    const dropZone = document.getElementById("drop-zone");
    const previewContainer = document.getElementById("preview-container");
    const originalPreview = document.getElementById("original-preview");
    const resultPreview = document.getElementById("result-preview");
    const processBtn = document.getElementById("process-btn");
    const downloadBtn = document.getElementById("download-btn");
    const resetBtn = document.getElementById("reset-btn");
    const loadingOverlay = document.getElementById("loading-overlay");
    const loadingText = document.getElementById("loading-text");
    let selectedFile = null;
    let processedBlob = null;
    if (!fileInput ||
        !dropZone ||
        !previewContainer ||
        !originalPreview ||
        !resultPreview ||
        !processBtn ||
        !downloadBtn ||
        !resetBtn ||
        !loadingOverlay ||
        !loadingText) {
        console.error("Background removal elements not found");
        return;
    }
    // Handle file selection
    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("active");
    });
    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("active");
    });
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("active");
        if (e.dataTransfer?.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener("change", () => {
        if (fileInput.files?.length) {
            handleFile(fileInput.files[0]);
        }
    });
    function handleFile(file) {
        if (!file.type.startsWith("image/")) {
            alert("Please select an image file.");
            return;
        }
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            originalPreview.src = e.target?.result;
            previewContainer.classList.remove("hidden");
            dropZone.classList.add("hidden");
            resultPreview.src = "";
            downloadBtn.classList.add("hidden");
        };
        reader.readAsDataURL(file);
    }
    // Handle processing
    processBtn.addEventListener("click", async () => {
        if (!selectedFile)
            return;
        try {
            loadingOverlay.classList.remove("hidden");
            processBtn.disabled = true;
            loadingText.textContent = "Removing background...";
            const result = await (0, background_removal_1.removeBackground)(selectedFile, {
                progress: (key, current, total) => {
                    const percent = total ? Math.round((current / total) * 100) : 0;
                    loadingText.textContent = `Processing: ${percent}%`;
                },
            });
            processedBlob = result;
            const url = URL.createObjectURL(result);
            resultPreview.src = url;
            downloadBtn.classList.remove("hidden");
        }
        catch (error) {
            console.error("Background removal failed:", error);
            alert("Failed to remove background. Please try again.");
        }
        finally {
            loadingOverlay.classList.add("hidden");
            processBtn.disabled = false;
        }
    });
    // Handle download
    downloadBtn.addEventListener("click", async () => {
        if (!processedBlob || !selectedFile)
            return;
        const defaultPath = `imgpro_${selectedFile.name.split(".")[0]}_no_bg.png`;
        const savePath = await window.electronAPI.selectSavePath(defaultPath);
        if (savePath) {
            const arrayBuffer = await processedBlob.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);
            const result = await window.electronAPI.saveFile({
                filePath: savePath,
                buffer,
            });
            if (!result.success) {
                alert("Failed to save file: " + result.error);
            }
        }
    });
    // Handle reset
    resetBtn.addEventListener("click", () => {
        selectedFile = null;
        processedBlob = null;
        fileInput.value = "";
        originalPreview.src = "";
        resultPreview.src = "";
        previewContainer.classList.add("hidden");
        dropZone.classList.remove("hidden");
        downloadBtn.classList.add("hidden");
    });
}
