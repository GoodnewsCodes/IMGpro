"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initColorTools = initColorTools;
function initColorTools() {
    const dropZone = document.getElementById("color-drop-zone");
    const fileInput = document.getElementById("color-file-input");
    const previewContainer = document.getElementById("color-preview-container");
    const canvas = document.getElementById("color-canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const pickedColorSwatch = document.getElementById("picked-color-swatch");
    const pickedColorHex = document.getElementById("picked-color-hex");
    const targetColorInput = document.getElementById("target-color-input");
    const targetColorHex = document.getElementById("target-color-hex");
    const toleranceSlider = document.getElementById("tolerance-slider");
    const toleranceValue = document.getElementById("tolerance-value");
    const replaceBtn = document.getElementById("replace-color-btn");
    const downloadBtn = document.getElementById("color-download-btn");
    const resetBtn = document.getElementById("color-reset-btn");
    if (!dropZone || !fileInput || !canvas || !replaceBtn)
        return;
    const resultPreview = document.getElementById("color-result-preview");
    const resultWrapper = document.getElementById("color-result-wrapper");
    const loadingOverlay = document.getElementById("color-loading-overlay");
    let originalImage = null;
    let pickedColor = { r: 0, g: 0, b: 0 };
    // Sync color input and hex text
    targetColorInput.addEventListener("input", () => {
        targetColorHex.value = targetColorInput.value.toUpperCase();
    });
    targetColorHex.addEventListener("input", () => {
        const val = targetColorHex.value;
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            targetColorInput.value = val;
        }
    });
    toleranceSlider.addEventListener("input", () => {
        if (toleranceValue)
            toleranceValue.textContent = toleranceSlider.value;
    });
    // Upload Logic
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
        // Only remove drag-over class if we're actually leaving the drop zone
        const relatedTarget = e.relatedTarget;
        if (!relatedTarget || !dropZone.contains(relatedTarget)) {
            dropZone.classList.remove("drag-over");
        }
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
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                canvas.width = img.width;
                canvas.height = img.height;
                ctx?.drawImage(img, 0, 0);
                previewContainer?.classList.remove("hidden");
                dropZone?.classList.add("hidden");
            };
            img.src = e.target?.result;
        };
        reader.readAsDataURL(file);
    }
    // Handle drag and drop on canvas to reset and upload new image
    canvas.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        canvas.classList.add("drag-over");
    });
    canvas.addEventListener("dragleave", () => {
        canvas.classList.remove("drag-over");
    });
    canvas.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        canvas.classList.remove("drag-over");
        if (e.dataTransfer?.files.length) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith("image/")) {
                // Reset state
                originalImage = null;
                if (fileInput)
                    fileInput.value = "";
                if (resultPreview)
                    resultPreview.src = "";
                downloadBtn.classList.add("hidden");
                resultWrapper?.classList.add("hidden");
                // Reset picker display
                if (pickedColorSwatch)
                    pickedColorSwatch.style.backgroundColor = "#000000";
                if (pickedColorHex)
                    pickedColorHex.value = "#000000";
                pickedColor = { r: 0, g: 0, b: 0 };
                // Handle new file
                handleFile(file);
            }
        }
    });
    // Color Picking Logic
    canvas.addEventListener("click", (e) => {
        if (!ctx || !originalImage)
            return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        pickedColor = { r: pixel[0], g: pixel[1], b: pixel[2] };
        const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
        if (pickedColorSwatch)
            pickedColorSwatch.style.backgroundColor = hex;
        if (pickedColorHex)
            pickedColorHex.value = hex.toUpperCase();
    });
    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16),
            }
            : null;
    }
    // Color Replacement Logic
    replaceBtn.addEventListener("click", () => {
        if (!ctx || !originalImage)
            return;
        loadingOverlay?.classList.remove("hidden");
        resultWrapper?.classList.remove("hidden");
        replaceBtn.disabled = true;
        // Use setTimeout to allow UI to show loading state
        setTimeout(() => {
            try {
                const targetRgb = hexToRgb(targetColorInput.value);
                if (!targetRgb)
                    return;
                const tolerance = parseInt(toleranceSlider.value);
                // Create a temporary canvas for processing to keep original intact
                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext("2d");
                if (!tempCtx || !originalImage)
                    return;
                const width = tempCanvas.width;
                const height = tempCanvas.height;
                tempCtx.drawImage(originalImage, 0, 0);
                const imageData = tempCtx.getImageData(0, 0, width, height);
                const data = imageData.data;
                // 1. Create a replacement mask
                const mask = new Float32Array(width * height);
                const normalizedTolerance = (tolerance / 100) * 442;
                const feather = 5;
                const lowerBound = Math.max(0, normalizedTolerance - feather);
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const diff = Math.sqrt(Math.pow(r - pickedColor.r, 2) +
                        Math.pow(g - pickedColor.g, 2) +
                        Math.pow(b - pickedColor.b, 2));
                    if (diff <= normalizedTolerance) {
                        let alpha = 1;
                        if (diff > lowerBound) {
                            alpha =
                                1 - (diff - lowerBound) / (normalizedTolerance - lowerBound);
                        }
                        mask[i / 4] = alpha;
                    }
                    else {
                        mask[i / 4] = 0;
                    }
                }
                // 2. Apply spatial smoothing (Box Blur) to the mask
                const smoothedMask = new Float32Array(width * height);
                const radius = 1; // 3x3 box blur
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        let sum = 0;
                        let count = 0;
                        for (let dy = -radius; dy <= radius; dy++) {
                            for (let dx = -radius; dx <= radius; dx++) {
                                const nx = x + dx;
                                const ny = y + dy;
                                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                    sum += mask[ny * width + nx];
                                    count++;
                                }
                            }
                        }
                        smoothedMask[y * width + x] = sum / count;
                    }
                }
                // 3. Apply the smoothed mask to blend colors
                for (let i = 0; i < data.length; i += 4) {
                    const alpha = smoothedMask[i / 4];
                    if (alpha > 0) {
                        data[i] = targetRgb.r * alpha + data[i] * (1 - alpha);
                        data[i + 1] = targetRgb.g * alpha + data[i + 1] * (1 - alpha);
                        data[i + 2] = targetRgb.b * alpha + data[i + 2] * (1 - alpha);
                    }
                }
                tempCtx.putImageData(imageData, 0, 0);
                resultPreview.src = tempCanvas.toDataURL();
                downloadBtn.classList.remove("hidden");
            }
            catch (error) {
                console.error(error);
                alert("An error occurred during color replacement.");
            }
            finally {
                loadingOverlay?.classList.add("hidden");
                replaceBtn.disabled = false;
            }
        }, 50);
    });
    // Download Logic
    downloadBtn.addEventListener("click", async () => {
        if (!resultPreview.src)
            return;
        const savePath = await window.electronAPI.selectSavePath("processed_image.png");
        if (savePath) {
            // Convert data URL to buffer
            const response = await fetch(resultPreview.src);
            const arrayBuffer = await response.arrayBuffer();
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
    // Reset Logic
    resetBtn.addEventListener("click", () => {
        originalImage = null;
        if (fileInput)
            fileInput.value = "";
        if (resultPreview)
            resultPreview.src = "";
        previewContainer?.classList.add("hidden");
        dropZone?.classList.remove("hidden");
        downloadBtn.classList.add("hidden");
        resultWrapper?.classList.add("hidden");
        // Reset picker display
        if (pickedColorSwatch)
            pickedColorSwatch.style.backgroundColor = "#000000";
        if (pickedColorHex)
            pickedColorHex.value = "#000000";
        pickedColor = { r: 0, g: 0, b: 0 };
    });
}
