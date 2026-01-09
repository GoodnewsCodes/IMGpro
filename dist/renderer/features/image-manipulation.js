"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initImageManipulation = initImageManipulation;
function initImageManipulation() {
    // Edit Section Elements
    const editDropZone = document.getElementById("edit-drop-zone");
    const editFileInput = document.getElementById("edit-file-input");
    const editPreviewContainer = document.getElementById("edit-preview-container");
    const editCanvas = document.getElementById("edit-canvas");
    const editResultPreview = document.getElementById("edit-result-preview");
    const editResultWrapper = document.getElementById("edit-result-wrapper");
    const editLoadingOverlay = document.getElementById("edit-loading-overlay");
    const rotateLeftBtn = document.getElementById("rotate-left-btn");
    const rotateRightBtn = document.getElementById("rotate-right-btn");
    const flipHBtn = document.getElementById("flip-h-btn");
    const flipVBtn = document.getElementById("flip-v-btn");
    const resetCropBtn = document.getElementById("reset-crop-btn");
    const applyEditBtn = document.getElementById("apply-edit-btn");
    const editDownloadBtn = document.getElementById("edit-download-btn");
    const editResetBtn = document.getElementById("edit-reset-btn");
    // Mirror Controls (now in Edit Section)
    const mirrorTypeSelect = document.getElementById("mirror-type");
    const applyMirrorBtn = document.getElementById("apply-mirror-btn");
    // Tab Logic
    const editTabs = document.querySelectorAll(".edit-tab");
    const editContents = document.querySelectorAll(".edit-tab-content");
    editTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            // Remove active class from all tabs
            editTabs.forEach((t) => t.classList.remove("active"));
            // Add active class to clicked tab
            tab.classList.add("active");
            // Hide all contents
            editContents.forEach((c) => c.classList.add("hidden"));
            // Show target content
            const targetId = tab.getAttribute("data-edit-tab");
            const targetContent = document.getElementById(`edit-content-${targetId}`);
            if (targetContent) {
                targetContent.classList.remove("hidden");
            }
        });
    });
    if (!editDropZone || !editFileInput || !editCanvas || !applyEditBtn)
        return;
    let currentFile = null;
    let originalImage = null;
    let editBuffer = null;
    // Crop State
    let isCropping = false;
    let cropStart = { x: 0, y: 0 };
    let cropEnd = { x: 0, y: 0 };
    let cropRect = { left: 0, top: 0, width: 0, height: 0 };
    let rotation = 0;
    let flipH = false;
    let flipV = false;
    // --- Edit Section Logic ---
    editDropZone?.addEventListener("click", () => editFileInput.click());
    editDropZone?.addEventListener("dragover", (e) => {
        e.preventDefault();
        editDropZone.classList.add("drag-over");
    });
    editDropZone?.addEventListener("dragleave", () => editDropZone.classList.remove("drag-over"));
    editDropZone?.addEventListener("drop", (e) => {
        e.preventDefault();
        editDropZone.classList.remove("drag-over");
        if (e.dataTransfer?.files.length)
            handleEditFile(e.dataTransfer.files[0]);
    });
    editFileInput.addEventListener("change", () => {
        if (editFileInput.files?.length)
            handleEditFile(editFileInput.files[0]);
    });
    function handleEditFile(file) {
        if (!file.type.startsWith("image/"))
            return;
        currentFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                resetEditState();
                renderEditCanvas();
                editPreviewContainer?.classList.remove("hidden");
                editDropZone?.classList.add("hidden");
            };
            img.src = e.target?.result;
        };
        reader.readAsDataURL(file);
    }
    function resetEditState() {
        rotation = 0;
        flipH = false;
        flipV = false;
        cropRect = { left: 0, top: 0, width: 0, height: 0 };
        isCropping = false;
        editResultWrapper?.classList.add("hidden");
        editDownloadBtn.classList.add("hidden");
    }
    function renderEditCanvas() {
        if (!originalImage || !editCanvas)
            return;
        const ctx = editCanvas.getContext("2d");
        if (!ctx)
            return;
        // Set canvas size based on rotation
        const isVertical = (rotation / 90) % 2 !== 0;
        const displayWidth = isVertical
            ? originalImage.height
            : originalImage.width;
        const displayHeight = isVertical
            ? originalImage.width
            : originalImage.height;
        // Scale down for display if too large
        const maxDisplay = 800;
        let scale = 1;
        if (displayWidth > maxDisplay || displayHeight > maxDisplay) {
            scale = Math.min(maxDisplay / displayWidth, maxDisplay / displayHeight);
        }
        editCanvas.width = displayWidth * scale;
        editCanvas.height = displayHeight * scale;
        ctx.save();
        ctx.translate(editCanvas.width / 2, editCanvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        const drawW = originalImage.width * scale;
        const drawH = originalImage.height * scale;
        ctx.drawImage(originalImage, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        // Draw crop rectangle if exists
        if (cropRect.width > 0 && cropRect.height > 0) {
            ctx.strokeStyle = "var(--accent)";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(cropRect.left, cropRect.top, cropRect.width, cropRect.height);
            // Overlay
            ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
            // Top
            ctx.fillRect(0, 0, editCanvas.width, cropRect.top);
            // Bottom
            ctx.fillRect(0, cropRect.top + cropRect.height, editCanvas.width, editCanvas.height - (cropRect.top + cropRect.height));
            // Left
            ctx.fillRect(0, cropRect.top, cropRect.left, cropRect.height);
            // Right
            ctx.fillRect(cropRect.left + cropRect.width, cropRect.top, editCanvas.width - (cropRect.left + cropRect.width), cropRect.height);
        }
    }
    // Rotation & Flip
    rotateLeftBtn?.addEventListener("click", () => {
        rotation = (rotation - 90) % 360;
        cropRect = { left: 0, top: 0, width: 0, height: 0 };
        renderEditCanvas();
    });
    rotateRightBtn?.addEventListener("click", () => {
        rotation = (rotation + 90) % 360;
        cropRect = { left: 0, top: 0, width: 0, height: 0 };
        renderEditCanvas();
    });
    flipHBtn?.addEventListener("click", () => {
        flipH = !flipH;
        renderEditCanvas();
    });
    flipVBtn?.addEventListener("click", () => {
        flipV = !flipV;
        renderEditCanvas();
    });
    resetCropBtn?.addEventListener("click", () => {
        cropRect = { left: 0, top: 0, width: 0, height: 0 };
        renderEditCanvas();
    });
    // Mouse events for cropping
    editCanvas.addEventListener("mousedown", (e) => {
        if (!originalImage)
            return;
        const rect = editCanvas.getBoundingClientRect();
        cropStart.x = e.clientX - rect.left;
        cropStart.y = e.clientY - rect.top;
        isCropping = true;
    });
    window.addEventListener("mousemove", (e) => {
        if (!isCropping || !editCanvas)
            return;
        const rect = editCanvas.getBoundingClientRect();
        cropEnd.x = Math.max(0, Math.min(e.clientX - rect.left, editCanvas.width));
        cropEnd.y = Math.max(0, Math.min(e.clientY - rect.top, editCanvas.height));
        cropRect = {
            left: Math.min(cropStart.x, cropEnd.x),
            top: Math.min(cropStart.y, cropEnd.y),
            width: Math.abs(cropStart.x - cropEnd.x),
            height: Math.abs(cropStart.y - cropEnd.y),
        };
        renderEditCanvas();
    });
    window.addEventListener("mouseup", () => {
        isCropping = false;
    });
    applyEditBtn.addEventListener("click", async () => {
        if (!currentFile || !originalImage)
            return;
        editLoadingOverlay?.classList.remove("hidden");
        editResultWrapper?.classList.remove("hidden");
        applyEditBtn.disabled = true;
        try {
            const arrayBuffer = await currentFile.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);
            let crop = undefined;
            if (cropRect.width > 0 && cropRect.height > 0) {
                const isVertical = (rotation / 90) % 2 !== 0;
                const actualW = isVertical ? originalImage.height : originalImage.width;
                const actualH = isVertical ? originalImage.width : originalImage.height;
                const sX = actualW / editCanvas.width;
                const sY = actualH / editCanvas.height;
                crop = {
                    left: cropRect.left * sX,
                    top: cropRect.top * sY,
                    width: cropRect.width * sX,
                    height: cropRect.height * sY,
                };
            }
            const result = await window.electronAPI.manipulateImage({
                buffer,
                rotate: rotation !== 0 ? rotation : undefined,
                flip: flipV,
                flop: flipH,
                crop,
            });
            if (result.success && result.buffer) {
                editBuffer = result.buffer;
                const blob = new Blob([result.buffer], {
                    type: currentFile.type,
                });
                editResultPreview.src = URL.createObjectURL(blob);
                editDownloadBtn.classList.remove("hidden");
            }
            else {
                alert("Edit failed: " + result.error);
            }
        }
        catch (e) {
            console.error(e);
            alert("An error occurred.");
        }
        finally {
            editLoadingOverlay?.classList.add("hidden");
            applyEditBtn.disabled = false;
        }
    });
    applyMirrorBtn.addEventListener("click", async () => {
        if (!currentFile)
            return;
        editLoadingOverlay?.classList.remove("hidden");
        editResultWrapper?.classList.remove("hidden");
        applyMirrorBtn.disabled = true;
        try {
            const arrayBuffer = await currentFile.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);
            const type = mirrorTypeSelect.value;
            const result = await window.electronAPI.mirrorImage({ buffer, type });
            if (result.success && result.buffer) {
                editBuffer = result.buffer;
                const blob = new Blob([result.buffer], {
                    type: currentFile.type,
                });
                editResultPreview.src = URL.createObjectURL(blob);
                editDownloadBtn.classList.remove("hidden");
            }
            else {
                alert("Mirror failed: " + result.error);
            }
        }
        catch (e) {
            console.error(e);
            alert("An error occurred.");
        }
        finally {
            editLoadingOverlay?.classList.add("hidden");
            applyMirrorBtn.disabled = false;
        }
    });
    editDownloadBtn.addEventListener("click", async () => {
        if (!editBuffer || !currentFile)
            return;
        const ext = currentFile.name.split(".").pop() || "png";
        const savePath = await window.electronAPI.selectSavePath(`edited_${currentFile.name}`);
        if (savePath) {
            const result = await window.electronAPI.saveFile({
                filePath: savePath,
                buffer: editBuffer,
            });
            if (!result.success) {
                alert("Failed to save file: " + result.error);
            }
        }
    });
    editResetBtn.addEventListener("click", () => {
        if (currentFile)
            handleEditFile(currentFile);
    });
}
