"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initBgRemoval = initBgRemoval;
const background_removal_1 = require("@imgly/background-removal");
const jszip_1 = __importDefault(require("jszip"));
function initBgRemoval() {
    const fileInput = document.getElementById("file-input");
    const dropZone = document.getElementById("drop-zone");
    const previewContainer = document.getElementById("preview-container");
    const fileListContainer = document.getElementById("file-list");
    const processBtn = document.getElementById("process-btn");
    const downloadBtn = document.getElementById("download-btn");
    const resetBtn = document.getElementById("reset-btn");
    const removeBgApiBtn = document.getElementById("remove-bg-api-btn");
    const removeBgApiHint = document.getElementById("remove-bg-api-hint");
    const batchSummary = document.getElementById("batch-summary");
    // Single Preview Elements
    const bgSinglePreview = document.getElementById("bg-single-preview");
    const bgOriginalPreview = document.getElementById("bg-original-preview");
    const bgResultPreview = document.getElementById("bg-result-preview");
    const bgLoadingOverlay = document.getElementById("bg-loading-overlay");
    const bgPlaceholderText = document.getElementById("bg-placeholder-text");
    let files = [];
    if (!fileInput ||
        !dropZone ||
        !previewContainer ||
        !fileListContainer ||
        !processBtn ||
        !downloadBtn ||
        !resetBtn ||
        !removeBgApiBtn ||
        !removeBgApiHint) {
        console.error("Background removal elements not found");
        return;
    }
    // Handle file selection
    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragenter", (e) => {
        e.preventDefault();
        dropZone.classList.add("active");
    });
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("active");
    });
    dropZone.addEventListener("dragleave", (e) => {
        const relatedTarget = e.relatedTarget;
        if (!relatedTarget || !dropZone.contains(relatedTarget)) {
            dropZone.classList.remove("active");
        }
    });
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("active");
        if (e.dataTransfer?.files.length) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    });
    fileInput.addEventListener("change", () => {
        if (fileInput.files?.length) {
            handleFiles(Array.from(fileInput.files));
        }
    });
    function handleFiles(newFiles) {
        const validTypes = ["image/png", "image/jpeg", "image/webp"];
        const imageFiles = newFiles.filter((file) => validTypes.includes(file.type));
        if (imageFiles.length === 0) {
            alert("Please select image files.");
            return;
        }
        // Add new files to the list
        const newProcessedFiles = imageFiles.map((file) => ({
            file,
            id: Math.random().toString(36).substring(7),
            status: "pending",
        }));
        files = [...files, ...newProcessedFiles];
        updateUI();
    }
    function updateUI() {
        if (files.length > 0) {
            previewContainer.classList.remove("hidden");
            dropZone.classList.add("hidden");
            if (files.length === 1) {
                bgSinglePreview.classList.remove("hidden");
                fileListContainer.classList.add("hidden");
            }
            else {
                bgSinglePreview.classList.add("hidden");
                fileListContainer.classList.remove("hidden");
            }
            renderFileList();
            updateSummary();
        }
        else {
            previewContainer.classList.add("hidden");
            dropZone.classList.remove("hidden");
            fileInput.value = "";
        }
    }
    function renderFileList() {
        fileListContainer.innerHTML = "";
        files.forEach((item) => {
            const div = document.createElement("div");
            div.className = "file-item";
            div.innerHTML = `
        <img src="${URL.createObjectURL(item.file)}" class="file-preview" />
        <div class="file-info" title="${item.file.name}">${item.file.name}</div>
        <div class="file-status ${item.status}">
          ${getStatusText(item)}
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
        // Update single preview if applicable
        if (files.length === 1) {
            const item = files[0];
            bgOriginalPreview.src = URL.createObjectURL(item.file);
            if (item.status === "success" && item.resultBlob) {
                bgResultPreview.src = URL.createObjectURL(item.resultBlob);
                bgResultPreview.classList.remove("hidden");
                bgLoadingOverlay.classList.add("hidden");
                bgPlaceholderText.classList.add("hidden");
            }
            else if (item.status === "processing") {
                bgResultPreview.classList.add("hidden");
                bgLoadingOverlay.classList.remove("hidden");
                bgPlaceholderText.classList.add("hidden");
            }
            else {
                bgResultPreview.classList.add("hidden");
                bgLoadingOverlay.classList.add("hidden");
                bgPlaceholderText.classList.remove("hidden");
                if (item.status === "error") {
                    bgPlaceholderText.textContent =
                        "Error: " + (item.error || "Unknown error");
                }
                else {
                    bgPlaceholderText.textContent =
                        'Click "Remove Background" to see result';
                }
            }
        }
        // Update buttons
        const hasPending = files.some((f) => f.status === "pending" || f.status === "error");
        const hasSuccess = files.some((f) => f.status === "success");
        processBtn.disabled = !hasPending;
        removeBgApiBtn.disabled = !hasPending;
        if (hasSuccess) {
            downloadBtn.classList.remove("hidden");
        }
        else {
            downloadBtn.classList.add("hidden");
        }
    }
    function getStatusText(item) {
        switch (item.status) {
            case "pending":
                return "Pending";
            case "processing":
                return "Processing...";
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
                batchSummary.textContent = `${success} / ${total} processed`;
                batchSummary.classList.remove("hidden");
            }
            else {
                batchSummary.classList.add("hidden");
            }
        }
    }
    // Handle processing
    processBtn.addEventListener("click", async () => {
        await processFiles("local");
    });
    removeBgApiBtn.addEventListener("click", async () => {
        await processFiles("api");
    });
    async function processFiles(mode) {
        const pendingFiles = files.filter((f) => f.status === "pending" || f.status === "error");
        if (pendingFiles.length === 0)
            return;
        processBtn.disabled = true;
        removeBgApiBtn.disabled = true;
        resetBtn.disabled = true;
        // Process sequentially to avoid overwhelming resources
        for (const item of pendingFiles) {
            item.status = "processing";
            renderFileList(); // Update status to processing
            try {
                let blob;
                if (mode === "local") {
                    blob = await (0, background_removal_1.removeBackground)(item.file, {
                        model: "isnet",
                        output: {
                            format: "image/png",
                            type: "foreground",
                        },
                    });
                }
                else {
                    // API mode
                    const arrayBuffer = await item.file.arrayBuffer();
                    const buffer = new Uint8Array(arrayBuffer);
                    const result = await window.electronAPI.removeBgApi(buffer);
                    if (result.success && result.buffer) {
                        blob = new Blob([result.buffer], { type: "image/png" });
                    }
                    else {
                        throw new Error(result.error || "API call failed");
                    }
                }
                item.resultBlob = blob;
                item.status = "success";
            }
            catch (error) {
                console.error(`Error processing ${item.file.name}:`, error);
                item.status = "error";
                item.error = error.message;
            }
            renderFileList(); // Update status to success/error
            updateSummary();
        }
        processBtn.disabled = false;
        removeBgApiBtn.disabled = false;
        resetBtn.disabled = false;
    }
    // Handle download
    downloadBtn.addEventListener("click", async () => {
        const successFiles = files.filter((f) => f.status === "success" && f.resultBlob);
        if (successFiles.length === 0)
            return;
        if (successFiles.length === 1) {
            // Single file download
            const item = successFiles[0];
            const defaultPath = `imgpro_${item.file.name.split(".")[0]}_no_bg.png`;
            const savePath = await window.electronAPI.selectSavePath(defaultPath);
            if (savePath && item.resultBlob) {
                const arrayBuffer = await item.resultBlob.arrayBuffer();
                const buffer = new Uint8Array(arrayBuffer);
                await window.electronAPI.saveFile({ filePath: savePath, buffer });
            }
        }
        else {
            // Batch download (ZIP)
            const zip = new jszip_1.default();
            const folder = zip.folder("removed_backgrounds");
            successFiles.forEach((item) => {
                if (item.resultBlob) {
                    const name = `imgpro_${item.file.name.split(".")[0]}_no_bg.png`;
                    folder?.file(name, item.resultBlob);
                }
            });
            const content = await zip.generateAsync({ type: "blob" });
            const defaultPath = "removed_backgrounds.zip";
            const savePath = await window.electronAPI.selectSavePath(defaultPath);
            if (savePath) {
                const arrayBuffer = await content.arrayBuffer();
                const buffer = new Uint8Array(arrayBuffer);
                await window.electronAPI.saveFile({ filePath: savePath, buffer });
            }
        }
    });
    // Handle reset
    resetBtn.addEventListener("click", () => {
        files = [];
        updateUI();
    });
}
