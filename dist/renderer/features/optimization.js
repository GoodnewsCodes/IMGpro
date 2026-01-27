"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initOptimization = initOptimization;
const settings_1 = require("./settings");
const jszip_1 = __importDefault(require("jszip"));
function initOptimization() {
    const fileInput = document.getElementById("opt-file-input");
    const dropZone = document.getElementById("opt-drop-zone");
    const previewContainer = document.getElementById("opt-preview-container");
    const fileListContainer = document.getElementById("opt-file-list");
    const processBtn = document.getElementById("opt-process-btn");
    const downloadBtn = document.getElementById("opt-download-btn");
    const resetBtn = document.getElementById("opt-reset-btn");
    const batchSummary = document.getElementById("opt-batch-summary");
    const qualitySlider = document.getElementById("opt-quality-slider");
    const qualityValue = document.getElementById("opt-quality-value");
    const formatSelect = document.getElementById("opt-format-select");
    const presetSelect = document.getElementById("opt-preset-select");
    let files = [];
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
            handleFiles(Array.from(e.dataTransfer.files));
        }
    });
    fileInput?.addEventListener("change", (e) => {
        if (fileInput.files?.length) {
            handleFiles(Array.from(fileInput.files));
        }
    });
    // Quality slider
    qualitySlider?.addEventListener("input", () => {
        if (qualityValue)
            qualityValue.textContent = qualitySlider.value;
    });
    function handleFiles(newFiles) {
        const imageFiles = newFiles.filter((file) => file.type.startsWith("image/"));
        if (imageFiles.length === 0) {
            alert("Please select image files.");
            return;
        }
        const newProcessedFiles = imageFiles.map((file) => ({
            file,
            id: Math.random().toString(36).substring(7),
            status: "pending",
            originalSize: file.size,
        }));
        files = [...files, ...newProcessedFiles];
        updateUI();
        // Load default settings if first load
        const settings = (0, settings_1.getSettings)();
        if (qualitySlider && files.length === newProcessedFiles.length) {
            qualitySlider.value = settings.defaultQuality.toString();
            if (qualityValue)
                qualityValue.textContent = settings.defaultQuality.toString();
        }
    }
    function updateUI() {
        if (files.length > 0) {
            previewContainer?.classList.remove("hidden");
            dropZone?.classList.add("hidden");
            renderFileList();
            updateSummary();
        }
        else {
            previewContainer?.classList.add("hidden");
            dropZone?.classList.remove("hidden");
            fileInput.value = "";
        }
    }
    function renderFileList() {
        fileListContainer.innerHTML = "";
        files.forEach((item) => {
            const div = document.createElement("div");
            div.className = "file-item";
            let statusHtml = getStatusText(item);
            if (item.status === "success" && item.optimizedSize) {
                const saved = item.originalSize - item.optimizedSize;
                const percentage = ((saved / item.originalSize) * 100).toFixed(1);
                statusHtml = `<span style="color: var(--success)">-${percentage}% (${formatBytes(saved)})</span>`;
            }
            div.innerHTML = `
        <img src="${URL.createObjectURL(item.file)}" class="file-preview" />
        <div class="file-info" title="${item.file.name}">${item.file.name}</div>
        <div class="file-info" style="font-size: 0.7rem; color: var(--text-secondary)">${formatBytes(item.originalSize)}</div>
        <div class="file-status ${item.status}">
          ${statusHtml}
        </div>
        <button class="remove-file-btn" data-id="${item.id}">×</button>
      `;
            const removeBtn = div.querySelector(".remove-file-btn");
            removeBtn?.addEventListener("click", (e) => {
                e.stopPropagation();
                removeFile(item.id);
            });
            fileListContainer.appendChild(div);
        });
        const hasPending = files.some((f) => f.status === "pending" || f.status === "error");
        const hasSuccess = files.some((f) => f.status === "success");
        if (processBtn)
            processBtn.disabled = !hasPending;
        if (files.length === 1) {
            if (processBtn)
                processBtn.textContent = "Optimize Image";
            if (downloadBtn)
                downloadBtn.textContent = "Download Result";
        }
        else {
            if (processBtn)
                processBtn.textContent = "Optimize Images (All)";
            if (downloadBtn)
                downloadBtn.textContent = "Download All (ZIP)";
        }
        if (hasSuccess) {
            downloadBtn?.classList.remove("hidden");
        }
        else {
            downloadBtn?.classList.add("hidden");
        }
    }
    function getStatusText(item) {
        switch (item.status) {
            case "pending":
                return "Pending";
            case "processing":
                return "Optimizing...";
            case "success":
                return "Done";
            case "error":
                return "Error";
            default:
                return "";
        }
    }
    function removeFile(id) {
        files = files.filter((f) => f.id !== id);
        updateUI();
    }
    function updateSummary() {
        if (batchSummary) {
            const total = files.length;
            const success = files.filter((f) => f.status === "success").length;
            if (total > 0) {
                let savedText = "";
                if (success > 0) {
                    const totalOriginal = files
                        .filter((f) => f.status === "success")
                        .reduce((acc, f) => acc + f.originalSize, 0);
                    const totalOptimized = files
                        .filter((f) => f.status === "success")
                        .reduce((acc, f) => acc + (f.optimizedSize || 0), 0);
                    const totalSaved = totalOriginal - totalOptimized;
                    savedText = ` | Saved ${formatBytes(totalSaved)}`;
                }
                batchSummary.textContent = `${success} / ${total} optimized${savedText}`;
                batchSummary.classList.remove("hidden");
            }
            else {
                batchSummary.classList.add("hidden");
            }
        }
    }
    // Process button
    processBtn?.addEventListener("click", async () => {
        const pendingFiles = files.filter((f) => f.status === "pending" || f.status === "error");
        if (pendingFiles.length === 0)
            return;
        if (processBtn)
            processBtn.disabled = true;
        if (resetBtn)
            resetBtn.disabled = true;
        const quality = parseInt(qualitySlider.value);
        const format = formatSelect.value || undefined;
        const preset = presetSelect.value || "balanced";
        for (const item of pendingFiles) {
            item.status = "processing";
            renderFileList();
            try {
                const arrayBuffer = await item.file.arrayBuffer();
                const buffer = new Uint8Array(arrayBuffer);
                const result = await window.electronAPI.optimizeImage({
                    buffer,
                    format,
                    quality,
                    preset,
                });
                if (result.success && result.buffer) {
                    item.optimizedSize = result.buffer.length;
                    const targetFormat = format || item.file.name.split(".").pop() || "png";
                    const blob = new Blob([result.buffer], {
                        type: `image/${targetFormat === "jpg" ? "jpeg" : targetFormat}`,
                    });
                    item.resultBlob = blob;
                    item.resultFormat = targetFormat;
                    item.status = "success";
                }
                else {
                    throw new Error(result.error || "Optimization failed");
                }
            }
            catch (error) {
                console.error(error);
                item.status = "error";
                item.error = error.message;
            }
            renderFileList();
            updateSummary();
        }
        if (processBtn)
            processBtn.disabled = false;
        if (resetBtn)
            resetBtn.disabled = false;
    });
    // Download button
    downloadBtn?.addEventListener("click", async () => {
        const successFiles = files.filter((f) => f.status === "success" && f.resultBlob);
        if (successFiles.length === 0)
            return;
        if (successFiles.length === 1) {
            const item = successFiles[0];
            const defaultName = `optimized-${item.file.name.split(".")[0]}.${item.resultFormat}`;
            const filePath = await window.electronAPI.selectSavePath(defaultName);
            if (filePath && item.resultBlob) {
                const arrayBuffer = await item.resultBlob.arrayBuffer();
                const buffer = new Uint8Array(arrayBuffer);
                await window.electronAPI.saveFile({ filePath, buffer });
            }
        }
        else {
            const zip = new jszip_1.default();
            const folder = zip.folder("optimized_images");
            successFiles.forEach((item) => {
                if (item.resultBlob) {
                    const name = `optimized-${item.file.name.split(".")[0]}.${item.resultFormat}`;
                    folder?.file(name, item.resultBlob);
                }
            });
            const content = await zip.generateAsync({ type: "blob" });
            const defaultPath = "optimized_images.zip";
            const savePath = await window.electronAPI.selectSavePath(defaultPath);
            if (savePath) {
                const arrayBuffer = await content.arrayBuffer();
                const buffer = new Uint8Array(arrayBuffer);
                await window.electronAPI.saveFile({ filePath: savePath, buffer });
            }
        }
    });
    // Reset button
    resetBtn?.addEventListener("click", () => {
        files = [];
        updateUI();
    });
}
